import { format, range, select } from 'd3';
import type { Selection } from 'd3';
import { camera3D, lines3D, points3D } from '../../index';
import type { Line, Point, Point3D, ShapeInstance } from '../../index';
import { rotatingFigure, turnCamera } from './rotatingFigure';
import { placeSegments } from './segments';

/*
 * A coordinate explorer: three axes from -3 to 3 that meet at the world
 * origin, and one point among them. The sliders set its x, y and z, a walk
 * along the three axes leads from the origin to it, and the box of its drop
 * lines shows how deep it lies. A checkbox hands every renderer a y accessor
 * that negates y. The table reads the point off its transformed datum. The
 * styles live in this file too, so the file is all a copy needs.
 */

const ORIGIN = { x: 480, y: 250 };
const SCALE = 60;
// The axes run from -EXTENT to EXTENT. The name of an axis sits a little
// beyond its positive end, clear of the label of the last tick.
const EXTENT = 3;
const NAME_AT = 3.5;
// The half length of a tick, in model units.
const TICK = 0.1;
// A three-quarter view in which all three positive half-axes show.
const START_YAW = -Math.PI / 6;
const START_PITCH = Math.PI / 6;
// A key turns the view by 15°.
const TURN = Math.PI / 12;
// Below this many pixels per unit, the tick labels of an axis would pile up.
const MIN_UNIT = 20;

type Axis = 'x' | 'y' | 'z';

const AXES: Axis[] = ['x', 'y', 'z'];

/** An end of a segment, with the axis that colors the segment. The box has none. */
type End = Point3D & { axis?: Axis };

/** The anchor of a label: an integer on an axis, or the name past its end. */
type Label = Point3D & { axis: Axis; text: string; tick: boolean };

/** The point at `value` on `axis`. */
const along = (axis: Axis, value: number): Point3D => ({ x: 0, y: 0, z: 0, [axis]: value });

const segment = (axis: Axis, a: Point3D, b: Point3D): End[] => [
    { ...a, axis },
    { ...b, axis }
];

/** Whether a segment has a length: a zero coordinate leaves its leg out. */
const hasLength = ([a, b]: Point3D[]) => a.x !== b.x || a.y !== b.y || a.z !== b.z;

const INTEGERS = range(-EXTENT, EXTENT + 1).filter((i) => i !== 0);

// The world, built once: the axes, a cross at every integer of every axis and
// the anchors of the labels. The labels are data too, so a flipped y moves
// the +y label with its axis.
const AXIS_LINES: End[][] = AXES.map((axis) =>
    segment(axis, along(axis, -EXTENT), along(axis, EXTENT))
);
const TICKS: End[][] = AXES.flatMap((axis) =>
    INTEGERS.flatMap((i) =>
        AXES.filter((across) => across !== axis).map((across) => {
            const at = along(axis, i);
            return segment(axis, { ...at, [across]: -TICK }, { ...at, [across]: TICK });
        })
    )
);
const LABELS: Label[] = AXES.flatMap((axis) => [
    ...INTEGERS.map((i) => ({ ...along(axis, i), axis, text: format('d')(i), tick: true })),
    { ...along(axis, NAME_AT), axis, text: `+${axis}`, tick: false }
]);

/** The walk from the origin to `p`: along x, then along y, then along z. */
function walkTo(p: Point3D): End[][] {
    const onX = { x: p.x, y: 0, z: 0 };
    const onXY = { x: p.x, y: p.y, z: 0 };
    return [
        segment('x', { x: 0, y: 0, z: 0 }, onX),
        segment('y', onX, onXY),
        segment('z', onXY, p)
    ].filter(hasLength);
}

/**
 * The twelve edges of the box with the origin and `p` at opposite corners.
 * The three edges that end in `p` are its drop lines to the axis planes.
 */
function boxTo(p: Point3D): Point3D[][] {
    // Corner k takes the coordinates of `p` whose bits are set in k.
    const corner = (k: number) => ({ x: k & 1 ? p.x : 0, y: k & 2 ? p.y : 0, z: k & 4 ? p.z : 0 });
    return range(8)
        .flatMap((k) =>
            [1, 2, 4].filter((bit) => !(k & bit)).map((bit) => [corner(k), corner(k | bit)])
        )
        .filter(hasLength);
}

// The y accessors: the identity, and the one that negates y so that y points up.
const yDown = (d: Point3D) => d.y;
const yUp = (d: Point3D) => -d.y;

