import { max, mean, min, polygonArea, polygonCentroid, select } from 'd3';
import { box, camera3D, cubes3D, normal, planes3D, sort } from '../../index';
import type {
    Camera3DInstance,
    Cubes3DInstance,
    Plane,
    Planes3DInstance,
    Point3D
} from '../../index';
import { rotatingFigure, turnCamera } from './rotatingFigure';
import type { Turn } from './rotatingFigure';

/*
 * A depth-ordering lab: a few faces painted back to front by an order the
 * reader picks. Every pair of faces that overlaps on the screen is asked
 * where it overlaps: `unproject` finds the point of each face under a few
 * screen points, and the view direction tells which of the two is nearer.
 * A pair the order paints the wrong way round is outlined, a pair that
 * crosses is hatched. The styles ship with the module: the figure adds
 * them to its host.
 */

const SCALE = 40;
const ORIGIN = { x: 480, y: 250 };
/** How far an arrow key turns the scene: 5 degrees. */
const TURN = Math.PI / 36;
/** Two hits closer than this along the view direction tell nothing. */
const EPSILON = 1e-6;

type Strategy = 'data' | 'centroid' | 'farthest' | 'nearest' | 'overlap';

const STRATEGIES: [Strategy, string][] = [
    ['data', 'data order'],
    ['centroid', 'centroid'],
    ['farthest', 'farthest vertex'],
    ['nearest', 'nearest vertex'],
    ['overlap', 'by overlap']
];

/** A free face of a scene: a flat quad, seen from both sides. */
type Quad = { id: string; color: number; points: Point3D[] };

type Scene = {
    name: string;
    /** What the scene breaks, in one sentence. */
    breaks: string;
    quads: Quad[];
    cube?: { color: number; spec: Parameters<typeof box>[0] };
    /** The view the scene starts from, where it breaks what it names. */
    turn: Turn;
};

/** A face after the projection, free or of the cube, as the pair tests see it. */
type Face = {
    id: string;
    classes: string;
    path: string;
    /** The projected corners, in screen pixels. */
    outline: [number, number][];
    /** A corner and the normal in world space: the plane of the face. */
    corner: Point3D;
    normal: Point3D;
    /** The rotated centroid, which `sort` compares. */
    centroid: Point3D;
    /** The rotated z of the farthest and of the nearest corner. */
    far: number;
    near: number;
};

/** Two faces that overlap on the screen, and which one is in front there. */
type Pair = { overlap: [number, number][]; front: Face; behind: Face; crossing: boolean };

/** A thin flat stick from `from` to `to`, `width` across in the floor plane. */
function stick(id: string, color: number, from: Point3D, to: Point3D, width: number): Quad {
    const length = Math.hypot(to.x - from.x, to.z - from.z);
    const ox = ((from.z - to.z) / length) * (width / 2);
    const oz = ((to.x - from.x) / length) * (width / 2);
    const at = (p: Point3D, side: number) => ({ x: p.x + side * ox, y: p.y, z: p.z + side * oz });
    return { id, color, points: [at(from, 1), at(to, 1), at(to, -1), at(from, -1)] };
}

/**
 * Three sticks along the sides of a triangle. Each rises from the corner it
 * starts at to the next one, so it lies over the next stick at one crossing
 * and under the previous one at the other.
 */
function pinwheel(): Quad[] {
    const corner = (i: number) => ({
        x: 3 * Math.cos((2 * Math.PI * i) / 3 + Math.PI / 2),
        z: 3 * Math.sin((2 * Math.PI * i) / 3 + Math.PI / 2)
    });
    return ['A', 'B', 'C'].map((name, i) => {
        const a = corner(i);
        const b = corner(i + 1);
        // The screen y grows downwards, so the stick rises towards -y. It
        // reaches past both corners, so the crossings are whole.
        const along = (t: number) => ({
            x: a.x + (b.x - a.x) * t,
            y: (0.5 - t) * 1.5,
            z: a.z + (b.z - a.z) * t
        });
        return stick(`stick ${name}`, i, along(-0.25), along(1.25), 0.9);
    });
}

