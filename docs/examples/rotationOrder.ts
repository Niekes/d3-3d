import { easeCubicInOut, select, timer } from 'd3';
import type { Selection, Timer } from 'd3';
import { box, camera3D, cubes3D, lines3D, sort, transform } from '../../index';
import type {
    Camera3DInstance,
    Cube,
    CubeFace,
    CubeFaceName,
    Cubes3DInstance,
    Line,
    Lines3DInstance,
    Point3D,
    ShapeInstance,
    TransformedPoint,
    TransformOptions
} from '../../index';
import { joinFaces } from './cubeFaces';
import { placeSegments } from './segments';

/*
 * Rotation order: two copies of one block of five cubes, turned by the same
 * three angles. The renderer turns the left copy in its own order, around
 * z, then y, then x. The right copy goes through a chain of three
 * `transform` calls with one angle each, in the order the radios pick.
 * Chained as z, y, x, the two copies match exactly. The styles live in this
 * file too, so the file is all a copy needs.
 */

type Axis = 'x' | 'y' | 'z';

/** The three angles, in radians. */
type Angles = Record<Axis, number>;

/** A place in the block: the column along x, the layer up and the row along z. */
type Cell = { column: number; layer: number; row: number };

/** One vertex of a cube: a point that carries its cell, so the cell survives every turn. */
type Vertex = Point3D & Cell;

/** A vertex after the chain: `rotated` holds the pose after the last turn. */
type Turned = TransformedPoint<Vertex>;

/** One cube after the projection: cubes3D always sets its faces and its centroid. */
type BlockCube<Datum> = Cube<Datum> & { faces: CubeFace<Datum>[]; centroid: Point3D };

/** The parts of a panel that change: the cubes, the own axes, the heading and the code. */
type Panel = {
    block: Selection<SVGGElement, unknown, null, undefined>;
    axes: Selection<SVGGElement, unknown, null, undefined>;
    heading: HTMLElement;
    code: HTMLElement;
};

/** A preset: the angles it sets in degrees, the others take their defaults, and what it shows. */
type Preset = { name: string; note: string; angles: Partial<Angles>; order?: string };

const AXES: Axis[] = ['x', 'y', 'z'];

/** The order of the renderer: around z first, then y, then x. */
const LIBRARY: Axis[] = ['z', 'y', 'x'];

const ORDERS = ['xyz', 'xzy', 'yxz', 'yzx', 'zxy', 'zyx'];

// Both copies, and every turn of the chain, share one scale, one origin and
// one rotation center: the middle of the block.
const SCALE = 60;
const ORIGIN = { x: 240, y: 200 };
const CENTER: Point3D = { x: 0, y: 0, z: 0 };

/** The milliseconds each of the three turns takes when the figure plays them. */
const TURN = 600;

const DEFAULTS: Angles = { x: -30, y: 40, z: 20 };

const PRESETS: Preset[] = [
    {
        name: 'default',
        note: 'x −30°, y 40° and z 20° on both sides, x, then y, then z on the right: the same three angles give two poses.',
        angles: {}
    },
    {
        name: 'quarter turns',
        note: 'x 90° and y 90°. Quarter turns differ the most: a different face of the block looks at you on each side.',
        angles: { x: 90, y: 90, z: 0 }
    },
    {
        name: 'small angles',
        note: '5° on every axis. Small turns nearly commute: pick any order, the copies stay within a few hundredths of a unit.',
        angles: { x: 5, y: 5, z: 5 }
    },
    {
        name: 'gimbal lock',
        note: 'y 90°: the left copy’s own z axis lies on the world x axis. Move x, then z: both sliders turn the left copy the same way.',
        angles: { x: 0, y: 90, z: 0 }
    },
    {
        name: 'the library’s order',
        note: 'z, then y, then x on the right: the chain of three transform calls lands exactly on the pose of the renderer.',
        angles: {},
        order: 'zyx'
    }
];

const NOTE = 'Pick a preset, move a slider or pick an order.';

/**
 * A column of three cubes, one more towards +x at the top and one towards
 * +z in the middle: no turn maps the block onto itself.
 */
