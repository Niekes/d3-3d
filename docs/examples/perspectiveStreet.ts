import { easeCubicInOut, pointer, rgb, select, timer } from 'd3';
import type { Selection, Timer } from 'd3';
import {
    box,
    camera3D,
    cubes3D,
    normal,
    perspective,
    planes3D,
    points3D,
    projectPositions,
    sort
} from '../../index';
import type {
    Camera3DInstance,
    Cube,
    CubeFace,
    CubeFaceName,
    Cubes3DInstance,
    Planes3DInstance,
    Point3D
} from '../../index';
import { HEIGHT, WIDTH, attribute, linkProgram } from './canvasFigure';
import { joinFaces } from './cubeFaces';
import { dragRotate } from './rotatingFigure';
import './perspectiveStreet.css';

/*
 * A street of sixteen houses seen through `.perspective()`, drawn three
 * ways from one camera: as SVG paths, on a 2D canvas through `.matrix()`
 * and `projectPositions`, and with WebGL and a depth buffer. A slider and a
 * dolly zoom move the eye, the pointer casts a ray from it onto the street,
 * and a toggle hides the faces by their winding or by the orthographic test
 * against the view direction.
 */

const SCALE = 44;
/** The scene fits in a ball of this radius around the rotation center. */
const RADIUS = 10;
/** The nearest eye: farther from the center than the scene reaches. */
const NEAR = 12;
/** The right end of the slider, which stands for an eye infinitely far away. */
const FAR = 80;
const START = 20;
/** The street leans towards the reader by this angle, in radians. */
const TILT = -0.22;
/** Straight down the street: one vanishing point. */
const YAW = 0;
/** The length of a dolly zoom, in milliseconds. */
const DOLLY = 2400;

type HouseVertex = Point3D & { house: number };
type House = Cube<HouseVertex> & { centroid: Point3D };
type Cull = 'ccw' | 'viewDirection';
type Renderer = 'svg' | 'canvas' | 'webgl';
type Paint = 'sidewalk' | 'street' | 'street-alt' | 'roof' | 'wall-x' | 'wall-z';
type Palette = Record<Paint, string>;

/** What a renderer needs for a frame. */
type View = { camera: Camera3DInstance; cull: Cull; houses: House[]; paint: Palette };
type Draw = (view: View) => void;

const PAINTS: Paint[] = ['sidewalk', 'street', 'street-alt', 'roof', 'wall-x', 'wall-z'];

/** The heights of the houses, in model units, two by two from the far end. */
const HEIGHTS = [3, 1.5, 2.5, 4, 2, 3.5, 1.5, 3, 2, 4, 1.5, 3, 2.5, 1.5, 3.5, 2];

/**
 * Two rows of eight houses, numbered like a European street: the odd ones
 * on the left, the even ones on the right. Every corner knows its house.
 */
const HOUSES: HouseVertex[][] = HEIGHTS.map((height, h) =>
    box({
        x: h % 2 === 0 ? -2 : 2,
        y: 0,
        z: 2 * Math.floor(h / 2) - 7,
        width: 1.6,
        depth: 1.6,
        height
    }).map((corner) => ({ ...corner, house: h }))
);

/** A rectangle of the floor y = 0, wound like the faces of `cubes3D`. */
function quad(x0: number, x1: number, z0: number, z1: number): Point3D[] {
    return [
        { x: x0, y: 0, z: z1 },
        { x: x1, y: 0, z: z1 },
        { x: x1, y: 0, z: z0 },
        { x: x0, y: 0, z: z0 }
    ];
}

/** The two lanes of the street, in tiles of one unit. */
const TILES = Array.from({ length: 34 }, (_, t) =>
    quad((t % 2) - 1, t % 2, Math.floor(t / 2) - 8.5, Math.floor(t / 2) - 7.5)
);
/** The floor: the two sidewalks, then the tiles of the street. */
const FLOOR = [quad(-3.5, -1, -8.5, 8.5), quad(1, 3.5, -8.5, 8.5), ...TILES];