const SCENES: Scene[] = [
    {
        name: 'Wall and cube',
        breaks: 'The cube stands in front of the far end of the wall, but the centroid of the long wall lies nearer than any face of the cube.',
        quads: [
            {
                id: 'wall',
                color: 0,
                points: [
                    { x: -5, y: 1.25, z: 4 },
                    { x: 5, y: 1.25, z: -4 },
                    { x: 5, y: -1.25, z: -4 },
                    { x: -5, y: -1.25, z: 4 }
                ]
            }
        ],
        cube: { color: 1, spec: { x: 4.6, y: 1.25, z: -2.3, width: 1.2, height: 1.2, depth: 1.2 } },
        turn: { yaw: -0.3, tilt: 0.45 }
    },
    {
        name: 'Ramp and tile',
        breaks: 'The ramp reaches far back, so its farthest corner lies behind the tile it covers.',
        quads: [
            {
                id: 'ramp',
                color: 0,
                points: [
                    { x: -1.5, y: -2.4, z: 4 },
                    { x: 1.5, y: -2.4, z: 4 },
                    { x: 1.5, y: 0, z: -4 },
                    { x: -1.5, y: 0, z: -4 }
                ]
            },
            {
                id: 'tile',
                color: 1,
                points: [
                    { x: -0.8, y: 0, z: 3.6 },
                    { x: 0.8, y: 0, z: 3.6 },
                    { x: 0.8, y: 0, z: 2 },
                    { x: -0.8, y: 0, z: 2 }
                ]
            }
        ],
        turn: { yaw: 0.5, tilt: 1 }
    },
    {
        name: 'Three sticks',
        breaks: 'Each stick lies over the next and under the previous one, so no order of whole faces is right.',
        quads: pinwheel(),
        turn: { yaw: 0, tilt: 1.1 }
    },
    {
        name: 'Crossing planes',
        breaks: 'The planes cut through each other, and each is in front for half of the overlap.',
        quads: [
            {
                id: 'upright',
                color: 0,
                points: [
                    { x: -2.5, y: -1.5, z: 0 },
                    { x: 2.5, y: -1.5, z: 0 },
                    { x: 2.5, y: 1.5, z: 0 },
                    { x: -2.5, y: 1.5, z: 0 }
                ]
            },
            {
                id: 'level',
                color: 1,
                points: [
                    { x: -1.5, y: 0, z: -2.5 },
                    { x: 1.5, y: 0, z: -2.5 },
                    { x: 1.5, y: 0, z: 2.5 },
                    { x: -1.5, y: 0, z: 2.5 }
                ]
            }
        ],
        turn: { yaw: 0.4, tilt: 0.5 }
    }
];

// The eye of the perspective sits four times as far from the pivot as the
// farthest corner of any scene, so every face lies well in front of it.
const DISTANCE =
    4 *
    max(
        SCENES.flatMap((scene) => [
            ...scene.quads.flatMap((quad) => quad.points),
            ...(scene.cube ? box(scene.cube.spec) : [])
        ]),
        (p) => Math.hypot(p.x, p.y, p.z)
    )!;

/** What the simple strategies compare, back to front: one number per face. */
const COMPARE: Record<Exclude<Strategy, 'overlap'>, (a: Face, b: Face) => number> = {
    // Array.sort is stable, so comparing nothing keeps the data order.
    data: () => 0,
    centroid: sort,
    farthest: (a, b) => a.far - b.far,
    nearest: (a, b) => a.near - b.near
};

/** A projected quad, a plane or a cube face, as a face of the lab. */
function toFace(id: string, classes: string, points: Plane<Point3D>, path: string): Face {
    return {
        id,
        classes,
        path,
        outline: points.map((p) => [p.projected.x, p.projected.y]),
        corner: points[0],
        normal: normal(points),
        centroid: points.centroid,
        far: min(points, (p) => p.rotated.z)!,
        near: max(points, (p) => p.rotated.z)!
    };
}

/**
 * Projects the free quads and the cube of a scene into one list of faces.
 * Only the faces of the cube that wind counter-clockwise take part: `ccw`
 * reads the projected winding, so it is right in perspective too.
 */
function project(scene: Scene, planes: Planes3DInstance, cubes: Cubes3DInstance): Face[] {
    const quads = planes.data(scene.quads.map((quad) => quad.points)).map((plane, i) => {
        const { id, color } = scene.quads[i];
        return toFace(id, `color-${color}${plane.ccw ? '' : ' back'}`, plane, planes.draw(plane));
    });
    if (!scene.cube) {
        return quads;
    }
    const { color, spec } = scene.cube;
    const faces = cubes.data([box(spec)])[0].faces!.filter((face) => face.ccw);
    return [
        ...quads,
        ...faces.map((face) =>
            toFace(`cube ${face.face}`, `color-${color} face-${face.face}`, face, cubes.draw(face))
        )
    ];
}

