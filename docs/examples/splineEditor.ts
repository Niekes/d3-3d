import { drag, leastIndex, pairs, pointer, range, select, sum } from 'd3';
import { catmullRom, lineStrips3D, lines3D, points3D, sort } from '../../index';
import type { Line, Point, Point3D } from '../../index';
import { pose, tiltOf } from './floorView';
import { rotatingFigure } from './rotatingFigure';
import { placeSegments } from './segments';

/*
 * A spline editor: a curve through six points above a floor. A screen drag
 * has two numbers and a point in space needs three, so a drag moves its point
 * in a plane through it: the plane that faces the camera, or with Shift the
 * upright plane that faces it and with Alt the floor plane. `unproject`
 * returns the point of that plane under the pointer. A drop line and a
 * shadow on the floor show where each point stands. The styles ship with
 * the module: the figure adds them to its host.
 */

// The editing space: x and z from -5 to 5, heights from 0 to 5. The screen
// y grows downwards, so the points rise towards a negative y.
const HALF = 5;
const TOP = 5;
// The scene turns around the middle of the editing space.
const VIEW = { scale: 34, center: { x: 0, y: -TOP / 2, z: 0 } };
// The samples of the curve between two points.
const STEPS = 20;
const KEY_STEP = 0.25;
// The handles in CSS pixels: the drawn point and the circle that takes the
// pointer, so a finger finds it.
const DOT = 6;
const HIT = 12;

/** A control point of the curve, with an id that joins it to its circle. */
type Knot = Point3D & { id: number };

/** A drag of a point: the plane it moves in and the grab offset from the pointer. */
type Grab = {
    knot: Knot;
    start: Point3D;
    normal: Point3D;
    offset: Point3D;
    mode: 'free' | 'height' | 'floor';
};

/** A gentle S above the floor, so the editor is not empty on the first visit. */
const START: Point3D[] = [
    { x: -4, y: -1, z: -3 },
    { x: -2.5, y: -3, z: 1 },
    { x: -0.5, y: -2, z: 3.5 },
    { x: 1, y: -4, z: 0 },
    { x: 3, y: -1.5, z: -2.5 },
    { x: 4, y: -3, z: 2.5 }
];

/** How the keys move the selected point, as a step in x, y and z. */
const MOVES: Record<string, [number, number, number]> = {
    ArrowLeft: [-1, 0, 0],
    ArrowRight: [1, 0, 0],
    ArrowUp: [0, 0, -1],
    ArrowDown: [0, 0, 1],
    PageUp: [0, -1, 0],
    PageDown: [0, 1, 0]
};

// The floor: a grid line at every unit of the editing space.
const GRID: Point3D[][] = range(-HALF, HALF + 1).flatMap((i) => [
    [
        { x: i, y: 0, z: -HALF },
        { x: i, y: 0, z: HALF }
    ],
    [
        { x: -HALF, y: 0, z: i },
        { x: HALF, y: 0, z: i }
    ]
]);

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** Keeps a point inside the editing space. */
function confine(point: Point3D): void {
    point.x = clamp(point.x, -HALF, HALF);
    point.y = clamp(point.y, -TOP, 0);
    point.z = clamp(point.z, -HALF, HALF);
}

/** The plane a drag takes for the held modifier: Shift the height, Alt the floor. */
const modeOf = (event: { shiftKey: boolean; altKey: boolean }): Grab['mode'] =>
    event.shiftKey ? 'height' : event.altKey ? 'floor' : 'free';

/**
 * The guide of a constrained drag: the upright line a Shift drag moves the
 * point along, or the outline of the plane at its height that an Alt drag
 * moves it in. A free drag has none.
 */
function guideOf(knot: Point3D, mode: Grab['mode']): Point3D[][] {
    if (mode === 'height') {
        return [
            [
                { ...knot, y: 0 },
                { ...knot, y: -TOP }
            ]
        ];
    }
    if (mode === 'floor') {
        const ring = [
            [-HALF, -HALF],
            [HALF, -HALF],
            [HALF, HALF],
            [-HALF, HALF],
            [-HALF, -HALF]
        ];
        return pairs(ring.map(([x, z]) => ({ x, y: knot.y, z })));
    }
    return [];
}

const describe = (knot: Point3D) =>
    `x ${knot.x.toFixed(2)}, height ${(-knot.y).toFixed(2)}, z ${knot.z.toFixed(2)}`;

