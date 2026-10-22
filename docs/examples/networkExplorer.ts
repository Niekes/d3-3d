import { groups, least, pointer, randomLcg, randomNormal, range, select } from 'd3';
import { camera3D, lines3D, points3D, sort } from '../../index';
import type { Line, Point, Point3D } from '../../index';
import { rotatingFigure } from './rotatingFigure';
import { placeSegments } from './segments';

/*
 * A network explorer: nodes in three spatial clusters, linked to their
 * nearest neighbors and by a few bridges between the clusters. points3D
 * draws the nodes and lines3D the edges. Both renderers hang on one camera,
 * so every edge ends on its two nodes.
 */

const ORIGIN = { x: 480, y: 250 };
const SCALE = 190;
const START_YAW = Math.PI / 6;
const START_TILT = Math.PI / 12;
const RADIUS = 5;
const SELECTED_RADIUS = 8;
// The pointer catches the nearest node within this many units of the viewBox.
const HIT_RADIUS = 18;

// The zoom multiplies the scale of the camera. A pinch on a trackpad, or
// a wheel turned with ctrl held, zooms; a plain wheel still scrolls the page.
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_SPEED = 0.01;

// Fifteen nodes per cluster, scattered around its center by a seeded source,
// so the network is the same on every load.
const SEED = 0.42;
const PER_GROUP = 15;
const SPREAD = 0.2;
// Every node links to its two nearest neighbors in its cluster, and every
// two clusters are joined by their two closest pairs of nodes.
const NEAREST = 2;
const BRIDGES = 2;

type Node = Point3D & { id: string; group: string };

type Edge = [Node, Node];

// The colors are CSS variables, so the dark mode steps them for its own surface.
const GROUPS = [
    { id: 'A', color: 'var(--ne-a)', center: { x: -0.7, y: -0.3, z: -0.3 } },
    { id: 'B', color: 'var(--ne-b)', center: { x: 0.7, y: -0.4, z: -0.2 } },
    { id: 'C', color: 'var(--ne-c)', center: { x: 0, y: 0.5, z: 0.6 } }
];

const jitter = randomNormal.source(randomLcg(SEED))(0, SPREAD);

const NODES: Node[] = GROUPS.flatMap(({ id, center }) =>
    range(PER_GROUP).map((k) => ({
        id: `${id}${k + 1}`,
        group: id,
        x: center.x + jitter(),
        y: center.y + jitter(),
        z: center.z + jitter()
    }))
);

const distance = ([a, b]: Edge) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

// ponytail: every pair of nodes, O(n²); fine for 45 nodes, a k-d tree if the network grows.
const PAIRS: Edge[] = NODES.flatMap((a, k) => NODES.slice(k + 1).map((b): Edge => [a, b])).sort(
    (p, q) => distance(p) - distance(q)
);

// The nodes are made cluster by cluster, so a pair across two clusters
// always names them in the same order.
const EDGES: Edge[] = [
    ...new Set([
        ...NODES.flatMap((node) =>
            PAIRS.filter((p) => p.includes(node) && p[0].group === p[1].group).slice(0, NEAREST)
        ),
        ...groups(
            PAIRS.filter(([a, b]) => a.group !== b.group),
            ([a, b]) => a.group + b.group
        ).flatMap(([, pairs]) => pairs.slice(0, BRIDGES))
    ])
];

const NEIGHBORS = new Map(NODES.map((node) => [node.id, new Set<string>()]));
for (const [a, b] of EDGES) {
    NEIGHBORS.get(a.id)!.add(b.id);
    NEIGHBORS.get(b.id)!.add(a.id);
}