/**
 * The part of the convex polygon `subject` inside the convex polygon
 * `clipper`, by Sutherland and Hodgman: one cut per edge of the clipper.
 */
function clip(subject: [number, number][], clipper: [number, number][]): [number, number][] {
    // Which side of an edge is inside depends on the winding. A clipper
    // without an area has no inside.
    const winding = Math.sign(polygonArea(clipper));
    let polygon = winding ? subject : [];
    clipper.forEach(([ax, ay], i) => {
        const [bx, by] = clipper[(i + 1) % clipper.length];
        const side = ([x, y]: [number, number]) =>
            winding * ((x - ax) * (by - ay) - (y - ay) * (bx - ax));
        const input = polygon;
        polygon = [];
        input.forEach((p, j) => {
            const q = input[(j + 1) % input.length];
            const sp = side(p);
            const sq = side(q);
            if (sp >= 0) {
                polygon.push(p);
            }
            if (sp * sq < 0) {
                const t = sp / (sp - sq);
                polygon.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
            }
        });
    });
    return polygon;
}

/**
 * Asks two faces where they overlap on the screen which of them is in front.
 * At the centroid of the overlap and at its corners, pulled a fifth of the
 * way in, `unproject` finds the point of each face's plane under the screen
 * point. The hit with the larger dot product with the view direction is the
 * nearer one; both hits lie on one ray, from the eye in perspective, so the
 * test holds in both projections. Returns nothing for faces that do not
 * overlap, or where a plane is seen edge-on at every sample.
 */
function testPair(a: Face, b: Face, camera: Camera3DInstance): Pair | undefined {
    const overlap = clip(a.outline, b.outline);
    if (overlap.length < 3 || Math.abs(polygonArea(overlap)) < 1) {
        return undefined;
    }
    const [cx, cy] = polygonCentroid(overlap);
    const v = camera.viewDirection();
    const depth = (face: Face, x: number, y: number) => {
        const hit = camera.unproject({ x, y }, face.corner, face.normal);
        return hit && hit.x * v.x + hit.y * v.y + hit.z * v.z;
    };

    let aFront = 0;
    let bFront = 0;
    for (const [x, y] of [[cx, cy], ...overlap]) {
        const sx = x + (cx - x) / 5;
        const sy = y + (cy - y) / 5;
        const da = depth(a, sx, sy);
        const db = depth(b, sx, sy);
        if (da !== null && db !== null && Math.abs(da - db) > EPSILON) {
            if (da > db) {
                aFront += 1;
            } else {
                bFront += 1;
            }
        }
    }
    if (!aFront && !bFront) {
        return undefined;
    }
    const front = aFront ? a : b;
    return { overlap, front, behind: front === a ? b : a, crossing: aFront > 0 && bFront > 0 };
}

/**
 * The order of whole faces the pair tests allow: every face is painted
 * after the faces it covers. Tarjan's depth-first search, started from the
 * faces in centroid order, hands back the strongly connected parts of the
 * "covers" graph, each after every part it covers. A part of more than one
 * face is a cycle, which no order of whole faces paints right, so it keeps
 * the centroid order. A crossing pair covers nothing.
 */
function byOverlap(faces: Face[], pairs: Pair[]): { order: Face[]; cycles: Face[][] } {
    const covers = new Map(faces.map((face) => [face, [] as Face[]]));
    for (const pair of pairs) {
        if (!pair.crossing) {
            covers.get(pair.front)!.push(pair.behind);
        }
    }

    const index = new Map<Face, number>();
    const low = new Map<Face, number>();
    const stack: Face[] = [];
    const order: Face[] = [];
    const cycles: Face[][] = [];

    function visit(face: Face): void {
        low.set(face, index.size);
        index.set(face, index.size);
        stack.push(face);
        for (const next of covers.get(face)!) {
            if (!index.has(next)) {
                visit(next);
                low.set(face, Math.min(low.get(face)!, low.get(next)!));
            } else if (stack.includes(next)) {
                low.set(face, Math.min(low.get(face)!, index.get(next)!));
            }
        }
        if (low.get(face) === index.get(face)) {
            const part = stack.splice(stack.indexOf(face)).sort(sort);
            if (part.length > 1) {
                cycles.push(part);
            }
            order.push(...part);
        }
    }

    for (const face of [...faces].sort(sort)) {
        if (!index.has(face)) {
            visit(face);
        }
    }
    return { order, cycles };
}

