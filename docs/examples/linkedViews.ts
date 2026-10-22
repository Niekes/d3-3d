import { brush, least, pointer, randomLcg, randomNormal, range, select } from 'd3';
import type { D3BrushEvent, Selection } from 'd3';
import { camera3D, lines3D, points3D, sort } from '../../index';
import type {
    Camera3DInstance,
    Line,
    Lines3DInstance,
    Point,
    Point3D,
    Points3DInstance
} from '../../index';
import { FLOOR_TURN, floorGrid } from './floorView';
import { dragRotate, turnCamera } from './rotatingFigure';
import { placeSegments } from './segments';

/*
 * Linked views: one set of samples in two views, a free view that turns on
 * drag and a top view that looks straight down like a map. Each view has its
 * own camera and its own renderers, and both draw the same data and the same
 * selection, a set of ids. A click picks samples in the free view, a brush
 * picks them in the top view, and the brush is a rectangle on the floor that
 * the free view draws too. The styles ship with the module: the figure adds
 * them to its host.
 */

// The floor: x and z from -5 to 5. The samples rise up to 3 above it; the
// screen y grows downwards, so heights are negative y.
const HALF = 5;
const TOP = 3;
// Both views have the same view box. The free view turns around the middle
// of the space the samples fill, and stays small enough to keep the whole
// floor in view at every turn.
const WIDTH = 480;
const HEIGHT = 420;
const FREE_SCALE = 26;
const TOP_SCALE = 38;
const CENTER: Point3D = { x: 0, y: -TOP / 2, z: 0 };
// A key turns the free view by 15°.
const TURN = Math.PI / 12;

// The samples in view box units: the dot, the dot under the pointer, and how
// far the pointer reaches for the nearest one.
const RADIUS = 4;
const HOVER_RADIUS = 7;
const HIT_RADIUS = 10;

// The arrow to the free camera on the map, in floor units, and the length of
// the flattened view direction below which the camera looks straight down.
const ARROW = 4;
const FLAT = 0.05;

const ORIGIN: Point3D = { x: 0, y: 0, z: 0 };
// The normal of the floor, the plane the brush lands on.
const UP: Point3D = { x: 0, y: 1, z: 0 };

// Fifty samples per cluster, scattered around its center by a seeded source,
// so the page looks the same on every load. The colors are CSS variables, so
// the dark mode steps them for its own surface.
const SEED = 0.27;
const PER_CLUSTER = 50;
const CLUSTERS = [
    { id: 'A', color: 'var(--lv-a)', x: -2.6, height: 1, z: -2 },
    { id: 'B', color: 'var(--lv-b)', x: 2.4, height: 2, z: -1.4 },
    { id: 'C', color: 'var(--lv-c)', x: 0.4, height: 1.5, z: 2.6 }
];

type Sample = Point3D & { id: string; cluster: string; color: string };

/** The brushed rectangle on the floor, in world x and z. */
type Area = { x0: number; x1: number; z0: number; z1: number };