// The styles travel with the figure, so the module is all there is to copy.
// Every rule is scoped to the host, and the dark mode follows a `dark` class
// on an ancestor, the class VitePress sets on <html>.
const STYLES = `
.network-explorer {
    --ne-ink: #1b1e21;
    --ne-edge: #888888;
    --ne-a: #2a78d6;
    --ne-b: #eb6834;
    --ne-c: #1baf7a;
    --ne-button: #f0f1f1;
    --ne-button-line: #c4c7c9;
    --ne-bg: #ffffff;
    margin: 1.5rem 0;
    position: relative;
    overflow: hidden;
    border: 1px solid var(--ne-button-line);
    border-radius: 12px;
    background: var(--ne-bg);
    color: var(--ne-ink);
}

/* The dark mode steps the same three hues for its own surface. */
.dark .network-explorer {
    --ne-ink: #e6e8e9;
    --ne-a: #3987e5;
    --ne-b: #d95926;
    --ne-c: #199e70;
    --ne-button: #17181a;
    --ne-button-line: #3d4144;
    --ne-bg: #0c0d0e;
}

.network-explorer .network-svg {
    display: block;
    width: 100%;
    height: auto;
    cursor: grab;
    touch-action: none;
}

/* A node within reach of the pointer can be clicked. */
.network-explorer .network-svg.is-pointing {
    cursor: pointer;
}

.network-explorer .network-svg:active {
    cursor: grabbing;
}

.network-explorer .network-edges line {
    stroke: var(--ne-edge);
    stroke-opacity: 0.6;
    stroke-width: 1;
}

.network-explorer .network-edges line.is-bridge {
    stroke-dasharray: 4 3;
}

/* The node within reach and its edges light up, dimmed or not. */
.network-explorer .network-edges line.is-hovered {
    stroke: var(--ne-ink);
    stroke-opacity: 1;
    stroke-width: 1.5;
    opacity: 1;
}

.network-explorer .network-edges line.is-active {
    stroke: var(--ne-ink);
    stroke-opacity: 1;
    stroke-width: 2;
}

/* A ring in the surface color keeps overlapping nodes apart. */
.network-explorer .network-nodes circle {
    stroke: var(--ne-bg);
    stroke-width: 1.5;
}

.network-explorer .network-nodes circle.is-hovered {
    stroke: var(--ne-ink);
    stroke-width: 2;
    opacity: 1;
}

.network-explorer .network-nodes circle.is-selected {
    stroke: var(--ne-ink);
    stroke-width: 2.5;
}

.network-explorer .is-dimmed {
    opacity: 0.2;
}

.network-explorer .network-button {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    padding: 0.35rem 0.9rem;
    border: 1px solid var(--ne-button-line);
    border-radius: 8px;
    background: var(--ne-button);
    color: var(--ne-ink);
    font-size: 0.85rem;
    cursor: pointer;
}

.network-explorer .network-button:hover {
    border-color: var(--ne-ink);
}

.network-explorer .network-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 1.5rem;
    padding: 0.75rem;
    border-top: 1px solid var(--ne-button-line);
    font-size: 0.85rem;
}

.network-explorer .network-controls label {
    display: flex;
    align-items: center;
    gap: 0.4rem;
}

.network-explorer .network-controls select {
    padding: 0.15rem 0.4rem;
    border: 1px solid var(--ne-button-line);
    border-radius: 6px;
    background: var(--ne-button);
    color: var(--ne-ink);
}

.network-explorer .network-controls label output {
    min-width: 2.5em;
    font-variant-numeric: tabular-nums;
}

/* The readout takes the room the other controls leave. */
.network-explorer .network-readout {
    flex: 1 1 16rem;
}

.network-explorer fieldset {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 0;
    padding: 0;
    border: 0;
}

/* A floated legend leaves the border of the fieldset and lines up with the boxes. */
.network-explorer legend {
    float: left;
    padding: 0;
}

.network-explorer .swatch {
    width: 0.6rem;
    height: 0.6rem;
    border-radius: 50%;
}`;

/**
 * Mounts the figure into `host` and returns a function that removes it.
 */
