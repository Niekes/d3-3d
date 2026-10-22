import { randomLcg, range, select, shuffler } from 'd3';
import { box, camera3D, cubes3D, sort } from '../../index';
import type { Cube, CubeFace, Point3D } from '../../index';
import { joinFaces } from './cubeFaces';
import { floorGrid, pose } from './floorView';
import { playback, rotatingFigure } from './rotatingFigure';

/*
 * A sorting sculpture: 24 columns in a ring on a floor, as high as their
 * values, that a sorting algorithm puts in order one comparison or swap at a
 * time. Every algorithm is a generator of steps, so stepping, playing and
 * counting read the same sequence. The columns are joined by the id of their
 * value, so a swap moves the same two elements and the tween only turns them
 * to their new slots. They stand on one floor and are painted by the depth
 * of their footprint. The styles ship with the module: the figure adds them
 * to its host.
 */

// The columns, the height of one value, the radius of the ring, the side of
// a footprint and the side of the floor, in world units.
const N = 24;
const UNIT = 0.25;
const RADIUS = 6;
const SIDE = 0.8;
const FLOOR = 16;
// How far the two columns of a swap leave the ring to pass each other and
// the columns in between. The circles around two footprints then never
// meet, so the depth of their centres still tells which one is in front.
const LANE = 1.2;
// The scene turns around the middle of the space the tallest column fills.
// The camera stays above the floor, so the floor is behind every column and
// needs no place in the sort.
const VIEW = { scale: 21, center: { x: 0, y: (-N * UNIT) / 2, z: 0 } };
const SEED = 24;
// The longest swap, in milliseconds, and the speed in steps per second
// above which a swap jumps.
const SWAP_DURATION = 250;
const JUMP_SPEED = 15;

/** A column: the id of its value, the value, and where it shows on the floor. */
type Item = { id: string; value: number; angle: number; radius: number };

/** A step that touches two indices. A swap is yielded once it is made. */
type Move = { kind: 'compare' | 'swap'; i: number; j: number };

/** One step of an algorithm: a move, or an index that has reached its final place. */
type Step = Move | { kind: 'settle'; i: number };

/** One vertex of a column: a point that carries the id, the value and the slot of its column. */
type ColumnVertex = Point3D & { id: string; value: number; slot: number };

/** One column after the projection, with the centroid of its footprint to sort by. */
type Column = Cube<ColumnVertex>;

const slotAngle = (slot: number) => (2 * Math.PI * slot) / N;

/**
 * How far the two columns of a swap ride off the ring at the time `t` of
 * the tween, for a swap across `span` slots. A far swap leaves the ring at
 * once, so it also passes the columns in between.
 */
const laneAt = (t: number, span: number) => LANE * Math.min(1, span * Math.sin(Math.PI * t));