/** The paint of floor quad `q`: the sidewalks, then a checkerboard. */
function floorPaint(q: number): Paint {
    if (q < 2) {
        return 'sidewalk';
    }
    const t = q - 2;
    return (Math.floor(t / 2) + t) % 2 === 0 ? 'street' : 'street-alt';
}

/**
 * The faces of a house as `cubes3D` builds them from the corners of `box`:
 * the corners, wound counter-clockwise from outside, and the outward
 * normal.
 */
const FACES: { name: CubeFaceName; corners: number[]; normal: Point3D }[] = [
    { name: 'front', corners: [0, 1, 2, 3], normal: { x: 0, y: 0, z: 1 } },
    { name: 'back', corners: [7, 6, 5, 4], normal: { x: 0, y: 0, z: -1 } },
    { name: 'left', corners: [4, 5, 1, 0], normal: { x: -1, y: 0, z: 0 } },
    { name: 'right', corners: [3, 2, 6, 7], normal: { x: 1, y: 0, z: 0 } },
    { name: 'top', corners: [4, 0, 3, 7], normal: { x: 0, y: -1, z: 0 } },
    { name: 'bottom', corners: [1, 5, 6, 2], normal: { x: 0, y: 1, z: 0 } }
];
const PAINT: Record<CubeFaceName, Paint> = {
    front: 'wall-z',
    back: 'wall-z',
    left: 'wall-x',
    right: 'wall-x',
    top: 'roof',
    bottom: 'roof'
};

/** Every corner of the scene in one buffer: the floor, then the houses. */
const CORNERS = [...FLOOR.flat(), ...HOUSES.flat()];
const POSITIONS = new Float32Array(CORNERS.flatMap((p) => [p.x, p.y, p.z]));
/** The index of the first corner of the houses in `CORNERS`. */
const HOUSE_AT = 4 * FLOOR.length;

const ORIGIN = { x: 0, y: 0, z: 0 };
const UP = { x: 0, y: 1, z: 0 };

const dot = (a: Point3D, b: Point3D) => a.x * b.x + a.y * b.y + a.z * b.z;

/** How much larger than at the rotation center a rotated depth is drawn. */
const growth = (camera: Camera3DInstance, z: number) =>
    1 / (1 - (z - camera.rotationCenter().z) / camera.perspective());

/**
 * Whether a face shows: by its winding on the screen, which holds in
 * perspective, or by the orthographic test against the view direction.
 */
function shows(face: CubeFace<HouseVertex>, cull: Cull, v: Point3D): boolean {
    return cull === 'ccw' ? face.ccw : dot(normal(face), v) > 0;
}

/** The houses as `cubes3D` projects them, each sorting by its footprint. */
function project(cubes: Cubes3DInstance<HouseVertex>): House[] {
    return cubes.data(HOUSES).map((cube) =>
        Object.assign(cube, {
            centroid: cube.faces!.find((face) => face.face === 'bottom')!.centroid
        })
    );
}