const CELLS: Cell[] = [
    { column: 0, layer: 0, row: 0 },
    { column: 0, layer: 1, row: 0 },
    { column: 0, layer: 2, row: 0 },
    { column: 1, layer: 2, row: 0 },
    { column: 0, layer: 1, row: 1 }
];

/** The neighbor behind every face, as a step in column, layer and row. */
const STEPS: Record<CubeFaceName, [number, number, number]> = {
    front: [0, 0, 1],
    back: [0, 0, -1],
    left: [-1, 0, 0],
    right: [1, 0, 0],
    top: [0, 1, 0],
    bottom: [0, -1, 0]
};

const keyOf = (cell: Cell) => `${cell.column},${cell.layer},${cell.row}`;

const FILLED = new Set(CELLS.map(keyOf));

/** Whether the face of a cell in this direction shows: no cube behind it. */
function isOpen(cell: Cell, face: CubeFaceName): boolean {
    const [dc, dl, dr] = STEPS[face];
    return !FILLED.has(
        keyOf({ column: cell.column + dc, layer: cell.layer + dl, row: cell.row + dr })
    );
}

// The eight vertices of every cube, in the order cubes3D expects. The
// middle cube of the column sits on the rotation center, and the layers
// rise towards a negative y, as on the screen.
const BLOCK: Vertex[][] = CELLS.map((cell) =>
    box({
        x: cell.column,
        y: 1.5 - cell.layer,
        z: cell.row,
        width: 1,
        height: 1,
        depth: 1
    }).map((corner) => ({ ...cell, ...corner }))
);

/** The copy's own axes: three segments from the middle of the block, 2.5 long. */
const OWN_AXES: Point3D[][] = AXES.map((axis) => [
    CENTER,
    { ...CENTER, [axis]: CENTER[axis] + 2.5 }
]);

/** The world axes, fixed in a corner of each figure: x right, y down and z towards you. */
const GIZMO = `
    <g class="ro-gizmo" transform="translate(28,28)">
        <path class="axis-x" d="M9,0H34"></path><path class="axis-x ro-head" d="M41,0l-8,-4v8z"></path>
        <text class="axis-x" x="46" y="4">x</text>
        <path class="axis-y" d="M0,9V34"></path><path class="axis-y ro-head" d="M0,41l-4,-8h8z"></path>
        <text class="axis-y" x="-3" y="55">y</text>
        <circle class="axis-z ro-ring" r="6"></circle><circle class="axis-z" r="2"></circle>
        <text class="axis-z" x="-17" y="-6">z</text>
        <text class="ro-world" x="11" y="20">world</text>
    </g>`;

const rad = (degrees: number) => (degrees * Math.PI) / 180;

/** The options of one turn of the chain: one angle set, the other two at zero. */
function turn<Datum>(
    axis: Axis,
    angle: number,
    at: (point: Datum) => Point3D
): TransformOptions<Datum> {
    return {
        rotateX: axis === 'x' ? angle : 0,
        rotateY: axis === 'y' ? angle : 0,
        rotateZ: axis === 'z' ? angle : 0,
        rotateCenter: CENTER,
        // The chain reads only `rotated`: the projection of a turn is never used.
        scale: 1,
        origin: { x: 0, y: 0 },
        x: (point) => at(point).x,
        y: (point) => at(point).y,
        z: (point) => at(point).z
    };
}

/**
 * Turns `points` around one axis after the other, in `order`. The first
 * call reads the points, the next two the `rotated` of the call before:
 * `transform` spreads its input into its result, so every call replaces
 * the `rotated` of the one before with its own.
 */
function chain<Datum extends Point3D>(
    points: Datum[],
    order: Axis[],
    angles: Angles
): TransformedPoint<Datum>[] {
    const [a, b, c] = order;
    const first = transform(
        points,
        turn(a, angles[a], (point: Datum) => point)
    );
    const second = transform(
        first,
        turn(b, angles[b], (point) => point.rotated)
    );
    return transform(
        second,
        turn(c, angles[c], (point) => point.rotated)
    );
}

/**
 * The angles a side has reached `progress` turns into its order: the turns
 * before are whole, the current one is eased and the later ones are zero.
 */