/** One view: its camera, its renderers and the groups it draws into. */
type View = {
    svg: Selection<SVGSVGElement, unknown, null, undefined>;
    camera: Camera3DInstance;
    points: Points3DInstance<Sample>;
    lines: Lines3DInstance;
    floor: () => void;
    overlay: Selection<SVGGElement, unknown, null, undefined>;
    samples: Selection<SVGGElement, unknown, null, undefined>;
    shown: Point<Sample>[];
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const normal = randomNormal.source(randomLcg(SEED));
const spread = normal(0, 0.9);
const lift = normal(0, 0.5);

const SAMPLES: Sample[] = CLUSTERS.flatMap(({ id, color, ...center }) =>
    range(PER_CLUSTER).map((k) => ({
        id: `${id}${k + 1}`,
        cluster: id,
        color,
        x: clamp(center.x + spread(), -HALF, HALF),
        y: -clamp(center.height + lift(), 0, TOP),
        z: clamp(center.z + spread(), -HALF, HALF)
    }))
);

const within = ({ x0, x1, z0, z1 }: Area, d: Point3D) =>
    d.x >= x0 && d.x <= x1 && d.z >= z0 && d.z <= z1;

/** The four edges of the brushed rectangle, on the floor. */
function outline({ x0, x1, z0, z1 }: Area): Point3D[][] {
    const corners = [
        { x: x0, y: 0, z: z0 },
        { x: x1, y: 0, z: z0 },
        { x: x1, y: 0, z: z1 },
        { x: x0, y: 0, z: z1 }
    ];
    return corners.map((corner, i) => [corner, corners[(i + 1) % 4]]);
}

/**
 * The arrow from the middle of the floor towards a camera: its view
 * direction flattened onto the floor, with two barbs. None when the camera
 * looks straight down.
 */
function arrow({ x, z }: Point3D): Point3D[][] {
    const length = Math.hypot(x, z);
    if (length < FLAT) {
        return [];
    }
    const [dx, dz] = [x / length, z / length];
    const at = (along: number, across: number): Point3D => ({
        x: along * dx - across * dz,
        y: 0,
        z: along * dz + across * dx
    });
    const tip = at(ARROW, 0);
    return [
        [at(0, 0), tip],
        [tip, at(ARROW - 0.7, 0.4)],
        [tip, at(ARROW - 0.7, -0.4)]
    ];
}

/** The selection per cluster, in words. */
function tally(selected: Set<string>): string {
    const counts = CLUSTERS.map(
        ({ id }) => `${id} ${SAMPLES.filter((d) => d.cluster === id && selected.has(d.id)).length}`
    );
    return `${selected.size} of ${SAMPLES.length} selected: ${counts.join(', ')}.`;
}

/** The keys that turn the free view, as a step in yaw and pitch. */
const TURNS: Record<string, [number, number]> = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1]
};

/**
 * Mounts the figure into `host` and returns a function that removes it.
 */