const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`;

function swap(items: Item[], i: number, j: number): void {
    [items[i], items[j]] = [items[j], items[i]];
}

/** Bubble sort: every pass carries the largest value left to the end, and a pass without a swap ends the sort. */
function* bubbleSort(items: Item[]): Generator<Step> {
    for (let end = items.length - 1; end > 0; end -= 1) {
        let swapped = false;
        for (let i = 0; i < end; i += 1) {
            yield { kind: 'compare', i, j: i + 1 };
            if (items[i].value > items[i + 1].value) {
                swap(items, i, i + 1);
                swapped = true;
                yield { kind: 'swap', i, j: i + 1 };
            }
        }
        yield { kind: 'settle', i: end };
        if (!swapped) {
            return;
        }
    }
}

/** Insertion sort: every item moves down by adjacent swaps until the one below it is smaller. */
function* insertionSort(items: Item[]): Generator<Step> {
    for (let k = 1; k < items.length; k += 1) {
        for (let j = k; j > 0; j -= 1) {
            yield { kind: 'compare', i: j - 1, j };
            if (items[j - 1].value < items[j].value) {
                break;
            }
            swap(items, j - 1, j);
            yield { kind: 'swap', i: j - 1, j };
        }
    }
}

/** Quick sort with the Lomuto partition: the last item is the pivot and lands on its final index. */
function* quickSort(items: Item[], lo = 0, hi = items.length - 1): Generator<Step> {
    if (lo > hi) {
        return;
    }
    const pivot = items[hi].value;
    let store = lo;
    for (let j = lo; j < hi; j += 1) {
        yield { kind: 'compare', i: j, j: hi };
        if (items[j].value < pivot) {
            if (store !== j) {
                swap(items, store, j);
                yield { kind: 'swap', i: store, j };
            }
            store += 1;
        }
    }
    if (store !== hi) {
        swap(items, store, hi);
        yield { kind: 'swap', i: store, j: hi };
    }
    yield { kind: 'settle', i: store };
    yield* quickSort(items, lo, store - 1);
    yield* quickSort(items, store + 1, hi);
}

const ALGORITHMS = [
    { name: 'bubble sort', run: bubbleSort },
    { name: 'insertion sort', run: insertionSort },
    { name: 'quick sort', run: quickSort }
];

// A tick on the floor outside the ring for every slot.
const TICKS: Point3D[][] = range(N).map((slot) =>
    [RADIUS + 0.7, RADIUS + 1.2].map((r) => ({
        x: r * Math.cos(slotAngle(slot)),
        y: 0,
        z: r * Math.sin(slotAngle(slot))
    }))
);

/**
 * The eight vertices of a column, in the order cubes3D expects. The column
 * stands at its display angle and radius, as high as its value, and is
 * turned around its own vertical axis by the angle, so one face always
 * looks at the centre.
 */
function makeColumn(item: Item, slot: number): ColumnVertex[] {
    const { id, value, angle, radius } = item;
    const x = radius * Math.cos(angle);
    const z = radius * Math.sin(angle);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return box({ x, y: 0, z, width: SIDE, height: value * UNIT, depth: SIDE }).map((corner) => ({
        ...corner,
        x: x + (corner.x - x) * cos - (corner.z - z) * sin,
        z: z + (corner.x - x) * sin + (corner.z - z) * cos,
        id,
        value,
        slot
    }));
}

/**
 * Mounts the figure into `host` and returns a function that removes it.
 */
export function mountSortingSculpture(host: HTMLElement): () => void {
    // The state: every input writes it, and `render` reads it. `deal` is
    // the order of the last shuffle, so a new algorithm starts from it.
    const shuffle = shuffler(randomLcg(SEED));
    let deal: number[] = [];
    let items: Item[] = [];
    let algorithm = 0;
    let run: Generator<Step> = ALGORITHMS[algorithm].run(items);
    let last: Move | undefined;
    let comparisons = 0;
    let swaps = 0;
    const settled = new Set<number>();
    let done = false;
    let yaw = 0;
    let pitch = 0;
    let speed = 6;
    let clock = 0;

    // The columns, the floor and the ticks hang on one camera.
    const camera = camera3D();
    const cubes = cubes3D<ColumnVertex>().camera(camera);

    const { group, button } = rotatingFigure(
        host,
        'sort',
        'Twenty-four columns in a ring, as high as their values, that a sorting algorithm puts in order. Drag it to rotate it, or focus it, take a step with Enter or the right arrow, play with Space, shuffle with S and pick the algorithm with 1 to 3.',
        (dragYaw, dragPitch) => {
            yaw = dragYaw;
            pitch = dragPitch;
            render();
        }
    );

    host.classList.add('sorting-sculpture');
    host.insertAdjacentHTML(
        'beforeend',
        `<style>${STYLES}</style>
        <div class="sort-controls">
            <label>algorithm <select name="algorithm">${ALGORITHMS.map(
                (a, i) => `<option value="${i}">${a.name}</option>`
            ).join('')}</select></label>
            <button type="button" name="step">step</button>
            <button type="button" name="shuffle">shuffle</button>
            <label>speed <input name="speed" type="range" min="1" max="30" step="1" value="${speed}"><output></output></label>
            <p class="sort-readout"><span></span> <span></span></p>
            <span class="sort-status" aria-live="polite"></span>
        </div>`
    );

    const svg = select(host).select<SVGSVGElement>('svg').attr('tabindex', 0);
    // The floor goes in before the columns, so it is always painted first.
    const drawFloor = floorGrid(svg, 'sort', camera, FLOOR, TICKS);
    group.attr('class', 'sort-columns');
    const picker = host.querySelector<HTMLSelectElement>('[name=algorithm]')!;
    const stepButton = host.querySelector<HTMLButtonElement>('[name=step]')!;
    const shuffleButton = host.querySelector<HTMLButtonElement>('[name=shuffle]')!;
    const slider = host.querySelector<HTMLInputElement>('[name=speed]')!;
    const [stepText, tally] = Array.from(host.querySelectorAll<HTMLElement>('.sort-readout span'));
    const status = host.querySelector<HTMLElement>('.sort-status')!;

    /** Turns the scene, draws the floor and paints the columns back to front by their footprint. */
    function render(): void {
        pose(camera, VIEW, yaw, pitch);
        drawFloor();

        // The footprints are disjoint squares on the floor, so their depth
        // tells which column hides which. The centre of a tall column sits
        // high up, and seen from above it would paint over a short one in
        // front of it.
        const columns = cubes.data(items.map(makeColumn)).map((cube) =>
            Object.assign(cube, {
                centroid: cube.faces.find((face) => face.face === 'bottom')!.centroid
            })
        );

        const step = last;
        const touches = (d: Column, kind: Move['kind']) =>
            step?.kind === kind && (step.i === d[0].slot || step.j === d[0].slot);

        const columnGroups = group
            .selectAll<SVGGElement, Column>('g.column')
            .data(columns, (d) => d[0].id)
            .join((enter) => enter.append('g').attr('class', 'column'))
            .classed('is-settled', (d) => settled.has(d[0].slot))
            .classed('is-compared', (d) => touches(d, 'compare'))
            .classed('is-swapped', (d) => touches(d, 'swap'))
            .sort(sort);

        joinFaces(
            columnGroups.selectAll<SVGPathElement, CubeFace<ColumnVertex>>('path').data(
                (d) => d.faces,
                (d) => d.face
            ),
            cubes.draw
        );
    }

    /** Stops a running swap and puts every column on its slot. */
    function snap(): void {
        select(host).interrupt('swap');
        items.forEach((item, slot) => {
            item.angle = slotAngle(slot);
            item.radius = RADIUS;
        });
    }

    /**
     * Turns the two columns of a swap from their old slots to their new
     * ones. The column that moves clockwise, seen from above, rides outside
     * the ring and the other one inside, so they pass each other. Too fast
     * for a tween, or with reduced motion, they jump.
     */
    function animateSwap({ i, j }: Move): void {
        if (speed > JUMP_SPEED || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            snap();
            return;
        }
        const ahead = items[j];
        const back = items[i];
        const from = slotAngle(i);
        const to = slotAngle(j);
        select(host)
            .transition('swap')
            .duration(Math.min(SWAP_DURATION, 800 / speed))
            .tween('swap', () => (t) => {
                const lane = laneAt(t, j - i);
                ahead.angle = from + (to - from) * t;
                ahead.radius = RADIUS + lane;
                back.angle = to + (from - to) * t;
                back.radius = RADIUS - lane;
                render();
            });
    }

    /** Disables what a finished run cannot do and shows the counters. */
    function showState(): void {
        stepButton.disabled = done;
        button.property('disabled', done);
        host.classList.toggle('is-done', done);
        tally.textContent = `${count(comparisons, 'comparison')} · ${count(swaps, 'swap')}`;
    }

    /** Ends the run: every column is in its place. */
    function finish(): void {
        done = true;
        last = undefined;
        items.forEach((_, slot) => settled.add(slot));
        play(false);
        stepText.textContent = `Sorted in ${count(comparisons, 'comparison')} and ${count(swaps, 'swap')}.`;
        status.textContent = stepText.textContent;
        showState();
        render();
    }

    /**
     * Takes the next comparison or swap of the algorithm. A settle is not a
     * step of its own: it is taken on the way. Manual steps are announced.
     */
    function advance(announce: boolean): void {
        if (done) {
            return;
        }
        snap();
        for (let next = run.next(); !next.done; next = run.next()) {
            const step: Step = next.value;
            if (step.kind === 'settle') {
                settled.add(step.i);
                continue;
            }
            last = step;
            // A swap is yielded once it is made, so its two values have
            // changed places already.
            const [a, b] = step.kind === 'swap' ? [step.j, step.i] : [step.i, step.j];
            stepText.textContent = `${step.kind} ${items[a].value} and ${items[b].value}`;
            if (announce) {
                status.textContent = stepText.textContent;
            }
            if (step.kind === 'swap') {
                swaps += 1;
                animateSwap(step);
            } else {
                comparisons += 1;
            }
            showState();
            render();
            return;
        }
        finish();
    }

    /** Deals the columns of the last shuffle back onto the ring and starts the algorithm over. */
    function reset(): void {
        play(false);
        select(host).interrupt('swap');
        items = deal.map((value, slot) => ({
            id: `value-${value}`,
            value,
            angle: slotAngle(slot),
            radius: RADIUS
        }));
        run = ALGORITHMS[algorithm].run(items);
        last = undefined;
        comparisons = swaps = clock = 0;
        settled.clear();
        done = false;
        stepText.textContent = 'Press step or play.';
        showState();
        render();
    }

    /** Deals a new order from the seeded generator. */
    function reshuffle(announce: boolean): void {
        deal = shuffle(range(1, N + 1));
        reset();
        if (announce) {
            status.textContent = `Shuffled, ${ALGORITHMS[algorithm].name} starts over.`;
        }
    }

    /** Picks an algorithm and starts it on the same shuffle. */
    function pick(index: number): void {
        algorithm = index;
        picker.value = String(index);
        reset();
        status.textContent = `${ALGORITHMS[algorithm].name}, on the same shuffle.`;
    }

    // Play takes one step per interval of the speed, at most one per frame.
    const play = playback(button, (elapsed) => {
        const interval = 1000 / speed;
        clock += elapsed;
        if (clock >= interval) {
            clock = Math.min(clock - interval, interval);
            advance(false);
        }
    });

    function setSpeed(value: number): void {
        speed = value;
        slider.nextElementSibling!.textContent = `${value}/s`;
    }

    picker.addEventListener('change', () => pick(Number(picker.value)));
    stepButton.addEventListener('click', () => advance(true));
    shuffleButton.addEventListener('click', () => reshuffle(true));
    slider.addEventListener('input', () => setSpeed(slider.valueAsNumber));

    svg.on('keydown', (event: KeyboardEvent) => {
        if (event.metaKey || event.ctrlKey || event.altKey) {
            return;
        }
        if (event.key === 'Enter' || event.key === 'ArrowRight') {
            event.preventDefault();
            advance(true);
        } else if (event.key === ' ') {
            event.preventDefault();
            // The play button knows whether it plays, and does nothing once the run is done.
            button.node()!.click();
        } else if (event.key === 's' || event.key === 'S') {
            reshuffle(true);
        } else if (Number(event.key) >= 1 && Number(event.key) <= ALGORITHMS.length) {
            pick(Number(event.key) - 1);
        }
    });

    setSpeed(speed);
    reshuffle(false);

    return () => {
        play(false);
        select(host).interrupt('swap');
        host.innerHTML = '';
        host.classList.remove('sorting-sculpture', 'is-done');
    };
}

// The styles of the figure, scoped by the class of its host. VitePress puts
// the class `dark` on the root element in dark mode.
const STYLES = `
.sorting-sculpture {
    --ss-ink: #1b1e21;
    --ss-muted: #5f6468;
    --ss-button: #f0f1f1;
    --ss-line: #c4c7c9;
    --ss-bg: #ffffff;
    --ss-floor: #eef0f1;
    --ss-tick: #9aa0a4;
    --ss-pending: #bfd6f3;
    --ss-settled: #2a78d6;
    --ss-compared: #eda100;
    --ss-swapped: #d64560;
    margin: 1.5rem 0;
    position: relative;
    overflow: hidden;
    border: 1px solid var(--ss-line);
    border-radius: 12px;
    background: var(--ss-bg);
    color: var(--ss-ink);
}