/**
 * Mounts the figure into `host` and returns a function that removes it.
 */
export function mountSplineEditor(host: HTMLElement): () => void {
    // The state: every input writes it, and `render` reads it.
    let knots: Knot[] = [];
    let nextId = 0;
    let selected: number | undefined;
    let yaw = 0;
    let pitch = 0;
    let grab: Grab | undefined;
    // The previews: the curve sample under the pointer, where a double-click
    // adds a point, and the point under it with the held modifier.
    let ghost: number | undefined;
    let hovered: number | undefined;
    let held: Grab['mode'] = 'free';

    const lines = lines3D();
    const dots = points3D<Knot>();
    const strips = lineStrips3D();

    const { group, button } = rotatingFigure(
        host,
        'spline',
        'A curve through six points above a floor. Drag a point to move it, hold Shift to change only its height or Alt to move it only across the floor, double-click the curve to add a point and drag the background to rotate. Or focus it, pick a point with the bracket keys and move it with the arrow keys and Page Up and Page Down.',
        (dragYaw, dragPitch) => {
            yaw = dragYaw;
            pitch = dragPitch;
            render();
        }
    );

    host.classList.add('spline-editor');
    host.insertAdjacentHTML(
        'beforeend',
        `<style>${STYLES}</style>
        <div class="spline-controls">
            <p class="spline-readout"><span></span> <span></span> <span aria-live="polite"></span></p>
            <label><input type="checkbox" name="polygon" checked> show control polygon</label>
        </div>`
    );

    const svg = select(host).select<SVGSVGElement>('svg').attr('tabindex', 0);
    // Painted in this order, so the points always lie on top: an editor has
    // to keep its handles in reach.
    const gridGroup = group.append('g').attr('class', 'spline-grid');
    const depthGroup = group.append('g').attr('class', 'spline-depth');
    const curveGroup = group.append('g').attr('class', 'spline-curve');
    const previewGroup = group.append('g').attr('class', 'spline-preview');
    const pointGroup = group.append('g').attr('class', 'spline-points');
    const polygonPath = curveGroup.append('path').attr('class', 'polygon');
    const curvePath = curveGroup.append('path').attr('class', 'curve');
    // A wide stroke nobody sees, so a double-click does not have to hit the
    // curve to the pixel.
    const curveHit = curveGroup.append('path').attr('class', 'curve-hit');
    const polygon = host.querySelector('[name=polygon]') as HTMLInputElement;
    const [position, length, status] = Array.from(
        host.querySelectorAll<HTMLElement>('.spline-readout span')
    );

    /** Turns the scene and draws the floor, the depth cues, the curve and the points. */
    function render(): void {
        const tilt = tiltOf(pitch);
        pose(lines, VIEW, yaw, tilt);
        pose(dots, VIEW, yaw, tilt);
        pose(strips, VIEW, yaw, tilt);
        // The view box shrinks with a narrow page; the handles keep their
        // size on the screen.
        const unit = 960 / (svg.node()!.getBoundingClientRect().width || 960);

        gridGroup
            .selectAll<SVGLineElement, Line<Point3D>>('line')
            .data(lines.data(GRID))
            .join('line')
            .call(placeSegments);

        // A floor circle seen from above the floor is an ellipse squashed
        // by the sine of the tilt.
        depthGroup
            .selectAll('ellipse')
            .data(dots.data(knots.map((knot) => ({ ...knot, y: 0 }))))
            .join('ellipse')
            .attr('cx', (d) => d.projected.x)
            .attr('cy', (d) => d.projected.y)
            .attr('rx', DOT * unit)
            .attr('ry', DOT * unit * Math.sin(tilt));

        depthGroup
            .selectAll<SVGLineElement, Line<Point3D>>('line')
            .data(lines.data(knots.map((knot) => [knot, { ...knot, y: 0 }])))
            .join('line')
            .call(placeSegments);

        const samples = catmullRom(knots, STEPS);
        const [curve, controls] = strips.data([samples, knots]);
        curvePath.attr('d', strips.draw(curve));
        curveHit.attr('d', strips.draw(curve));
        polygonPath
            .attr('d', strips.draw(controls))
            .attr('display', polygon.checked ? null : 'none');

        // The ghost of the point a double-click adds, with its drop line, and
        // the guide of a Shift or Alt drag, shown before the drag and during it.
        const at = ghost === undefined ? undefined : samples[ghost];
        const drops = lines.data(at ? [[at, { ...at, y: 0 }]] : []);
        const guided = grab?.knot ?? knots.find((k) => k.id === hovered);
        previewGroup
            .selectAll<SVGLineElement, Line<Point3D>>('.drop')
            .data(drops)
            .join('line')
            .attr('class', 'drop')
            .call(placeSegments);
        previewGroup
            .selectAll<SVGLineElement, Line<Point3D>>('.guide')
            .data(lines.data(guided ? guideOf(guided, grab?.mode ?? held) : []))
            .join('line')
            .attr('class', 'guide')
            .call(placeSegments);
        previewGroup
            .selectAll('circle')
            .data(drops.map(([top]) => top))
            .join('circle')
            .attr('transform', (d) => `translate(${d.projected.x},${d.projected.y})`)
            .attr('r', DOT * unit);

        // Only the points are sorted, so a nearer one covers a farther one.
        pointGroup
            .selectAll<SVGGElement, Point<Knot>>('g')
            .data(dots.data(knots), (d) => d.id)
            .join((enter) =>
                enter
                    .append('g')
                    .call((g) => g.append('circle').attr('class', 'hit'))
                    .call((g) => g.append('circle').attr('class', 'dot'))
                    .call(dragKnot)
            )
            .attr('class', (d) => `spline-point${d.id === selected ? ' is-selected' : ''}`)
            .attr('transform', (d) => `translate(${d.projected.x},${d.projected.y})`)
            .call((g) => g.select('.hit').attr('r', HIT * unit))
            .call((g) => g.select('.dot').attr('r', DOT * unit))
            .sort(sort);

        const knot = knots.find((k) => k.id === selected);
        position.textContent = knot ? describe(knot) : 'no point selected';
        length.textContent = `· length ${sum(pairs(samples, (a, b) => Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z))).toFixed(2)}`;
    }

    /**
     * The normal of the plane a drag moves its point in. The plane that
     * faces the camera has the view direction as its normal, the ray
     * `unproject` follows. The upright plane that faces the camera drops
     * its height, and the floor plane points up.
     */
    function normalOf(mode: Grab['mode']): Point3D {
        if (mode === 'floor') {
            return { x: 0, y: 1, z: 0 };
        }
        const v = dots.viewDirection();
        return mode === 'height' ? { x: v.x, y: 0, z: v.z } : v;
    }

    // The drag on a point moves it. d3.drag stops the press from reaching
    // the drag of the figure, so moving a point never turns the scene. The
    // subject is the pointer, so the events carry it in the units of the
    // view box, the units `unproject` expects.
    const dragKnot = drag<SVGGElement, Point<Knot>>()
        .subject((event) => ({ x: event.x, y: event.y }))
        .on('start', (event, d) => {
            const knot = knots.find((k) => k.id === d.id)!;
            const mode = modeOf(event.sourceEvent);
            const start = { x: knot.x, y: knot.y, z: knot.z };
            const normal = normalOf(mode);
            // The offset keeps the point where it was grabbed, not under
            // the middle of the pointer.
            const hit = dots.unproject({ x: event.x, y: event.y }, start, normal) ?? start;
            const offset = { x: start.x - hit.x, y: start.y - hit.y, z: start.z - hit.z };
            grab = { knot, start, normal, offset, mode };
            selected = knot.id;
            render();
        })
        .on('drag', (event) => {
            const hit = grab && dots.unproject({ x: event.x, y: event.y }, grab.start, grab.normal);
            // A plane seen edge-on has no point under the pointer.
            if (!grab || !hit) {
                return;
            }
            const { knot, start, offset, mode } = grab;
            knot.x = mode === 'height' ? start.x : hit.x + offset.x;
            knot.y = mode === 'floor' ? start.y : hit.y + offset.y;
            knot.z = mode === 'height' ? start.z : hit.z + offset.z;
            confine(knot);
            render();
        })
        .on('end', () => {
            grab = undefined;
            render();
        });

    /** Adds a point on the curve after the knot `index` and selects it. */
    function insert(index: number, at: Point3D): void {
        const knot = { id: nextId++, x: at.x, y: at.y, z: at.z };
        knots.splice(index + 1, 0, knot);
        selected = knot.id;
        render();
    }

    /** Removes the knot `index` and selects its neighbor; the curve keeps two points. */
    function remove(index: number): void {
        if (knots.length > 2) {
            knots.splice(index, 1);
            selected = knots[Math.min(index, knots.length - 1)].id;
            render();
        }
    }

    function reset(): void {
        knots = START.map((p, id) => ({ ...p, id }));
        nextId = knots.length;
        selected = undefined;
        render();
    }

    /** The index of the curve sample nearest the pointer. */
    function sampleAt(event: MouseEvent): number {
        const [x, y] = pointer(event, group.node());
        const curve = strips.data([catmullRom(knots, STEPS)])[0];
        return leastIndex(curve, (p) => (p.projected.x - x) ** 2 + (p.projected.y - y) ** 2)!;
    }

    /** The id of the point an event targets, if any. */
    function knotAt(event: Event): number | undefined {
        const hit = (event.target as Element).closest('.spline-point');
        return hit ? select<Element, Point<Knot>>(hit).datum().id : undefined;
    }

    // A double-click on the curve adds a point at the sample nearest the
    // pointer, between the two knots of its segment: where the ghost is.
    curveHit.on('dblclick', (event: MouseEvent) => {
        const i = sampleAt(event);
        ghost = undefined;
        insert(Math.min(Math.floor(i / STEPS), knots.length - 2), catmullRom(knots, STEPS)[i]);
    });

    // A click selects the point under it, or clears the selection. d3.drag
    // swallows the click that ends a turn of the scene.
    svg.on('click', (event: MouseEvent) => {
        selected = knotAt(event);
        render();
    });

    // The pointer picks the previews while no button is down: the ghost over
    // the curve, the guide over a point.
    svg.on('pointermove', (event: PointerEvent) => {
        const free = !event.buttons;
        ghost = free && event.target === curveHit.node() ? sampleAt(event) : undefined;
        hovered = free ? knotAt(event) : undefined;
        held = modeOf(event);
        render();
    }).on('pointerleave', () => {
        ghost = hovered = undefined;
        render();
    });

    // Shift and Alt switch the guide while the pointer rests on a point. The
    // keys go to the page when the figure has no focus, so the window listens.
    function hold(event: KeyboardEvent): void {
        if (modeOf(event) !== held) {
            held = modeOf(event);
            render();
        }
    }
    window.addEventListener('keydown', hold);
    window.addEventListener('keyup', hold);

    // The brackets pick a point, the arrows and the page keys move it, A adds
    // one halfway along the curve to the next and Delete removes it.
    svg.on('keydown', (event: KeyboardEvent) => {
        // Cmd and Ctrl keep their browser shortcuts, such as Cmd+[ for back.
        // AltGr reports Ctrl too, and types the brackets on many layouts.
        if (event.metaKey || (event.ctrlKey && !event.getModifierState('AltGraph'))) {
            return;
        }
        const index = knots.findIndex((k) => k.id === selected);
        const knot = knots[index];
        const move = MOVES[event.key];
        const key = event.key.toLowerCase();
        let note = '';
        if (key === '[' || key === ']') {
            const step = key === ']' ? 1 : -1;
            const n = knots.length;
            selected = knots[index < 0 && step < 0 ? n - 1 : (index + step + n) % n].id;
            render();
        } else if (move && knot) {
            knot.x += move[0] * KEY_STEP;
            knot.y += move[1] * KEY_STEP;
            knot.z += move[2] * KEY_STEP;
            confine(knot);
            render();
        } else if (key === 'a' && knot) {
            const segment = Math.min(index, knots.length - 2);
            insert(segment, catmullRom(knots, STEPS)[segment * STEPS + STEPS / 2]);
        } else if ((key === 'delete' || key === 'backspace') && knot) {
            note = knots.length > 2 ? '' : ' The curve keeps at least two points.';
            remove(index);
        } else if (key === 'escape') {
            selected = undefined;
            render();
        } else {
            return;
        }
        event.preventDefault();
        const current = knots.findIndex((k) => k.id === selected);
        status.textContent =
            current < 0
                ? 'No point selected.'
                : `Point ${current + 1} of ${knots.length}: ${describe(knots[current])}.${note}`;
    });

    polygon.addEventListener('change', render);

    button.text('reset').on('click', () => {
        reset();
        status.textContent = 'Back to the starting curve.';
    });

    reset();

    return () => {
        window.removeEventListener('keydown', hold);
        window.removeEventListener('keyup', hold);
        host.innerHTML = '';
        host.classList.remove('spline-editor');
    };
}