export function mountLinkedViews(host: HTMLElement): () => void {
    // The state: every input writes it, and `render` draws both views from it.
    let selected = new Set<string>();
    let hovered: string | undefined;
    let area: Area | undefined;
    let yaw = 0;
    let pitch = 0;
    // The drag totals the scaffold reported last, the selection a brush
    // started from, and whether a brush is under way.
    let dragged = { yaw: 0, pitch: 0 };
    let base = new Set<string>();
    let brushing = false;

    host.classList.add('linked-views');
    host.innerHTML = `<style>${STYLES}</style>
        <div class="lv-views">
            <figure>
                <svg class="lv-free" viewBox="0 0 ${WIDTH} ${HEIGHT}" tabindex="0" role="img"
                  aria-label="150 samples in three clusters, seen from the side. Drag to rotate, click a sample to select it and shift-click to add or remove one. With the view focused, the arrow keys rotate, the bracket keys walk through the samples, Enter selects one and Escape clears the selection."></svg>
                <figcaption>free</figcaption>
            </figure>
            <figure>
                <svg class="lv-top" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img"
                  aria-label="The same samples seen from straight above. Brush a rectangle to select the samples inside it, with Shift to add them. The arrow points towards the camera of the free view."></svg>
                <figcaption>top</figcaption>
            </figure>
        </div>
        <div class="lv-controls">
            ${CLUSTERS.map(
                (d) =>
                    `<button type="button" value="${d.id}"><span class="swatch" style="background: ${d.color}"></span>cluster ${d.id}</button>`
            ).join('')}
            <button type="button" value="">clear</button>
            <p class="lv-readout"><span></span> <span aria-live="polite"></span></p>
        </div>`;

    const [readout, status] = Array.from(host.querySelectorAll<HTMLElement>('.lv-readout span'));

    /** A view in `svg`: the floor, the overlay and the samples, in this order, on `camera`. */
    function view(svg: SVGSVGElement, camera: Camera3DInstance): View {
        const root = select(svg);
        const floor = floorGrid(root, 'lv', camera, 2 * HALF);
        return {
            svg: root,
            camera,
            points: points3D<Sample>().camera(camera),
            lines: lines3D().camera(camera),
            floor,
            overlay: root.append('g').attr('class', 'lv-overlay'),
            samples: root.append('g').attr('class', 'lv-samples'),
            shown: []
        };
    }

    // Two cameras, one per view. The free camera turns around the middle of
    // the scene, which the origin puts in the middle of the view box. The
    // top camera is turned once, a quarter turn about x, and looks down.
    const free = view(
        host.querySelector<SVGSVGElement>('.lv-free')!,
        camera3D()
            .scale(FREE_SCALE)
            .origin({ x: WIDTH / 2 - CENTER.x * FREE_SCALE, y: HEIGHT / 2 - CENTER.y * FREE_SCALE })
            .rotationCenter(CENTER)
    );
    const top = view(
        host.querySelector<SVGSVGElement>('.lv-top')!,
        camera3D()
            .scale(TOP_SCALE)
            .origin({ x: WIDTH / 2, y: HEIGHT / 2 })
    );
    turnCamera(top.camera, 0, 0, { tilt: Math.PI / 2 });

    /** The selection draws as a ring, everything else steps back while there is one. */
    const state = (d: Sample) =>
        selected.has(d.id) ? 'is-selected' : selected.size ? 'is-dimmed' : null;

    /** Projects the samples and the overlay through the camera of one view and draws them. */
    function draw(v: View, overlay: Point3D[][]): void {
        v.floor();
        v.overlay
            .selectAll<SVGLineElement, Line<Point3D>>('line')
            .data(v.lines.data(overlay))
            .join('line')
            .call(placeSegments);

        v.shown = v.points.data(SAMPLES);
        v.samples
            .selectAll<SVGCircleElement, Point<Sample>>('circle')
            .data(v.shown, (d) => d.id)
            .join((enter) => enter.append('circle').style('fill', (d) => d.color))
            .attr('r', (d) => (d.id === hovered ? HOVER_RADIUS : RADIUS))
            .attr('class', state)
            .classed('is-hovered', (d) => d.id === hovered)
            .attr('cx', (d) => d.projected.x)
            .attr('cy', (d) => d.projected.y)
            .sort(sort);
    }

    /** Turns the free camera and draws both views: the brush on the free floor, the arrow on the map. */
    function render(): void {
        // The tilt stays within its limits, so the pitch never runs past them.
        pitch = turnCamera(free.camera, yaw, pitch, FLOOR_TURN) - FLOOR_TURN.tilt;
        draw(free, area ? outline(area) : []);
        draw(top, arrow(free.camera.viewDirection()));
        readout.textContent = tally(selected);
    }

    /** The sample nearest the pointer in one view, if it lies within reach. */
    function sampleAt(v: View, event: MouseEvent): Point<Sample> | undefined {
        const [x, y] = pointer(event, v.svg.node());
        const reach = (d: Point<Sample>) => Math.hypot(d.projected.x - x, d.projected.y - y);
        const hit = least(v.shown, reach);
        return hit && reach(hit) <= HIT_RADIUS ? hit : undefined;
    }

    /** The selection with one sample added or taken out. */
    function toggled(id: string): Set<string> {
        const next = new Set(selected);
        if (!next.delete(id)) {
            next.add(id);
        }
        return next;
    }

    // The brush covers the whole map. Its keys are off, so Shift does not
    // lock the rectangle to one axis and only adds to the selection.
    const mapBrush = brush<unknown>()
        .extent([
            [0, 0],
            [WIDTH, HEIGHT]
        ])
        .keyModifiers(false);
    const brushGroup = top.svg.insert('g', '.lv-samples').attr('class', 'lv-brush');

    /** Replaces the selection from anywhere but the brush, which it clears, and says so. */
    function choose(ids: Iterable<string>, message: string): void {
        selected = new Set(ids);
        area = undefined;
        brushGroup.call(mapBrush.move, null);
        status.textContent = `${message} ${tally(selected)}`;
        render();
    }

    /** Lights up a sample in both views, and redraws only on a change. */
    function hover(id: string | undefined): void {
        if (id !== hovered) {
            hovered = id;
            render();
        }
    }

    // The corners of the brush go back onto the floor through the top camera,
    // so the selection compares world x and z, the numbers the free view
    // draws the rectangle with. The top camera looks straight down, so the
    // floor is never edge-on. A brush that `choose` clears has no source
    // event and changes nothing.
    mapBrush.on('start brush end', (event: D3BrushEvent<unknown>) => {
        if (!event.sourceEvent) {
            return;
        }
        if (event.type === 'start') {
            base = event.sourceEvent.shiftKey ? selected : new Set();
        }
        brushing = event.type !== 'end';
        const corners = event.selection as [number, number][] | null;
        const [a, b] = (corners ?? []).map(([x, y]) => top.camera.unproject({ x, y }, ORIGIN, UP)!);
        const rect = a && {
            x0: Math.min(a.x, b.x),
            x1: Math.max(a.x, b.x),
            z0: Math.min(a.z, b.z),
            z1: Math.max(a.z, b.z)
        };
        const inside = rect ? SAMPLES.filter((d) => within(rect, d)).map((d) => d.id) : [];
        area = rect;
        selected = new Set([...base, ...inside]);
        if (!brushing) {
            status.textContent = `Brushed ${inside.length} samples. ${tally(selected)}`;
        }
        render();
    });
    brushGroup.call(mapBrush);

    // The scaffold reports the total of every drag so far. The free view
    // turns by the change since the last report, so the keys can turn it too.
    free.svg.call(
        dragRotate((dragYaw, dragPitch) => {
            yaw += dragYaw - dragged.yaw;
            pitch += dragPitch - dragged.pitch;
            dragged = { yaw: dragYaw, pitch: dragPitch };
            render();
        })
    );

    // A click picks the sample in reach, Shift adds it or takes it out, and a
    // click on nothing clears the selection. d3.drag swallows the click that
    // ends a turn, so turning never selects.
    free.svg.on('click', (event: MouseEvent) => {
        const id = sampleAt(free, event)?.id;
        if (event.shiftKey && !id) {
            return;
        }
        if (!id) {
            choose([], 'Selection cleared.');
        } else if (event.shiftKey) {
            choose(toggled(id), `${id} ${selected.has(id) ? 'removed' : 'added'}.`);
        } else {
            choose([id], `${id} selected.`);
        }
    });

    // The hover reads only the pointer, so the brush keeps its events. A held
    // button turns the free view or draws the brush, and lights up nothing.
    for (const v of [free, top]) {
        v.svg
            .on('pointermove', (event: PointerEvent) =>
                hover(event.buttons ? undefined : sampleAt(v, event)?.id)
            )
            .on('pointerleave', () => hover(undefined));
    }

    // The arrows turn the free view, the brackets walk a cursor through the
    // samples, which is the hovered one, Enter or Space selects it or takes it
    // out, and Escape clears the selection.
    free.svg.on('keydown', (event: KeyboardEvent) => {
        // Ctrl, ⌘ and Alt with a named key keep their browser shortcuts, such
        // as Alt+← for back. AltGr and ⌥ type the brackets on many layouts.
        if (
            event.metaKey ||
            (event.ctrlKey && !event.getModifierState('AltGraph')) ||
            (event.altKey && event.key.length > 1)
        ) {
            return;
        }
        const turn = TURNS[event.key];
        if (turn) {
            yaw += turn[0] * TURN;
            pitch += turn[1] * TURN;
            render();
        } else if (event.key === '[' || event.key === ']') {
            // From no cursor, ] starts at the first sample and [ at the last.
            const n = SAMPLES.length;
            const step = event.key === ']' ? 1 : -1;
            const i = SAMPLES.findIndex((d) => d.id === hovered);
            const next = SAMPLES[i < 0 && step < 0 ? n - 1 : (i + step + n) % n];
            hover(next.id);
            status.textContent = `${next.id}, cluster ${next.cluster}, ${selected.has(next.id) ? 'selected' : 'not selected'}. ${tally(selected)}`;
        } else if ((event.key === 'Enter' || event.key === ' ') && hovered) {
            choose(toggled(hovered), `${hovered} ${selected.has(hovered) ? 'removed' : 'added'}.`);
        } else if (event.key === 'Escape') {
            choose([], 'Selection cleared.');
        } else {
            return;
        }
        event.preventDefault();
    });

    // A cluster button selects its cluster, the clear button, which has no
    // cluster, clears the selection and the brush.
    host.querySelector('.lv-controls')!.addEventListener('click', (event) => {
        const button = (event.target as Element).closest('button');
        if (button) {
            const id = button.value;
            choose(
                SAMPLES.filter((d) => d.cluster === id).map((d) => d.id),
                id ? `Cluster ${id} selected.` : 'Selection cleared.'
            );
        }
    });

    render();

    return () => {
        // A brush under way listens on the window: a mouseup ends it, so it
        // never reaches for a view that is gone.
        if (brushing) {
            window.dispatchEvent(new MouseEvent('mouseup', { view: window }));
        }
        host.innerHTML = '';
        host.classList.remove('linked-views');
    };
}