.dark .sorting-sculpture {
    --ss-ink: #e6e8e9;
    --ss-muted: #9aa0a4;
    --ss-button: #17181a;
    --ss-line: #3d4144;
    --ss-bg: #0c0d0e;
    --ss-floor: #1a1c1e;
    --ss-tick: #5f6468;
    --ss-pending: #3a5577;
    --ss-settled: #3987e5;
    --ss-compared: #c98500;
    --ss-swapped: #e05a72;
}

.sorting-sculpture .sort-svg {
    display: block;
    width: 100%;
    height: auto;
    cursor: grab;
    touch-action: none;
}

.sorting-sculpture .sort-svg:active {
    cursor: grabbing;
}

/* The browser rings a focused SVG on every click: keep the ring for the keyboard. */
.sorting-sculpture .sort-svg:focus {
    outline: none;
}

.sorting-sculpture .sort-svg:focus-visible {
    outline: 2px solid var(--ss-ink);
    outline-offset: -4px;
}

.sorting-sculpture .floor {
    fill: var(--ss-floor);
}

.sorting-sculpture .sort-floor line {
    stroke: var(--ss-tick);
    stroke-width: 1.5;
    stroke-linecap: round;
}

/* The step state picks the hue, the face its shade, so the figure never sets a
   fill. A column turns solid once it has reached its final place. */