function reached(order: Axis[], angles: Angles, progress: number): Angles {
    const at = (axis: Axis) =>
        angles[axis] * easeCubicInOut(Math.max(0, Math.min(1, progress - order.indexOf(axis))));
    return { x: at('x'), y: at('y'), z: at('z') };
}

/** Hangs a renderer of the right copy on its camera and has it read `rotated`. */
function readRotated<Datum extends { rotated: Point3D }>(
    renderer: ShapeInstance<Datum>,
    camera: Camera3DInstance
): void {
    renderer
        .camera(camera)
        .x((d) => d.rotated.x)
        .y((d) => d.rotated.y)
        .z((d) => d.rotated.z);
}

/** The largest distance between matching rotated vertices of two copies. */
function largestGap(left: Cube<Vertex>[], right: Cube<Vertex>[]): number {
    return Math.max(
        ...left.flatMap((cube, i) =>
            cube.map((vertex, j) => {
                const a = vertex.rotated;
                const b = right[i][j].rotated;
                return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
            })
        )
    );
}

/** Projects one copy with its two renderers and draws it into its panel. */
function drawCopy<C extends Vertex, A extends Point3D>(
    panel: Panel,
    cubes: Cubes3DInstance<C>,
    axes: Lines3DInstance<A>,
    block: C[][],
    ownAxes: A[][]
): BlockCube<C>[] {
    // A face against another cube is dropped, so only the surface of the
    // block reaches the DOM.
    const turned = cubes.data(block) as BlockCube<C>[];
    for (const cube of turned) {
        cube.faces = cube.faces.filter((face) => isOpen(cube[0], face.face));
    }

    // The cubes paint back to front, and a face that turns away is hidden.
    const groups = panel.block
        .selectAll<SVGGElement, BlockCube<C>>('g')
        .data(turned)
        .join('g')
        .sort(sort);
    joinFaces(
        groups.selectAll<SVGPathElement, CubeFace<C>>('path').data(
            (d) => d.faces,
            (d) => d.face
        ),
        cubes.draw
    );

    const lines = axes.data(ownAxes);
    panel.axes
        .selectAll<SVGLineElement, Line<A>>('line')
        .data(lines)
        .join('line')
        .attr('class', (_, k) => `axis-${AXES[k]}`)
        .call(placeSegments);
    panel.axes
        .selectAll('text')
        .data(lines)
        .join('text')
        .attr('class', (_, k) => `axis-${AXES[k]}`)
        .attr('x', (d) => d[1].projected.x + 5)
        .attr('y', (d) => d[1].projected.y - 5)
        .text((_, k) => AXES[k]);

    return turned;
}

/**
 * The styles, scoped to the class the figure puts on its host. The colors
 * are custom properties, and a `.dark` ancestor, as VitePress sets it, swaps
 * them for the dark theme.
 */