// The styles of the figure, scoped by the class of its host. VitePress puts
// the class `dark` on the root element in dark mode.
const STYLES = `
.spline-editor {
    --se-ink: #1b1e21;
    --se-muted: #5f6468;
    --se-button: #f0f1f1;
    --se-line: #c4c7c9;
    --se-bg: #ffffff;
    --se-grid: #d5d8da;
    --se-curve: #2a78d6;
    --se-polygon: #8a8f93;
    --se-point: #eb6834;
    --se-shadow: rgb(27 30 33 / 0.25);
    margin: 1.5rem 0;
    position: relative;
    overflow: hidden;
    border: 1px solid var(--se-line);
    border-radius: 12px;
    background: var(--se-bg);
    color: var(--se-ink);
}

.dark .spline-editor {
    --se-ink: #e6e8e9;
    --se-muted: #9aa0a4;
    --se-button: #17181a;
    --se-line: #3d4144;
    --se-bg: #0c0d0e;
    --se-grid: #2c3033;
    --se-curve: #3987e5;
    --se-polygon: #7d8387;
    --se-point: #f07a48;
    --se-shadow: rgb(230 232 233 / 0.3);
}

.spline-editor .spline-svg {
    display: block;
    width: 100%;
    height: auto;
    cursor: grab;
    touch-action: none;
}

.spline-editor .spline-svg:active {
    cursor: grabbing;
}

/* The browser rings a focused SVG on every click: keep the ring for the keyboard. */
.spline-editor .spline-svg:focus {
    outline: none;
}

.spline-editor .spline-svg:focus-visible {
    outline: 2px solid var(--se-ink);
    outline-offset: -4px;
}

.spline-editor .spline-grid line {
    stroke: var(--se-grid);
    stroke-width: 0.75;
}

.spline-editor .spline-depth line,
.spline-editor .spline-preview .drop {
    stroke: var(--se-muted);
    stroke-width: 1;
    stroke-dasharray: 2 3;
}

.spline-editor .spline-depth ellipse {
    fill: var(--se-shadow);
}

.spline-editor .curve,
.spline-editor .polygon,
.spline-editor .curve-hit {
    fill: none;
    stroke-linejoin: round;
    stroke-linecap: round;
}

.spline-editor .curve {
    stroke: var(--se-curve);
    stroke-width: 3;
}

.spline-editor .polygon {
    stroke: var(--se-polygon);
    stroke-width: 1;
    stroke-dasharray: 6 4;
}

.spline-editor .curve-hit {
    stroke: transparent;
    stroke-width: 16;
}

.spline-editor .spline-preview {
    pointer-events: none;
}

.spline-editor .spline-preview circle {
    fill: var(--se-bg);
    fill-opacity: 0.7;
    stroke: var(--se-point);
    stroke-width: 2;
    stroke-dasharray: 3 2;
}

.spline-editor .spline-preview .guide {
    stroke: var(--se-point);
    stroke-width: 1.5;
    stroke-dasharray: 6 4;
}

.spline-editor .spline-point {
    cursor: move;
}

.spline-editor .spline-point .hit {
    fill: transparent;
}

.spline-editor .spline-point .dot {
    fill: var(--se-point);
    stroke: var(--se-bg);
    stroke-width: 2;
}

.spline-editor .spline-point.is-selected .dot {
    stroke: var(--se-ink);
    stroke-width: 3;
}

.spline-editor .spline-button {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    padding: 0.35rem 0.9rem;
    border: 1px solid var(--se-line);
    border-radius: 8px;
    background: var(--se-button);
    color: var(--se-ink);
    font-size: 0.85rem;
    cursor: pointer;
}

.spline-editor .spline-button:hover {
    border-color: var(--se-ink);
}

.spline-editor .spline-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 1.5rem;
    padding: 0.75rem;
    border-top: 1px solid var(--se-line);
    font-size: 0.85rem;
}

.spline-editor .spline-readout {
    flex: 1 1 16rem;
    margin: 0;
    color: var(--se-muted);
    font-variant-numeric: tabular-nums;
}

.spline-editor .spline-readout span:first-child,
.spline-editor .spline-readout span:last-child {
    color: var(--se-ink);
}

.spline-editor label {
    display: flex;
    align-items: center;
    gap: 6px;
}
`;