.sorting-sculpture .column {
    --ss-base: var(--ss-pending);
}

.sorting-sculpture .column.is-settled {
    --ss-base: var(--ss-settled);
}

.sorting-sculpture .column.is-compared {
    --ss-base: var(--ss-compared);
}

.sorting-sculpture .column.is-swapped {
    --ss-base: var(--ss-swapped);
}

.sorting-sculpture .face {
    fill: var(--ss-base);
    stroke: color-mix(in srgb, var(--ss-base) 50%, black);
    stroke-width: 0.75;
    stroke-linejoin: round;
}

.sorting-sculpture .face-front,
.sorting-sculpture .face-back {
    fill: color-mix(in srgb, var(--ss-base) 82%, black);
}

.sorting-sculpture .face-left,
.sorting-sculpture .face-right {
    fill: color-mix(in srgb, var(--ss-base) 66%, black);
}

.sorting-sculpture .sort-button,
.sorting-sculpture .sort-controls button,
.sorting-sculpture .sort-controls select {
    padding: 0.35rem 0.9rem;
    border: 1px solid var(--ss-line);
    border-radius: 8px;
    background: var(--ss-button);
    color: var(--ss-ink);
    font-size: 0.85rem;
    cursor: pointer;
}

.sorting-sculpture .sort-controls select {
    padding: 0.25rem 0.5rem;
}

.sorting-sculpture .sort-button {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
}

.sorting-sculpture .sort-button:hover:enabled,
.sorting-sculpture .sort-controls button:hover:enabled {
    border-color: var(--ss-ink);
}

.sorting-sculpture button:disabled {
    opacity: 0.5;
    cursor: default;
}

.sorting-sculpture .sort-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 1rem;
    padding: 0.75rem;
    border-top: 1px solid var(--ss-line);
    font-size: 0.85rem;
}

.sorting-sculpture .sort-controls label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.sorting-sculpture .sort-controls output {
    min-width: 2.5em;
    font-variant-numeric: tabular-nums;
}

.sorting-sculpture .sort-readout {
    flex: 1 1 16rem;
    margin: 0;
    color: var(--ss-muted);
    font-variant-numeric: tabular-nums;
}

.sorting-sculpture .sort-readout span:first-child {
    color: var(--ss-ink);
}

/* The readout already shows every step; the live region is for screen readers. */
.sorting-sculpture .sort-status {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
}

@media (max-width: 640px) {
    .sorting-sculpture .sort-controls {
        flex-direction: column;
        align-items: flex-start;
    }

    .sorting-sculpture .sort-readout {
        flex-basis: auto;
    }
}
`;