const STYLE = `
    .rotation-order {
        --ro-ink: #1b1e21;
        --ro-muted: #6b7075;
        --ro-line: #c4c7c9;
        --ro-bg: #ffffff;
        --ro-button: #f0f1f1;
        --ro-front: #4c7bd9;
        --ro-back: #8a5cd6;
        --ro-left: #1baf7a;
        --ro-right: #eb6834;
        --ro-top: #eda100;
        --ro-bottom: #d64560;
        --ro-x: #d6336c;
        --ro-y: #2b8a3e;
        --ro-z: #1c7ed6;
        margin: 1.5rem 0;
        overflow: hidden;
        border: 1px solid var(--ro-line);
        border-radius: 12px;
        background: var(--ro-bg);
        color: var(--ro-ink);
    }

    .dark .rotation-order {
        --ro-ink: #e6e8e9;
        --ro-muted: #9aa0a6;
        --ro-line: #3d4144;
        --ro-bg: #0c0d0e;
        --ro-button: #17181a;
        --ro-front: #3987e5;
        --ro-back: #9a70e0;
        --ro-left: #199e70;
        --ro-right: #d95926;
        --ro-top: #c98500;
        --ro-bottom: #e05a72;
        --ro-x: #f06595;
        --ro-y: #51cf66;
        --ro-z: #4dabf7;
    }

    .rotation-order .ro-panels {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr));
    }

    .rotation-order .ro-panel {
        min-width: 0;
        margin: 0;
    }

    .rotation-order .ro-panel + .ro-panel {
        border-left: 1px solid var(--ro-line);
    }

    .rotation-order .ro-svg {
        display: block;
        width: 100%;
        height: auto;
    }

    .rotation-order .ro-svg text {
        font-size: 13px;
        font-weight: 600;
        stroke: none;
    }

    .rotation-order .face {
        fill: var(--ro-base);
        stroke: color-mix(in srgb, var(--ro-base) 50%, black);
        stroke-width: 1;
        stroke-linejoin: round;
    }

    .rotation-order .face-front {
        --ro-base: var(--ro-front);
    }

    .rotation-order .face-back {
        --ro-base: var(--ro-back);
    }

    .rotation-order .face-left {
        --ro-base: var(--ro-left);
    }

    .rotation-order .face-right {
        --ro-base: var(--ro-right);
    }

    .rotation-order .face-top {
        --ro-base: var(--ro-top);
    }

    .rotation-order .face-bottom {
        --ro-base: var(--ro-bottom);
    }

    .rotation-order .axis-x {
        stroke: var(--ro-x);
        fill: var(--ro-x);
    }

    .rotation-order .axis-y {
        stroke: var(--ro-y);
        fill: var(--ro-y);
    }

    .rotation-order .axis-z {
        stroke: var(--ro-z);
        fill: var(--ro-z);
    }

    .rotation-order .ro-axes line {
        stroke-width: 3;
        stroke-linecap: round;
    }

    .rotation-order .ro-gizmo path {
        stroke-width: 2;
    }

    .rotation-order .ro-gizmo .ro-head {
        stroke: none;
    }

    .rotation-order .ro-gizmo .ro-ring {
        fill: none;
        stroke-width: 1.5;
    }

    .rotation-order .ro-svg .ro-world {
        fill: var(--ro-muted);
        font-size: 11px;
        font-weight: 400;
    }

    .rotation-order .ro-source {
        padding: 0 0.75rem 0.75rem;
    }

    .rotation-order .ro-heading {
        margin: 0 0 0.5rem;
        padding: 0;
        border: 0;
        font-size: 0.9rem;
        line-height: 1.4;
        letter-spacing: 0;
    }

    .rotation-order .ro-code {
        margin: 0;
        padding: 0.5rem 0.75rem;
        overflow-x: auto;
        border-radius: 8px;
        background: var(--ro-button);
        font-size: 0.8rem;
        line-height: 1.5;
    }

    .rotation-order .ro-difference {
        margin: 0;
        padding: 0.6rem 0.75rem;
        border-top: 1px solid var(--ro-line);
        font-size: 0.9rem;
        font-variant-numeric: tabular-nums;
    }

    .rotation-order .ro-controls {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-end;
        gap: 0.75rem 1.5rem;
        padding: 0.75rem;
        border-top: 1px solid var(--ro-line);
        font-size: 0.85rem;
    }

    .rotation-order .ro-controls fieldset {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        margin: 0;
        padding: 0;
        border: 0;
    }

    .rotation-order .ro-controls .ro-orders {
        display: grid;
        grid-template-columns: repeat(3, auto);
        column-gap: 1rem;
    }

    .rotation-order .ro-controls legend,
    .rotation-order .ro-note {
        color: var(--ro-muted);
    }

    .rotation-order .ro-controls legend {
        margin-bottom: 0.25rem;
    }

    .rotation-order .ro-controls label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .rotation-order .ro-controls output {
        min-width: 3em;
        font-variant-numeric: tabular-nums;
    }

    .rotation-order .ro-controls button {
        padding: 0.35rem 0.9rem;
        border: 1px solid var(--ro-line);
        border-radius: 8px;
        background: var(--ro-button);
        color: var(--ro-ink);
        cursor: pointer;
    }

    .rotation-order .ro-controls button:hover {
        border-color: var(--ro-ink);
    }

    .rotation-order .ro-controls button:focus-visible {
        outline: 2px solid var(--ro-ink);
        outline-offset: 2px;
    }

    .rotation-order .ro-presets {
        display: flex;
        flex-basis: 100%;
        flex-wrap: wrap;
        gap: 0.4rem;
    }

    .rotation-order .ro-presets button {
        padding: 0.2rem 0.7rem;
        border-radius: 999px;
    }

    .rotation-order .ro-note {
        flex-basis: 100%;
        margin: 0;
    }`;