// The styles of the figure, scoped by the class of its host. VitePress puts
// the class `dark` on the root element in dark mode.
const STYLES = `
.linked-views {
    --lv-ink: #1b1e21;
    --lv-muted: #5f6468;
    --lv-button: #f0f1f1;
    --lv-line: #c4c7c9;
    --lv-bg: #ffffff;
    --lv-floor: #eef0f1;
    --lv-grid: #c9cdd0;
    --lv-camera: #8a5cd6;
    --lv-a: #2a78d6;
    --lv-b: #eb6834;
    --lv-c: #1baf7a;
    margin: 1.5rem 0;
    overflow: hidden;
    border: 1px solid var(--lv-line);
    border-radius: 12px;
    background: var(--lv-bg);
    color: var(--lv-ink);
}

.dark .linked-views {
    --lv-ink: #e6e8e9;
    --lv-muted: #9aa0a4;
    --lv-button: #17181a;
    --lv-line: #3d4144;
    --lv-bg: #0c0d0e;
    --lv-floor: #1a1c1e;
    --lv-grid: #3a3f43;
    --lv-camera: #9a70e0;
    --lv-a: #3987e5;
    --lv-b: #d95926;
    --lv-c: #199e70;
}

/* Two views side by side, stacked on a phone. */
.linked-views .lv-views {
    display: grid;
    grid-template-columns: 1fr 1fr;
}

.linked-views figure {
    margin: 0;
    min-width: 0;
}

.linked-views figure + figure {
    border-left: 1px solid var(--lv-line);
}

.linked-views figcaption {
    padding: 0 0.75rem 0.5rem;
    color: var(--lv-muted);
    font-size: 0.85rem;
}

@media (max-width: 640px) {
    .linked-views .lv-views {
        grid-template-columns: 1fr;
    }

    .linked-views figure + figure {
        border-left: 0;
        border-top: 1px solid var(--lv-line);
    }
}

.linked-views svg {
    display: block;
    width: 100%;
    height: auto;
    touch-action: none;
}

.linked-views .lv-free {
    cursor: grab;
}

.linked-views .lv-free:active {
    cursor: grabbing;
}

.linked-views .lv-top {
    cursor: crosshair;
}

/* The browser rings a focused SVG on every click: keep the ring for the keyboard. */
.linked-views .lv-free:focus {
    outline: none;
}

.linked-views .lv-free:focus-visible {
    outline: 2px solid var(--lv-ink);
    outline-offset: -4px;
}

.linked-views .floor {
    fill: var(--lv-floor);
}

.linked-views .lv-floor line {
    stroke: var(--lv-grid);
    stroke-width: 0.75;
}

/* The brushed rectangle on the free floor, and the arrow to the free camera on the map. */
.linked-views .lv-overlay line {
    stroke: var(--lv-ink);
    stroke-width: 1.5;
    stroke-dasharray: 5 3;
}

.linked-views .lv-top .lv-overlay line {
    stroke: var(--lv-camera);
    stroke-width: 2.5;
    stroke-linecap: round;
    stroke-dasharray: none;
}

.linked-views .lv-brush .selection {
    fill: var(--lv-ink);
    fill-opacity: 0.08;
    stroke: var(--lv-ink);
    stroke-dasharray: 5 3;
}

/* The map's samples let the pointer through to the brush. */
.linked-views .lv-top .lv-samples {
    pointer-events: none;
}

/* A ring in the surface color keeps overlapping samples apart. */
.linked-views .lv-samples circle {
    stroke: var(--lv-bg);
    stroke-width: 1;
}

.linked-views .lv-samples .is-selected {
    stroke: var(--lv-ink);
    stroke-width: 2;
}

.linked-views .lv-samples .is-dimmed {
    opacity: 0.25;
}

.linked-views .lv-samples .is-hovered {
    stroke: var(--lv-ink);
    stroke-width: 2;
    opacity: 1;
}

.linked-views .lv-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    border-top: 1px solid var(--lv-line);
    font-size: 0.85rem;
}

.linked-views button {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.35rem 0.9rem;
    border: 1px solid var(--lv-line);
    border-radius: 8px;
    background: var(--lv-button);
    color: var(--lv-ink);
    cursor: pointer;
}

.linked-views button:hover {
    border-color: var(--lv-ink);
}

.linked-views .swatch {
    width: 0.6rem;
    height: 0.6rem;
    border-radius: 50%;
}

.linked-views .lv-readout {
    flex: 1 1 16rem;
    margin: 0 0 0 1rem;
    color: var(--lv-muted);
    font-variant-numeric: tabular-nums;
}

.linked-views .lv-readout span:first-child {
    color: var(--lv-ink);
}
`;