/** How the arrow keys turn the view, as a step of the yaw and the pitch. */
const TURNS: Record<string, [number, number]> = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1]
};

const fixed1 = format('.1f');
const fixed3 = format('.3f');
const degrees = (angle: number) => Math.round((angle * 180) / Math.PI);

/**
 * The styles, scoped to the class the figure puts on its host. The colors
 * are custom properties, and a `.dark` ancestor, as VitePress sets it, swaps
 * them for the dark theme. The axis colors are those of the projection
 * playground.
 */
const STYLE = `
    .coordinate-explorer {
        --ce-ink: #1b1e21;
        --ce-muted: #6b7075;
        --ce-line: #c4c7c9;
        --ce-bg: #ffffff;
        --ce-button: #f0f1f1;
        --ce-point: #d9480f;
        --ce-x: #d6336c;
        --ce-y: #2b8a3e;
        --ce-z: #1c7ed6;
        position: relative;
        margin: 1.5rem 0;
        overflow: hidden;
        border: 1px solid var(--ce-line);
        border-radius: 12px;
        background: var(--ce-bg);
        color: var(--ce-ink);
    }

    .dark .coordinate-explorer {
        --ce-ink: #e6e8e9;
        --ce-muted: #9aa0a6;
        --ce-line: #3d4144;
        --ce-bg: #0c0d0e;
        --ce-button: #17181a;
        --ce-point: #ff8a4c;
        --ce-x: #f06595;
        --ce-y: #51cf66;
        --ce-z: #4dabf7;
    }

    .coordinate-explorer .is-x {
        --axis: var(--ce-x);
    }

    .coordinate-explorer .is-y {
        --axis: var(--ce-y);
    }

    .coordinate-explorer .is-z {
        --axis: var(--ce-z);
    }

    .coordinate-explorer .coord-svg {
        display: block;
        width: 100%;
        height: auto;
        cursor: grab;
        touch-action: none;
    }

    .coordinate-explorer .coord-svg:active {
        cursor: grabbing;
    }

    /* The browser rings a focused SVG on every click: keep the ring for the keyboard. */
    .coordinate-explorer .coord-svg:focus {
        outline: none;
    }

    .coordinate-explorer .coord-svg:focus-visible {
        outline: 2px solid var(--ce-ink);
        outline-offset: -4px;
    }

    .coordinate-explorer .coord-box line {
        stroke: var(--ce-muted);
        stroke-width: 1;
        stroke-dasharray: 3 4;
        opacity: 0.7;
    }

    .coordinate-explorer .coord-axes line {
        stroke: var(--axis);
        stroke-width: 1.5;
    }

    .coordinate-explorer .coord-walk line {
        stroke: var(--axis);
        stroke-width: 4;
        stroke-linecap: round;
    }

    .coordinate-explorer .coord-point {
        fill: var(--ce-point);
        stroke: var(--ce-bg);
        stroke-width: 2;
    }

    /* A halo in the page color keeps a label legible over the lines. */
    .coordinate-explorer .coord-labels text {
        fill: var(--axis);
        stroke: var(--ce-bg);
        stroke-width: 3;
        stroke-linejoin: round;
        paint-order: stroke;
        font-size: 12px;
        pointer-events: none;
    }

    .coordinate-explorer .coord-labels .is-name {
        font-size: 15px;
        font-weight: 600;
    }

    .coordinate-explorer .coord-button {
        position: absolute;
        top: 0.75rem;
        right: 0.75rem;
        padding: 0.35rem 0.9rem;
        border: 1px solid var(--ce-line);
        border-radius: 8px;
        background: var(--ce-button);
        color: var(--ce-ink);
        font-size: 0.85rem;
        cursor: pointer;
    }

    .coordinate-explorer .coord-button:hover {
        border-color: var(--ce-ink);
    }

    .coordinate-explorer .coord-controls {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.75rem 1.5rem;
        padding: 0.75rem;
        border-top: 1px solid var(--ce-line);
        font-size: 0.85rem;
    }

    .coordinate-explorer .coord-controls label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .coordinate-explorer .coord-controls label b {
        color: var(--axis);
    }

    .coordinate-explorer .coord-controls input[type='range'] {
        accent-color: var(--axis);
    }

    .coordinate-explorer .coord-controls output {
        min-width: 2.5em;
        font-variant-numeric: tabular-nums;
    }

    .coordinate-explorer .coord-table {
        display: block;
        flex-basis: 100%;
        margin: 0;
        overflow-x: auto;
        border-collapse: collapse;
        font-size: 0.8rem;
        font-variant-numeric: tabular-nums;
    }

    .coordinate-explorer .coord-table th,
    .coordinate-explorer .coord-table td {
        padding: 0.2rem 0.45rem;
        border: 1px solid var(--ce-line);
        text-align: right;
        white-space: nowrap;
    }

    .coordinate-explorer .coord-table th[scope='row'] {
        text-align: left;
        font-weight: 400;
    }

    .coordinate-explorer .coord-table small,
    .coordinate-explorer .coord-status {
        color: var(--ce-muted);
    }

    .coordinate-explorer .coord-status {
        flex-basis: 100%;
        min-height: 1.5em;
        margin: 0;
    }

    @media (max-width: 640px) {
        .coordinate-explorer .coord-controls {
            flex-direction: column;
            align-items: stretch;
        }

        .coordinate-explorer .coord-controls input[type='range'] {
            flex: 1;
        }
    }`;