/**
 * Mounts the figure into `host` and returns a function that removes it.
 */
export function mountRotationOrder(host: HTMLElement): () => void {
    host.classList.add('rotation-order');
    host.innerHTML = `
        <style>${STYLE}</style>
        <div class="ro-panels">
            <figure class="ro-panel">
                <svg class="ro-svg" viewBox="0 0 480 400" role="img" aria-label="The block turned by the renderer: around z, then y, then x.">${GIZMO}<g class="ro-block"></g><g class="ro-axes"></g></svg>
                <figcaption class="ro-source"><h3 class="ro-heading"></h3><pre class="ro-code"><code></code></pre></figcaption>
            </figure>
            <figure class="ro-panel">
                <svg class="ro-svg" viewBox="0 0 480 400" role="img" aria-label="The block turned by a chain of three transform calls, in the order picked below.">${GIZMO}<g class="ro-block"></g><g class="ro-axes"></g></svg>
                <figcaption class="ro-source"><h3 class="ro-heading"></h3><pre class="ro-code"><code></code></pre></figcaption>
            </figure>
        </div>
        <p class="ro-difference"></p>
        <form class="ro-controls">
            <div class="ro-presets">${PRESETS.map(
                (p) => `<button type="button">${p.name}</button>`
            ).join('')}</div>
            <p class="ro-note" aria-live="polite">${NOTE}</p>
            <fieldset>
                <legend>angles of both copies, in degrees</legend>
                ${AXES.map(
                    (axis) =>
                        `<label>${axis} <input name="${axis}" type="range" min="-180" max="180" step="1" value="${DEFAULTS[axis]}"><output></output></label>`
                ).join('')}
            </fieldset>
            <fieldset class="ro-orders">
                <legend>order of the right copy</legend>
                ${ORDERS.map(
                    (order) =>
                        `<label><input type="radio" name="order" value="${order}"${order === 'xyz' ? ' checked' : ''}> ${order.split('').join(', ')}</label>`
                ).join('')}
            </fieldset>
            <button class="ro-play" type="button">play</button>
        </form>`;

    const [left, right]: Panel[] = Array.from(host.querySelectorAll('.ro-panel'), (panel) => ({
        block: select(panel.querySelector('.ro-block') as SVGGElement),
        axes: select(panel.querySelector('.ro-axes') as SVGGElement),
        heading: panel.querySelector('.ro-heading') as HTMLElement,
        code: panel.querySelector('code') as HTMLElement
    }));
    const difference = host.querySelector('.ro-difference') as HTMLParagraphElement;
    const form = host.querySelector('form') as HTMLFormElement;
    const sliders = Array.from(form.querySelectorAll<HTMLInputElement>('input[type=range]'));
    const orderInputs = form.elements.namedItem('order') as RadioNodeList;
    const note = form.querySelector('.ro-note') as HTMLParagraphElement;
    left.heading.textContent = 'The renderer: z, then y, then x';

    // The left copy: the renderers turn it, in the library's order.
    const leftCamera = camera3D().scale(SCALE).origin(ORIGIN).rotationCenter(CENTER);
    const leftCubes = cubes3D<Vertex>().camera(leftCamera);
    const leftAxes = lines3D().camera(leftCamera);

    // The right copy: the chain turns it, and its renderers, with every
    // angle at zero, only project the `rotated` of the last turn.
    const rightCamera = camera3D().scale(SCALE).origin(ORIGIN).rotationCenter(CENTER);
    const rightCubes = cubes3D<Turned>();
    const rightAxes = lines3D<TransformedPoint<Point3D>>();
    readRotated(rightCubes, rightCamera);
    readRotated(rightAxes, rightCamera);

    // The turns played so far, 3 when the copies show the pose of the
    // sliders, and the gap between the copies in the last frame.
    let progress = 3;
    let gap = 0;
    let play: Timer | undefined;

    const degrees = (axis: Axis) =>
        (form.elements.namedItem(axis) as HTMLInputElement).valueAsNumber;
    const order = () => orderInputs.value.split('') as Axis[];
    const named = (axes: Axis[]) => axes.join(', ');

    /** Turns both copies, draws them, and fills the code and the difference line. */
    function draw(): void {
        const angles = { x: rad(degrees('x')), y: rad(degrees('y')), z: rad(degrees('z')) };
        const rightOrder = order();

        const turnedLeft = reached(LIBRARY, angles, progress);
        leftCamera.rotateX(turnedLeft.x).rotateY(turnedLeft.y).rotateZ(turnedLeft.z);
        const leftBlock = drawCopy(left, leftCubes, leftAxes, BLOCK, OWN_AXES);

        const turnedRight = reached(rightOrder, angles, progress);
        const rightBlock = drawCopy(
            right,
            rightCubes,
            rightAxes,
            BLOCK.map((cube) => chain(cube, rightOrder, turnedRight)),
            OWN_AXES.map((axis) => chain(axis, rightOrder, turnedRight))
        );

        gap = largestGap(leftBlock, rightBlock);
        difference.textContent =
            gap < 1e-9
                ? 'The same pose: every vertex of the right copy sits on its match in the left one.'
                : `The poses differ: matching vertices lie up to ${gap.toFixed(2)} units apart.`;

        const value = (axis: Axis) => angles[axis].toFixed(2);
        left.code.textContent = [
            'cubes3D()',
            ...AXES.map(
                (axis) => `    .rotate${axis.toUpperCase()}(${value(axis)}) // ${degrees(axis)}°`
            ),
            '    .data(block);',
            '// R = Rx · Ry · Rz, read from right to left'
        ].join('\n');

        right.heading.textContent = `The chain: ${rightOrder.join(', then ')}`;
        right.code.textContent = [
            ...rightOrder.map(
                (axis, k) =>
                    `const ${'abc'[k]} = transform(${k ? 'abc'[k - 1] : 'block'}, turn('${axis}', ${value(axis)}));`
            ),
            `// R = ${[...rightOrder]
                .reverse()
                .map((axis) => `R${axis}`)
                .join(' · ')}, read from right to left`
        ].join('\n');

        for (const slider of sliders) {
            slider.nextElementSibling!.textContent = `${slider.value}°`;
        }
    }

    /** Whether the copies agree, for the live region. */
    function agreement(): string {
        return gap < 1e-9
            ? `${named(order())}: the same pose as the renderer.`
            : `${named(order())}: the poses differ by up to ${gap.toFixed(2)} units.`;
    }

    /** Stops the play and shows the pose of the sliders again. */
    function stop(): void {
        play?.stop();
        play = undefined;
        progress = 3;
    }

    /** Sets the sliders and the order a preset names and puts the others back to their defaults. */
    function applyPreset(preset: Preset): void {
        stop();
        for (const slider of sliders) {
            slider.value = String(preset.angles[slider.name as Axis] ?? slider.defaultValue);
        }
        orderInputs.value = preset.order ?? 'xyz';
        note.textContent = `${preset.name}: ${preset.note}`;
        draw();
    }

    /**
     * Plays the three turns from the block at rest, each side in its own
     * order. With reduced motion every click shows the next stage instead.
     */
    function playTurns(): void {
        play?.stop();
        const steps = `the left copy turns around ${named(LIBRARY)}, the right one around ${named(order())}`;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            progress = (progress + 1) % 4;
            note.textContent = `${progress ? `Turn ${progress} of 3` : 'At rest'}: ${steps}.`;
            draw();
            return;
        }
        note.textContent = `Playing: ${steps}.`;
        play = timer((elapsed) => {
            progress = Math.min(3, elapsed / TURN);
            draw();
            if (progress === 3) {
                play?.stop();
            }
        });
    }

    form.addEventListener('input', () => {
        stop();
        draw();
    });
    // A slider that settles or a new order says whether the copies agree.
    form.addEventListener('change', () => {
        note.textContent = agreement();
    });
    form.querySelectorAll('.ro-presets button').forEach((button, k) => {
        button.addEventListener('click', () => applyPreset(PRESETS[k]));
    });
    form.querySelector('.ro-play')!.addEventListener('click', playTurns);

    draw();

    return () => {
        play?.stop();
        host.innerHTML = '';
        host.classList.remove('rotation-order');
    };
}