export function mountNetworkExplorer(host: HTMLElement): () => void {
    host.classList.add('network-explorer');

    // An edge is a pair of the same node objects that points3D draws, so on
    // one camera both renderers project a node to the same pixel.
    const camera = camera3D().scale(SCALE).origin(ORIGIN);
    const nodes3d = points3D<Node>().camera(camera);
    const edges3d = lines3D<Node>().camera(camera);

    let selected: Node | undefined;
    let hovered: string | undefined;
    let shown: Point<Node>[] = [];
    let hidden = new Set<string>();
    let dragYaw = 0;
    let dragPitch = 0;

    const { group, button } = rotatingFigure(
        host,
        'network',
        'A network of 45 nodes in three clusters. Drag the figure to rotate it, click a node to highlight its neighbors.',
        (yaw, pitch) => {
            dragYaw = yaw;
            dragPitch = pitch;
            drawScene();
        }
    );

    const edgeGroup = group.append('g').attr('class', 'network-edges');
    const nodeGroup = group.append('g').attr('class', 'network-nodes');

    host.insertAdjacentHTML(
        'beforeend',
        `<style>${STYLES}</style>
        <div class="network-controls">
            <fieldset>
                <legend>clusters</legend>
                ${GROUPS.map(
                    (d) =>
                        `<label><input type="checkbox" value="${d.id}" checked><span class="swatch" style="background: ${d.color}"></span>${d.id}</label>`
                ).join('')}
            </fieldset>
            <label>node <select name="node"></select></label>
            <label>zoom <input name="zoom" type="range" min="${ZOOM_MIN}" max="${ZOOM_MAX}" step="0.05" value="1"><output>1.0×</output></label>
            <output class="network-readout" aria-live="polite"></output>
        </div>`
    );

    const boxes = [...host.querySelectorAll<HTMLInputElement>('fieldset input')];
    const picker = host.querySelector('select')!;
    const zoomInput = host.querySelector<HTMLInputElement>('[name=zoom]')!;
    const readout = host.querySelector<HTMLOutputElement>('.network-readout')!;
    const svg = host.querySelector('svg')!;
    const byId = new Map(NODES.map((d) => [d.id, d]));

    const color = (id: string) => GROUPS.find((d) => d.id === id)!.color;
    const isShown = (node: Node) => !hidden.has(node.group);

    /** The selected node and its neighbors stay in front, every other node steps back. */
    function nodeState(d: Node): string | null {
        if (!selected || NEIGHBORS.get(selected.id)!.has(d.id)) {
            return null;
        }
        return d.id === selected.id ? 'is-selected' : 'is-dimmed';
    }

    /** The edges of the selected node come forward, every other edge steps back. */
    const edgeState = ([a, b]: Line<Node>) =>
        !selected ? null : a.id === selected.id || b.id === selected.id ? 'is-active' : 'is-dimmed';

    /** Turns the camera by the drag and draws the shown nodes and the edges between them. */
    function drawScene(): void {
        camera.rotateY(dragYaw + START_YAW).rotateX(-dragPitch - START_TILT);

        // The edges lie under the nodes, so an edge never covers its own ends.
        edgeGroup
            .selectAll<SVGLineElement, Line<Node>>('line')
            .data(
                edges3d.data(EDGES.filter((edge) => edge.every(isShown))),
                (d) => `${d[0].id}-${d[1].id}`
            )
            .join('line')
            .call(placeSegments)
            .attr('class', edgeState)
            .classed('is-bridge', (d) => d[0].group !== d[1].group)
            .classed('is-hovered', (d) => d[0].id === hovered || d[1].id === hovered);

        shown = nodes3d.data(NODES.filter(isShown));
        nodeGroup
            .selectAll<SVGCircleElement, Point<Node>>('circle')
            .data(shown, (d) => d.id)
            .join((enter) =>
                enter.append('circle').call((circle) => circle.append('title').text((d) => d.id))
            )
            .attr('cx', (d) => d.projected.x)
            .attr('cy', (d) => d.projected.y)
            .attr('r', (d) =>
                d.id === selected?.id || d.id === hovered ? SELECTED_RADIUS : RADIUS
            )
            .attr('class', nodeState)
            .classed('is-hovered', (d) => d.id === hovered)
            .style('fill', (d) => color(d.group))
            .sort(sort);
    }

    /** Reads the checked clusters, then brings the picker, the readout and the scene in line. */
    function update(): void {
        hidden = new Set(boxes.filter((box) => !box.checked).map((box) => box.value));
        if (selected && hidden.has(selected.group)) {
            selected = undefined;
        }

        select(picker)
            .selectAll<HTMLOptionElement, string>('option')
            .data(['', ...NODES.filter(isShown).map((d) => d.id)])
            .join('option')
            .attr('value', (id) => id)
            .text((id) => id || 'none');
        picker.value = selected?.id ?? '';

        const neighbors = selected ? [...NEIGHBORS.get(selected.id)!] : [];
        readout.textContent = selected
            ? `${selected.id} in cluster ${selected.group}, ${neighbors.length} neighbors: ${neighbors.join(', ')}`
            : 'Click a node or pick one to show its neighbors.';

        drawScene();
    }

    function choose(id: string): void {
        selected = byId.get(id);
        update();
    }

    /**
     * Zooms by scaling the camera around the origin: the nodes spread
     * apart, keep their size, and the edges follow them.
     */
    function zoomTo(zoom: number): void {
        const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
        camera.scale(SCALE * clamped);
        zoomInput.valueAsNumber = clamped;
        zoomInput.nextElementSibling!.textContent = `${clamped.toFixed(1)}×`;
        drawScene();
    }

    /** The shown node nearest to the pointer, if it lies within reach. */
    function nodeAt(event: MouseEvent): Point<Node> | undefined {
        const [x, y] = pointer(event, svg);
        const reach = (d: Point<Node>) => Math.hypot(d.projected.x - x, d.projected.y - y);
        const node = least(shown, reach);
        return node && reach(node) <= HIT_RADIUS ? node : undefined;
    }

    /** Lights up the node within reach and its edges, and redraws only on a change. */
    function hover(id: string | undefined): void {
        if (id !== hovered) {
            hovered = id;
            svg.classList.toggle('is-pointing', id !== undefined);
            drawScene();
        }
    }

    // A held button is a drag, which turns the nodes away from the pointer.
    svg.addEventListener('pointermove', (event) =>
        hover(event.buttons ? undefined : nodeAt(event)?.id)
    );
    svg.addEventListener('pointerleave', () => hover(undefined));
    // d3-drag swallows the click that ends a drag, so rotating never selects.
    // A tap has no hover before it, so the click looks for its own node.
    svg.addEventListener('click', (event) => choose(nodeAt(event)?.id ?? ''));
    // The camera keeps the zoom: its scale over SCALE.
    svg.addEventListener(
        'wheel',
        (event) => {
            if (!event.ctrlKey) {
                return;
            }
            event.preventDefault();
            zoomTo((camera.scale() / SCALE) * Math.exp(-event.deltaY * ZOOM_SPEED));
        },
        { passive: false }
    );
    zoomInput.addEventListener('input', () => zoomTo(zoomInput.valueAsNumber));
    picker.addEventListener('change', () => choose(picker.value));
    host.querySelector('fieldset')!.addEventListener('change', update);
    button.text('reset').on('click', () => {
        for (const box of boxes) {
            box.checked = true;
        }
        zoomTo(1);
        choose('');
    });

    update();

    return () => {
        host.innerHTML = '';
    };
}