/** SVG: the floor, then one group per house, painted back to front by `sort`. */
function svgRenderer(
    svg: Selection<SVGSVGElement, unknown, null, undefined>,
    floor: Planes3DInstance,
    cubes: Cubes3DInstance<HouseVertex>
): Draw {
    const floorGroup = svg.append('g');
    const houseGroup = svg.append('g');

    return ({ camera, cull, houses }) => {
        floorGroup
            .selectAll('path')
            .data(floor.data(FLOOR))
            .join('path')
            .attr('class', (_, q) => `paint-${floorPaint(q)}`)
            .attr('d', (plane) => floor.draw(plane));

        const v = camera.viewDirection();
        const groups = houseGroup
            .selectAll<SVGGElement, House>('g.house')
            .data(houses, (d) => d[0].house)
            .join((enter) => {
                const g = enter.append('g').attr('class', 'house');
                g.append('g');
                g.append('text');
                return g;
            })
            .sort(sort);

        joinFaces(
            groups
                .select('g')
                .selectAll<SVGPathElement, CubeFace<HouseVertex>>('path')
                .data(
                    (d) => d.faces!,
                    (d) => d.face
                ),
            cubes.draw,
            (face) => shows(face, cull, v)
        );

        // The number sits on the roof: `perspective` projects the rotated
        // centroid, and the text grows with the roof.
        const view = {
            origin: camera.origin(),
            scale: camera.scale(),
            rotateCenter: camera.rotationCenter(),
            distance: camera.perspective()
        };
        groups.select('text').each(function (d) {
            const roof = d.faces!.find((face) => face.face === 'top')!;
            const at = perspective(roof.centroid, view);
            select(this)
                .attr('x', at.x)
                .attr('y', at.y)
                .attr('font-size', 13 * growth(camera, roof.centroid.z))
                .attr('visibility', shows(roof, cull, v) ? null : 'hidden')
                .text(d[0].house + 1);
        });
    };
}

/** The winding of the corners on the screen, as `ccw` sums it. */
function winding(screen: Float32Array, corners: number[]): number {
    let sum = 0;
    corners.forEach((c, i) => {
        const n = corners[(i + 1) % corners.length];
        sum += (screen[3 * n] - screen[3 * c]) * (screen[3 * n + 1] + screen[3 * c + 1]);
    });
    return sum;
}

/** Canvas 2D: every corner through `projectPositions`, the houses back to front. */
function canvasRenderer(canvas: HTMLCanvasElement, dpr: number): Draw {
    const context = canvas.getContext('2d')!;
    const screen = new Float32Array(POSITIONS.length);
    context.scale(dpr, dpr);

    const fill = (corners: number[], style: string) => {
        context.beginPath();
        for (const c of corners) {
            context.lineTo(screen[3 * c], screen[3 * c + 1]);
        }
        context.fillStyle = style;
        context.fill();
    };
    // The depth of a footprint, the bottom face that `sort` reads in SVG.
    const depth = (h: number) =>
        [1, 2, 5, 6].reduce((sum, c) => sum + screen[3 * (HOUSE_AT + 8 * h + c) + 2], 0);

    return ({ camera, cull, paint }) => {
        projectPositions(POSITIONS, camera.matrix(), screen);
        context.clearRect(0, 0, WIDTH, HEIGHT);

        FLOOR.forEach((_, q) =>
            fill(
                [0, 1, 2, 3].map((c) => 4 * q + c),
                paint[floorPaint(q)]
            )
        );

        const v = camera.viewDirection();
        const order = HOUSES.map((_, h) => h).sort((a, b) => depth(a) - depth(b));
        for (const h of order) {
            for (const face of FACES) {
                const corners = face.corners.map((c) => HOUSE_AT + 8 * h + c);
                const visible =
                    cull === 'ccw' ? winding(screen, corners) > 0 : dot(face.normal, v) > 0;
                if (visible) {
                    fill(corners, paint[PAINT[face.name]]);
                }
            }
        }
    };
}

const VERTEX_SHADER = `#version 300 es
uniform mat4 u_matrix;
in vec3 a_position;
in vec3 a_color;
out vec3 v_color;

void main() {
    gl_Position = u_matrix * vec4(a_position, 1.0);
    v_color = a_color;
}`;

const FRAGMENT_SHADER = `#version 300 es
precision mediump float;
in vec3 v_color;
out vec4 color;

void main() {
    color = vec4(v_color, 1.0);
}`;

/**
 * The scene as triangles, two per quad, and the paint of every vertex. The
 * bottoms of the houses lie on the floor and are left out.
 */