const counted = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * Mounts the figure into `host` and returns a function that removes it.
 */
export function mountDepthOrdering(host: HTMLElement): () => void {
    // The state: every input writes it, and `render` reads it.
    const state = {
        scene: 0,
        strategy: 'centroid' as Strategy,
        perspective: false,
        labels: false,
        yaw: 0,
        pitch: 0
    };
    // The drag totals the scaffold reported last.
    let dragged = { yaw: 0, pitch: 0 };

    // Both renderers hang on one camera, which also answers `unproject`.
    const camera = camera3D().scale(SCALE).origin(ORIGIN);
    const planes = planes3D().camera(camera);
    const cubes = cubes3D().camera(camera);

    // The scaffold reports the total of every drag so far. The scene turns
    // by the change since the last report, so the keys and the reset can
    // set the angles too.
    const { group, button } = rotatingFigure(
        host,
        'depth',
        'A few overlapping faces painted back to front by the chosen order, the pairs it paints the wrong way round outlined in red and the pairs that cross hatched in amber. Drag it to rotate it, or focus it and turn it with the arrow keys, pick the order with 1 to 5 and the scene with the brackets, toggle the paint order with O and the projection with P, and reset the view with R.',
        (dragYaw, dragPitch) => {
            state.yaw += dragYaw - dragged.yaw;
            state.pitch += dragPitch - dragged.pitch;
            dragged = { yaw: dragYaw, pitch: dragPitch };
            render();
        }
    );

    host.classList.add('depth-ordering');
    host.insertAdjacentHTML(
        'beforeend',
        `<style>${STYLES}</style>
        <form class="depth-controls">
            <label>scene <select name="scene">${SCENES.map(
                (scene, i) => `<option value="${i}">${scene.name}</option>`
            ).join('')}</select></label>
            <fieldset>
                <legend>order</legend>
                ${STRATEGIES.map(
                    ([value, label], i) =>
                        `<label title="${label} (${i + 1})"><input type="radio" name="strategy" value="${value}"> ${label}</label>`
                ).join('')}
            </fieldset>
            <fieldset>
                <legend>projection</legend>
                <label><input type="radio" name="projection" value="orthographic"> orthographic</label>
                <label><input type="radio" name="projection" value="perspective"> perspective</label>
            </fieldset>
            <label><input type="checkbox" name="labels"> paint order</label>
            <p class="depth-readout"><span></span> <span></span></p>
            <p class="depth-live" aria-live="polite"></p>
        </form>`
    );

    const svg = select(host).select<SVGSVGElement>('svg').attr('tabindex', 0);
    // The hatch of a crossing pair, in the colors of the theme.
    svg.insert('defs', 'g')
        .append('pattern')
        .attr('id', 'depth-hatch')
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('patternTransform', 'rotate(45)')
        .attr('width', 7)
        .attr('height', 7)
        .append('path')
        .attr('d', 'M0,0V7');
    // The marks sit above every face, so a wrong pair shows even where the
    // wrong face covers it.
    const faceGroup = group.append('g').attr('class', 'depth-faces');
    const markGroup = group.append('g').attr('class', 'depth-marks');
    const labelGroup = group.append('g').attr('class', 'depth-labels');

    const form = host.querySelector('form')!;
    const [note, readout] = Array.from(host.querySelectorAll<HTMLElement>('.depth-readout span'));
    const live = host.querySelector<HTMLElement>('.depth-live')!;
    const field = (name: string) =>
        form.elements.namedItem(name) as RadioNodeList | HTMLSelectElement;

    /** Projects the scene, tests every pair, and paints it in the chosen order. */
    function render(): void {
        const scene = SCENES[state.scene];
        camera.perspective(state.perspective ? DISTANCE : Infinity);
        turnCamera(camera, state.yaw, state.pitch, scene.turn);

        const faces = project(scene, planes, cubes);
        const pairs = faces.flatMap((a, i) =>
            faces.slice(i + 1).flatMap((b) => testPair(a, b, camera) ?? [])
        );
        const overlap = byOverlap(faces, pairs);
        const order =
            state.strategy === 'overlap' ? overlap.order : [...faces].sort(COMPARE[state.strategy]);
        const paint = new Map(order.map((face, i) => [face, i]));
        const wrong = pairs.filter(
            (pair) => !pair.crossing && paint.get(pair.behind)! > paint.get(pair.front)!
        );
        const crossing = pairs.filter((pair) => pair.crossing);

        faceGroup
            .selectAll<SVGPathElement, Face>('path')
            .data(order, (d) => d.id)
            .join('path')
            .attr('class', (d) => `face ${d.classes}`)
            .attr('d', (d) => d.path)
            .order();

        markGroup
            .selectAll('path')
            .data([...wrong, ...crossing])
            .join('path')
            .attr('class', (d) => (d.crossing ? 'crossing' : 'wrong'))
            .attr('d', (d) => `M${d.overlap.join('L')}Z`);

        labelGroup
            .attr('display', state.labels ? null : 'none')
            .selectAll('text')
            .data(order)
            .join('text')
            .attr('x', (d) => mean(d.outline, (p) => p[0])!)
            .attr('y', (d) => mean(d.outline, (p) => p[1])!)
            .text((_, i) => i + 1);

        const cycles = overlap.cycles.map((cycle) => cycle.map((face) => face.id).join(', '));
        note.textContent = scene.breaks;
        readout.textContent = `${STRATEGIES.find(([s]) => s === state.strategy)![1]}: ${counted(pairs.length, 'overlapping pair')}, ${wrong.length} painted in the wrong order, ${crossing.length} crossing, ${cycles.length ? `a cycle of ${cycles.join('; ')}` : 'no cycle'}.`;
    }

    /**
     * Writes a change into the state, mirrors it on the controls and draws
     * it. A new scene starts from its own view, where it breaks its order.
     */
    function set(change: Partial<typeof state>): void {
        const fresh = change.scene !== undefined && change.scene !== state.scene;
        Object.assign(state, fresh ? { yaw: 0, pitch: 0 } : {}, change);
        field('scene').value = String(state.scene);
        field('strategy').value = state.strategy;
        field('projection').value = state.perspective ? 'perspective' : 'orthographic';
        (form.elements.namedItem('labels') as HTMLInputElement).checked = state.labels;
        render();
    }

    form.addEventListener('change', () => {
        const data = new FormData(form);
        set({
            scene: Number(data.get('scene')),
            strategy: data.get('strategy') as Strategy,
            perspective: data.get('projection') === 'perspective',
            labels: data.has('labels')
        });
    });

    button.text('reset').on('click', () => set({ yaw: 0, pitch: 0 }));

    /** What the keys do while the figure has the focus. */
    const actions: Record<string, () => Partial<typeof state>> = {
        arrowleft: () => ({ yaw: state.yaw - TURN }),
        arrowright: () => ({ yaw: state.yaw + TURN }),
        arrowup: () => ({ pitch: state.pitch - TURN }),
        arrowdown: () => ({ pitch: state.pitch + TURN }),
        '[': () => ({ scene: (state.scene + SCENES.length - 1) % SCENES.length }),
        ']': () => ({ scene: (state.scene + 1) % SCENES.length }),
        o: () => ({ labels: !state.labels }),
        p: () => ({ perspective: !state.perspective }),
        r: () => ({ yaw: 0, pitch: 0 }),
        ...Object.fromEntries(
            STRATEGIES.map(([strategy], i) => [String(i + 1), () => ({ strategy })])
        )
    };

    // A key with Ctrl, ⌘ or Alt is left to the browser. The live region
    // tells what the key changed.
    svg.on('keydown', (event: KeyboardEvent) => {
        const action = actions[event.key.toLowerCase()];
        if (!action || event.ctrlKey || event.metaKey || event.altKey) {
            return;
        }
        event.preventDefault();
        set(action());
        live.textContent = `${SCENES[state.scene].name}. ${readout.textContent}`;
    });

    set({});

    return () => {
        host.innerHTML = '';
        host.classList.remove('depth-ordering');
    };
}

