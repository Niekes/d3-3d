import { easeCubicInOut, select, timer } from 'd3';
import type { Timer } from 'd3';
import { box, camera3D, cubes3D, normal, perspective, planes3D, sort } from '../../index';
import type { Camera3DInstance, Cube, CubeFace, Point3D } from '../../index';
import { joinFaces } from './cubeFaces';
import { dragRotate, turnCamera } from './rotatingFigure';
import './perspectiveStreet.css';

/*
 * A street of sixteen houses seen through `.perspective()`, drawn as SVG
 * paths. A slider and a dolly zoom move the eye, and a toggle hides the
 * faces by their winding or by the orthographic test against the view
 * direction.
 */

const WIDTH = 960;
const HEIGHT = 500;
const SCALE = 44;
/** The nearest eye: farther from the center than the scene reaches, 10 units. */
const NEAR = 12;
/** The right end of the slider, which stands for an eye infinitely far away. */
const FAR = 80;
const START = 20;
/** The camera looks down on the street from this angle above the floor, in radians. */
const TILT = 0.22;
/** The length of a dolly zoom, in milliseconds. */
const DOLLY = 2400;

type HouseVertex = Point3D & { house: number };
type House = Cube<HouseVertex>;
type Cull = 'ccw' | 'viewDirection';

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

/** A rectangle of the floor y = 0. */
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

/** The class of floor quad `q`: the sidewalks, then a checkerboard. */
function floorClass(q: number): string {
    if (q < 2) {
        return 'sidewalk';
    }
    const t = q - 2;
    return (Math.floor(t / 2) + t) % 2 === 0 ? 'street' : 'street-alt';
}

const fixed = (value: number) => value.toFixed(1).replace('-', '−');

/** How much larger than at the rotation center a rotated depth is drawn. */
const growth = (camera: Camera3DInstance, z: number) =>
    1 / (1 - (z - camera.rotationCenter().z) / camera.perspective());

/**
 * Whether a face shows: by its winding on the screen, which holds in
 * perspective, or by the orthographic test against the view direction.
 */
function shows(face: CubeFace<HouseVertex>, cull: Cull, v: Point3D): boolean {
    if (cull === 'ccw') {
        return face.ccw;
    }
    const n = normal(face);
    return n.x * v.x + n.y * v.y + n.z * v.z > 0;
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
function describeFaces(houses: House[], camera: Camera3DInstance): string {
    const v = camera.viewDirection();
    const faces = houses.flatMap((house) => house.faces);
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
        <svg viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img"
            aria-label="A street of sixteen houses in perspective"></svg>
        <form class="ps-controls">
            <label>perspective
                <input name="distance" type="range" min="${NEAR}" max="${FAR}" step="0.5" value="${START}">
                <output></output>
            </label>
            <button type="button">dolly in</button>
            <fieldset>
                <legend>hide faces by</legend>
                <label><input type="radio" name="cull" value="ccw" checked> ccw</label>
                <label><input type="radio" name="cull" value="viewDirection"> viewDirection</label>
            </fieldset>
        </form>
        <div class="ps-readout">
            <p class="ps-eye"></p>
            <p class="ps-faces"></p>
        </div>`;

    const svg = select(host).select<SVGSVGElement>('svg');
    const floorGroup = svg.append('g');
    const houseGroup = svg.append('g');

    const form = host.querySelector('form')!;
    const slider = form.elements.namedItem('distance') as HTMLInputElement;
    const output = slider.nextElementSibling as HTMLOutputElement;
    const button = form.querySelector('button')!;
    const line = (name: string) => host.querySelector(`.ps-${name}`)!;

    const camera = camera3D()
        .scale(SCALE)
        .origin({ x: WIDTH / 2, y: HEIGHT / 2 + 40 })
        .perspective(START);
    const floor = planes3D().camera(camera);
    const cubes = cubes3D<HouseVertex>().camera(camera);

    let cull: Cull = 'ccw';
    let yaw = 0;
    let pitch = 0;
    let dolly: Timer | undefined;

    /** The houses as `cubes3D` projects them, each sorting by its footprint. */
    function project(): House[] {
        return cubes.data(HOUSES).map((cube) =>
            Object.assign(cube, {
                centroid: cube.faces.find((face) => face.face === 'bottom')!.centroid
            })
        );
    }

    /** The floor, then one group per house, painted back to front by `sort`. */
    function drawStreet(houses: House[]): void {
        floorGroup
            .selectAll('path')
            .data(floor.data(FLOOR))
            .join('path')
            .attr('class', (_, q) => floorClass(q))
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
                    (d) => d.faces,
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
            const roof = d.faces.find((face) => face.face === 'top')!;
            const at = perspective(roof.centroid, view);
            select(this)
                .attr('x', at.x)
                .attr('y', at.y)
                .attr('font-size', 13 * growth(camera, roof.centroid.z))
                .attr('visibility', shows(roof, cull, v) ? null : 'hidden')
                .text(d[0].house + 1);
        });
    }

    function render(): void {
        turnCamera(camera, yaw, pitch, { tilt: TILT });

        const houses = project();
        drawStreet(houses);

        const d = camera.perspective();
        output.textContent = d === Infinity ? '∞' : fixed(d);
        button.textContent = d >= 2 * NEAR ? 'dolly in' : 'dolly out';
        line('eye').textContent = describeEye(camera);
        line('faces').textContent = describeFaces(houses, camera);
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
        cull = new FormData(form).get('cull') as Cull;
        render();
    });
    button.addEventListener('click', dollyZoom);

    svg.call(
        dragRotate((y, p) => {
            yaw = y;
            pitch = p;
            render();
        })
    );

    render();

    return () => {
        dolly?.stop();
        host.classList.remove('perspective-street');
        host.innerHTML = '';
    };
}