/**
 * Mounts the figure into `host` and returns a function that removes it.
 */
export function mountCoordinateExplorer(host: HTMLElement): () => void {
    // The state: every input writes it, and `render` reads it.
    const point: Point3D = { x: 2, y: 1.5, z: 2 };
    let flipped = false;
    let yaw = START_YAW;
    let pitch = START_PITCH;
    // The drag totals the scaffold reported last.
    let dragged = { yaw: 0, pitch: 0 };

    // Every renderer hangs on one camera, at the middle of the view box.
    const camera = camera3D().scale(SCALE).origin(ORIGIN);
    const lines3d = lines3D<End>().camera(camera);
    const dot3d = points3D().camera(camera);
    const labels3d = points3D<Label>().camera(camera);
    const renderers: ShapeInstance<any>[] = [lines3d, dot3d, labels3d];

    // The scaffold reports the total of every drag so far. The figure turns
    // by the change since the last report, so the keys and the front view
    // can turn it too.
    const { group, button } = rotatingFigure(
        host,
        'coord',
        'Three axes from −3 to 3 that meet at the origin, and one point with a walk from the origin to it along x, y and z. Drag the figure to turn it. With the figure focused, the arrow keys turn it and Home returns to the front view.',
        (dragYaw, dragPitch) => {
            turn(dragYaw - dragged.yaw, dragPitch - dragged.pitch);
            dragged = { yaw: dragYaw, pitch: dragPitch };
        }
    );

    host.classList.add('coordinate-explorer');
    host.insertAdjacentHTML(
        'beforeend',
        `<style>${STYLE}</style>
        <div class="coord-controls">
            ${AXES.map(
                (axis) =>
                    `<label class="is-${axis}"><b>${axis}</b> <input name="${axis}" type="range" min="${-EXTENT}" max="${EXTENT}" step="0.1" value="${point[axis]}"><output></output></label>`
            ).join('')}
            <label><input type="checkbox" name="flip"> y up: read y as −y</label>
            <table class="coord-table">
                <thead>
                    <tr><th></th><th>x</th><th>y</th><th>z</th></tr>
                </thead>
                <tbody>
                    <tr><th scope="row">data</th><td class="v"></td><td class="v"></td><td class="v"></td></tr>
                    <tr><th scope="row">read by the accessors</th><td class="v"></td><td class="v"></td><td class="v"></td></tr>
                    <tr><th scope="row">rotated</th><td class="v"></td><td class="v"></td><td><span class="v"></span> <small>depth, towards you</small></td></tr>
                    <tr><th scope="row">projected</th><td class="v"></td><td class="v"></td><td><small>dropped</small></td></tr>
                </tbody>
            </table>
            <p class="coord-status" aria-live="polite"></p>
        </div>`
    );

    const svg = select(host).select<SVGSVGElement>('svg').attr('tabindex', 0);
    // Painted in this order, so the point and the labels stay on top.
    const boxGroup = group.append('g').attr('class', 'coord-box');
    const axisGroup = group.append('g').attr('class', 'coord-axes');
    const walkGroup = group.append('g').attr('class', 'coord-walk');
    const dot = group.append('circle').attr('class', 'coord-point').attr('r', 7);
    const labelGroup = group.append('g').attr('class', 'coord-labels');
    const sliders = [...host.querySelectorAll<HTMLInputElement>('input[type=range]')];
    const flip = host.querySelector('[name=flip]') as HTMLInputElement;
    const cells = [...host.querySelectorAll<HTMLElement>('.coord-table .v')];
    const status = host.querySelector('.coord-status') as HTMLElement;

    /** Draws segments as lines into `g`, each colored by its axis. */
    function drawSegments(
        g: Selection<SVGGElement, unknown, null, undefined>,
        segments: End[][]
    ): void {
        g.selectAll<SVGLineElement, Line<End>>('line')
            .data(lines3d.data(segments))
            .join('line')
            .attr('class', (d) => (d[0].axis ? `is-${d[0].axis}` : null))
            .call(placeSegments);
    }

    /** Turns the camera and draws the box, the axes, the walk, the point, the labels and the table. */
    function render(): void {
        turnCamera(camera, yaw, pitch);

        drawSegments(boxGroup, boxTo(point));
        drawSegments(axisGroup, [...AXIS_LINES, ...TICKS]);
        drawSegments(walkGroup, walkTo(point));

        const [shown] = dot3d.data([point]);
        dot.attr('cx', shown.projected.x).attr('cy', shown.projected.y);

        // An axis that points almost at the viewer is short on the screen,
        // and its tick labels would pile up on the origin.
        const crowded = new Set(
            lines3d
                .data(AXIS_LINES)
                .filter(
                    ([a, b]) =>
                        Math.hypot(b.projected.x - a.projected.x, b.projected.y - a.projected.y) <
                        2 * EXTENT * MIN_UNIT
                )
                .map(([a]) => a.axis)
        );
        labelGroup
            .selectAll<SVGTextElement, Point<Label>>('text')
            .data(labels3d.data(LABELS))
            .join((enter) =>
                enter
                    .append('text')
                    .attr('class', (d) => `is-${d.axis}${d.tick ? '' : ' is-name'}`)
                    .text((d) => d.text)
            )
            .attr('x', (d) => d.projected.x + 6)
            .attr('y', (d) => d.projected.y - 6)
            .attr('display', (d) => (d.tick && crowded.has(d.axis) ? 'none' : null));

        // The rows of the table: the transformed datum keeps the data, the
        // accessors read it, and it carries its rotated and projected point.
        const { rotated: r, projected: p } = shown;
        const values = [
            ...[shown.x, shown.y, shown.z].map(fixed1),
            ...[dot3d.x()(shown), dot3d.y()(shown), dot3d.z()(shown)].map(fixed1),
            ...[r.x, r.y, r.z].map(fixed3),
            `${ORIGIN.x} + ${SCALE} × ${fixed3(r.x)} = ${fixed1(p.x)}`,
            `${ORIGIN.y} + ${SCALE} × ${fixed3(r.y)} = ${fixed1(p.y)}`
        ];
        cells.forEach((cell, k) => (cell.textContent = values[k]));
    }

    /** Turns the view, by the drag or by the keys. */
    function turn(dYaw: number, dPitch: number): void {
        yaw += dYaw;
        pitch += dPitch;
        render();
    }

    /** Turns the view back to zero on every angle, the frame of the library. */
    function frontView(): void {
        yaw = 0;
        pitch = 0;
        render();
        status.textContent = `front view: x right, ${flipped ? 'y up' : 'y down'}, z towards you`;
    }

    for (const slider of sliders) {
        slider.nextElementSibling!.textContent = fixed1(slider.valueAsNumber);
        slider.addEventListener('input', () => {
            point[slider.name as keyof Point3D] = slider.valueAsNumber;
            slider.nextElementSibling!.textContent = fixed1(slider.valueAsNumber);
            render();
        });
    }

    flip.addEventListener('change', () => {
        flipped = flip.checked;
        for (const renderer of renderers) {
            renderer.y(flipped ? yUp : yDown);
        }
        render();
    });

    button.text('front view').on('click', frontView);

    // The arrows turn the view by 15° and Home returns to the front view. A
    // key with Ctrl, ⌘ or Alt is left to the browser.
    svg.on('keydown', (event: KeyboardEvent) => {
        if (event.metaKey || event.ctrlKey || event.altKey) {
            return;
        }
        const step = TURNS[event.key];
        if (step) {
            turn(step[0] * TURN, step[1] * TURN);
            const { x, y } = dot3d.data([point])[0].projected;
            status.textContent = `yaw ${degrees(yaw)}°, pitch ${degrees(pitch)}°: the point is at ${fixed1(x)}, ${fixed1(y)} on the screen`;
        } else if (event.key === 'Home') {
            frontView();
        } else {
            return;
        }
        event.preventDefault();
    });

    render();

    return () => {
        host.innerHTML = '';
        host.classList.remove('coordinate-explorer');
    };
}