// The styles of the figure, scoped by the class of its host. VitePress puts
// the class `dark` on the root element in dark mode.
const STYLES = `
.depth-ordering {
    --do-ink: #1b1e21;
    --do-muted: #5f6468;
    --do-button: #f0f1f1;
    --do-line: #c4c7c9;
    --do-bg: #ffffff;
    --do-wrong: #d0262b;
    --do-cross: #c98500;
    --do-color-0: #2a78d6;
    --do-color-1: #1baf7a;
    --do-color-2: #8a5cd6;
    margin: 1.5rem 0;
    position: relative;
    overflow: hidden;
    border: 1px solid var(--do-line);
    border-radius: 12px;
    background: var(--do-bg);
    color: var(--do-ink);
}

.dark .depth-ordering {
    --do-ink: #e6e8e9;
    --do-muted: #9aa0a4;
    --do-button: #17181a;
    --do-line: #3d4144;
    --do-bg: #0c0d0e;
    --do-wrong: #ff5a5f;
    --do-cross: #f5b83d;
    --do-color-0: #3987e5;
    --do-color-1: #199e70;
    --do-color-2: #9a70e0;
}

.depth-ordering .depth-svg {
    display: block;
    width: 100%;
    height: auto;
    cursor: grab;
    touch-action: none;
}

.depth-ordering .depth-svg:active {
    cursor: grabbing;
}

/* The browser rings a focused SVG on every click: keep the ring for the keyboard. */
.depth-ordering .depth-svg:focus {
    outline: none;
}

.depth-ordering .depth-svg:focus-visible {
    outline: 2px solid var(--do-ink);
    outline-offset: -4px;
}

/* The color picks the hue, the side of the face its shade. */
.depth-ordering .color-0 {
    --do-base: var(--do-color-0);
}

.depth-ordering .color-1 {
    --do-base: var(--do-color-1);
}

.depth-ordering .color-2 {
    --do-base: var(--do-color-2);
}

.depth-ordering .face {
    fill: var(--do-base);
    stroke: color-mix(in srgb, var(--do-base) 50%, black);
    stroke-width: 1;
    stroke-linejoin: round;
}

.depth-ordering .face-front,
.depth-ordering .face-back {
    fill: color-mix(in srgb, var(--do-base) 82%, black);
}

.depth-ordering .face-left,
.depth-ordering .face-right,
.depth-ordering .face.back {
    fill: color-mix(in srgb, var(--do-base) 62%, black);
}

.depth-ordering .depth-marks {
    pointer-events: none;
    stroke-linejoin: round;
}

.depth-ordering .wrong {
    fill: none;
    stroke: var(--do-wrong);
    stroke-width: 3;
}

.depth-ordering .crossing {
    fill: url(#depth-hatch);
    stroke: var(--do-cross);
    stroke-width: 2;
}

.depth-ordering pattern path {
    stroke: var(--do-cross);
    stroke-width: 2.5;
}

.depth-ordering .depth-labels {
    pointer-events: none;
    font: 600 14px system-ui, sans-serif;
    text-anchor: middle;
    dominant-baseline: central;
    fill: var(--do-ink);
    stroke: var(--do-bg);
    stroke-width: 4;
    paint-order: stroke;
}

.depth-ordering .depth-button {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    padding: 0.35rem 0.9rem;
    border: 1px solid var(--do-line);
    border-radius: 8px;
    background: var(--do-button);
    color: var(--do-ink);
    font-size: 0.85rem;
    cursor: pointer;
}

.depth-ordering .depth-button:hover {
    border-color: var(--do-ink);
}

.depth-ordering .depth-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 1.5rem;
    margin: 0;
    padding: 0.75rem;
    border-top: 1px solid var(--do-line);
    font-size: 0.85rem;
}

.depth-ordering fieldset {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 12px;
    margin: 0;
    padding: 0;
    border: 0;
}

.depth-ordering legend {
    float: left;
    margin-right: 4px;
    color: var(--do-muted);
}

.depth-ordering select {
    padding: 0.15rem 0.3rem;
    border: 1px solid var(--do-line);
    border-radius: 6px;
    background: var(--do-button);
    color: var(--do-ink);
}

.depth-ordering .depth-readout {
    flex: 1 1 100%;
    margin: 0;
    color: var(--do-muted);
    line-height: 1.5;
    font-variant-numeric: tabular-nums;
}

.depth-ordering .depth-readout span:nth-child(2) {
    color: var(--do-ink);
}

/* The live region only speaks: the readout already shows what it says. */
.depth-ordering .depth-live {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
}

@media (max-width: 640px) {
    .depth-ordering .depth-controls {
        flex-direction: column;
        align-items: flex-start;
    }
}
`;