function triangles(): { positions: Float32Array<ArrayBuffer>; paints: Paint[] } {
    const quads: [number[], Paint][] = [
        ...FLOOR.map((_, q): [number[], Paint] => [
            [0, 1, 2, 3].map((c) => 4 * q + c),
            floorPaint(q)
        ]),
        ...HOUSES.flatMap((_, h) =>
            FACES.filter((face) => face.name !== 'bottom').map((face): [number[], Paint] => [
                face.corners.map((c) => HOUSE_AT + 8 * h + c),
                PAINT[face.name]
            ])
        )
    ];
    const vertices = quads.flatMap(([corners, paint]) =>
        [0, 1, 2, 0, 2, 3].map((k) => ({ corner: CORNERS[corners[k]], paint }))
    );

    return {
        positions: new Float32Array(vertices.flatMap(({ corner: p }) => [p.x, p.y, p.z])),
        paints: vertices.map((vertex) => vertex.paint)
    };
}

/** WebGL: the matrix in clip space, and the depth buffer decides per pixel. */
function webglRenderer(gl: WebGL2RenderingContext): Draw {
    const program = linkProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
    const { positions, paints } = triangles();
    attribute(gl, program, 'a_position', 3, gl.FLOAT)(positions);
    const setColors = attribute(gl, program, 'a_color', 3, gl.UNSIGNED_BYTE, { normalized: true });
    const matrixLocation = gl.getUniformLocation(program, 'u_matrix');
    let painted: Palette | undefined;

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.enable(gl.DEPTH_TEST);

    return ({ camera, paint }) => {
        if (paint !== painted) {
            painted = paint;
            setColors(
                new Uint8Array(
                    paints.flatMap((p) => {
                        const { r, g, b } = rgb(paint[p]);
                        return [r, g, b];
                    })
                )
            );
        }

        // The scene lies within RADIUS of the center, and the eye farther away.
        gl.uniformMatrix4fv(
            matrixLocation,
            false,
            camera.matrix({ width: WIDTH, height: HEIGHT, depth: RADIUS })
        );
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, positions.length / 3);
    };
}

/** The colors of the scene, from the custom properties of the theme. */
function readPalette(host: HTMLElement): Palette {
    const style = getComputedStyle(host);
    return Object.fromEntries(
        PAINTS.map((paint) => [paint, style.getPropertyValue(`--ps-${paint}`).trim()])
    ) as Palette;
}

const theme = () => (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
const fixed = (value: number) => value.toFixed(1).replace('-', '−');

/** The tile of the street under a floor point, or null off the street. */
function tileAt(point: Point3D): Point3D[] | null {
    const column = Math.floor(point.x + 1);
    const row = Math.floor(point.z + 8.5);
    return column >= 0 && column < 2 && row >= 0 && row < 17 ? TILES[2 * row + column] : null;
}

/** What the pointer finds on the floor, in words. */
function describeHit(hit: Point3D | null, camera: Camera3DInstance): string {
    if (!hit) {
        return camera.perspective() === Infinity
            ? 'The floor is seen edge-on: the ray runs along it.'
            : 'Above the horizon: the ray from the eye meets the floor only behind the eye, so unproject returns null.';
    }
    const where = `x ${fixed(hit.x)}, z ${fixed(hit.z)}`;
    return tileAt(hit)
        ? `The ray from the eye meets the street at ${where}.`
        : `The ray meets the floor at ${where}, off the street.`;
}

/** Where the eye is, in words. */
function describeEye(camera: Camera3DInstance): string {
    const d = camera.perspective();
    if (d === Infinity) {
        return 'Orthographic: the eye is infinitely far away, and every ray runs along the view direction.';
    }
    const c = camera.rotationCenter();
    const v = camera.viewDirection();
    const eye = `(${fixed(c.x + d * v.x)}, ${fixed(c.y + d * v.y)}, ${fixed(c.z + d * v.z)})`;
    return `The eye sits ${fixed(d)} units in front of the rotation center, at ${eye}.`;
}

/** How the two face tests differ, in words. */
function describeFaces(houses: House[], camera: Camera3DInstance, renderer: Renderer): string {
    if (renderer === 'webgl') {
        return 'WebGL draws every face, and the depth buffer decides at every pixel.';
    }
    const v = camera.viewDirection();
    const faces = houses.flatMap((house) => house.faces!);
    const hidden = faces.filter((face) => face.ccw && !shows(face, 'viewDirection', v)).length;
    const extra = faces.filter((face) => !face.ccw && shows(face, 'viewDirection', v)).length;
    return `Against the view direction, ${hidden} faces the eye sees would be hidden and ${extra} that turn away would be drawn.`;
}

/**
 * Renders the street into `host` and returns the function that removes it.
 */
export function mountPerspectiveStreet(host: HTMLElement): () => void {
    host.classList.add('perspective-street');
    host.innerHTML = `
        <div class="ps-stage">
            <svg data-renderer="svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img"
                aria-label="A street of sixteen houses in perspective, drawn as SVG paths"></svg>
            <canvas data-renderer="canvas" role="img" hidden
                aria-label="The street drawn on a 2D canvas"></canvas>
            <canvas data-renderer="webgl" role="img" hidden
                aria-label="The street drawn with WebGL"></canvas>
            <svg class="ps-overlay" viewBox="0 0 ${WIDTH} ${HEIGHT}" aria-hidden="true">
                <path class="ps-tile"></path>
                <circle class="ps-hit"></circle>
            </svg>
        </div>
        <form class="ps-controls">
            <fieldset>
                <legend>renderer</legend>
                <label><input type="radio" name="renderer" value="svg" checked> SVG</label>
                <label><input type="radio" name="renderer" value="canvas"> canvas 2D</label>
                <label><input type="radio" name="renderer" value="webgl"> WebGL</label>
            </fieldset>
            <label>perspective
                <input name="distance" type="range" min="${NEAR}" max="${FAR}" step="0.5" value="${START}">
                <output></output>
            </label>
            <button type="button">dolly in</button>
            <fieldset class="ps-cull">
                <legend>hide faces by</legend>
                <label><input type="radio" name="cull" value="ccw" checked> ccw</label>
                <label><input type="radio" name="cull" value="viewDirection"> viewDirection</label>
            </fieldset>
        </form>
        <div class="ps-readout">
            <p class="ps-eye"></p>
            <p class="ps-faces"></p>
            <p class="ps-pointer" aria-live="polite">Point at the street.</p>
        </div>`;

    const stage = select(host).select<HTMLDivElement>('.ps-stage');
    const overlay = stage.select<SVGSVGElement>('.ps-overlay');
    const form = host.querySelector('form')!;
    const slider = form.elements.namedItem('distance') as HTMLInputElement;
    const output = slider.nextElementSibling as HTMLOutputElement;
    const button = form.querySelector('button')!;
    const line = (name: string) => host.querySelector(`.ps-${name}`)!;
    const dpr = window.devicePixelRatio || 1;

    const camera = camera3D()
        .scale(SCALE)
        .origin({ x: WIDTH / 2, y: HEIGHT / 2 + 40 })
        .perspective(START);
    const floor = planes3D().camera(camera);
    const cubes = cubes3D<HouseVertex>().camera(camera);
    const marker = points3D().camera(camera);

    const canvases = stage.selectAll<HTMLCanvasElement, unknown>('canvas');
    canvases.attr('width', Math.round(WIDTH * dpr)).attr('height', Math.round(HEIGHT * dpr));
    const canvas = (renderer: Renderer) => canvases.filter(`[data-renderer="${renderer}"]`).node()!;
    const gl = canvas('webgl').getContext('webgl2');

    const draw: Record<Renderer, Draw | undefined> = {
        svg: svgRenderer(stage.select('[data-renderer="svg"]'), floor, cubes),
        canvas: canvasRenderer(canvas('canvas'), dpr),
        webgl: gl ? webglRenderer(gl) : undefined
    };
    if (!gl) {
        (form.querySelector('[value="webgl"]') as HTMLInputElement).disabled = true;
    }

    let renderer: Renderer = 'svg';
    let cull: Cull = 'ccw';
    let yaw = 0;
    let pitch = 0;
    let hover: [number, number] | null = null;
    let key = '';
    let paint = readPalette(host);
    let dolly: Timer | undefined;

    /** The point of the floor under the pointer and its tile, drawn over every renderer. */
    function drawOverlay(): void {
        const hit = hover && camera.unproject({ x: hover[0], y: hover[1] }, ORIGIN, UP);
        const tile = hit && tileAt(hit);
        overlay.select('.ps-tile').attr('d', tile ? floor.draw(floor.data([tile])[0]) : null);

        // The dot shrinks with the distance, as `perspective` scales a point.
        const [mark] = hit ? marker.data([hit]) : [];
        overlay
            .select('.ps-hit')
            .attr('visibility', mark ? null : 'hidden')
            .attr('cx', mark?.projected.x ?? 0)
            .attr('cy', mark?.projected.y ?? 0)
            .attr('r', mark ? 5 * growth(camera, mark.rotated.z) : 0);

        if (hover) {
            line('pointer').textContent = describeHit(hit, camera);
        }
    }

    function render(): void {
        camera.rotateY(YAW + yaw).rotateX(Math.max(-1.45, Math.min(-0.05, TILT + pitch)));
        if (key !== theme()) {
            key = theme();
            paint = readPalette(host);
        }

        const houses = project(cubes);
        draw[renderer]!({ camera, cull, houses, paint });
        drawOverlay();

        const d = camera.perspective();
        output.textContent = d === Infinity ? '∞' : fixed(d);
        button.textContent = d >= 2 * NEAR ? 'dolly in' : 'dolly out';
        line('eye').textContent = describeEye(camera);
        line('faces').textContent = describeFaces(houses, camera, renderer);
    }

    function setDistance(d: number): void {
        camera.perspective(d);
        slider.value = String(Math.min(d, FAR));
        render();
    }

    /**
     * Moves the eye to the other end, evenly in 1 / distance. The scale
     * holds in the plane of the rotation center, so the middle of the
     * street keeps its size while the ends grow and shrink.
     */
    function dollyZoom(): void {
        dolly?.stop();
        const from = 1 / camera.perspective();
        const to = camera.perspective() >= 2 * NEAR ? 1 / NEAR : 0;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setDistance(1 / to);
            return;
        }
        dolly = timer((elapsed) => {
            const t = Math.min(1, elapsed / DOLLY);
            setDistance(1 / (from + (to - from) * easeCubicInOut(t)));
            if (t === 1) {
                dolly?.stop();
            }
        });
    }

    form.addEventListener('input', (event) => {
        if (event.target === slider) {
            dolly?.stop();
            setDistance(slider.valueAsNumber === FAR ? Infinity : slider.valueAsNumber);
        }
    });
    form.addEventListener('change', () => {
        const data = new FormData(form);
        renderer = data.get('renderer') as Renderer;
        cull = data.get('cull') as Cull;
        canvases.property('hidden', function () {
            return this.dataset.renderer !== renderer;
        });
        stage.select('[data-renderer="svg"]').property('hidden', renderer !== 'svg');
        form.querySelector<HTMLFieldSetElement>('.ps-cull')!.disabled = renderer === 'webgl';
        render();
    });
    button.addEventListener('click', dollyZoom);

    overlay
        .call(
            dragRotate((y, p) => {
                yaw = y;
                pitch = p;
                render();
            })
        )
        .on('pointermove', (event: PointerEvent) => {
            hover = pointer(event, overlay.node());
            drawOverlay();
        })
        .on('pointerleave', () => {
            hover = null;
            line('pointer').textContent = 'Point at the street.';
            drawOverlay();
        });

    // The canvas and WebGL colors follow the theme switch.
    const observer = new MutationObserver(render);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    render();

    return () => {
        dolly?.stop();
        observer.disconnect();
        gl?.getExtension('WEBGL_lose_context')?.loseContext();
        host.classList.remove('perspective-street');
        host.innerHTML = '';
    };
}
