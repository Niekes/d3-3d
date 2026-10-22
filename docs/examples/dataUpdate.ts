import { local, randomInt, randomUniform, range, select, shuffle } from 'd3';
import type { BaseType, Selection } from 'd3';
import { box, camera3D, cubes3D, points3D, sort } from '../../index';
import type { Cube, CubeFace, Point, Point3D } from '../../index';
import { floorGrid, pose } from './floorView';
import { playback, rotatingFigure } from './rotatingFigure';

/*
 * A data-update stress test: up to 36 labelled cubes on a 6 × 6 floor, and
 * four actions that add, remove, reorder and move them. Every update is drawn
 * as d3's join sees it: the entering cubes flash green and fade in, the
 * updated ones that changed their cell flash blue and slide, and the exiting
 * ones turn red and fade out. The join is keyed by the id of a cube or by
 * its index in the array, and an element that the key handed to another cube
 * is outlined. The id rides through the projection on the vertices of its
 * cube. The styles ship with the module: the figure adds them to its host.
 */

// The cells along each side of the floor, and the cubes the stress test
// keeps on it.
const N = 6;
const HALF = N / 2;
const CELLS = N * N;
const STRESS_MIN = 6;
const STRESS_MAX = 30;
// A stress step comes every 500 ms, before the transition of the last one
// ends, so the steps interrupt each other.
const STRESS_STEP = 500;
const DURATION = 600;
// A key turns the view by 15°.
const TURN = Math.PI / 12;
// The scene turns around the middle of the space the tallest cube fills. The
// camera stays above the floor, so the floor is behind every cube and needs
// no place in the sort.
const VIEW = { scale: 52, center: { x: 0, y: -1.25, z: 0 } };

/** A cube of the data: its id, its cell on the floor and its height, drawn once at birth. */
type Block = { id: string; column: number; row: number; height: number };

/** A vertex of a cube or the anchor of its label: a point that carries its cube. */
type BlockVertex = Point3D & Block;

/** What the joins key by: the id of a cube or its index in the data array. */
type Keyed = { id: string; index: number };

/** One cube after the projection, sorted by the centroid of its bottom face. */
type BlockCube = Cube<BlockVertex> & Block & Keyed;

/** One label after the projection. */
type Label = Point<BlockVertex> & Keyed;

/** What one draw saw: the sizes of the three selections and the adopted elements. */
type Counts = { enter: number; update: number; exit: number; adopted: number };

type ActionName = 'add' | 'remove' | 'shuffle' | 'move';

/** The result of an action: the new cubes and the ids it added, removed or moved. */
type Change = { blocks: Block[]; ids: string[] };

const NAMES: ActionName[] = ['add', 'remove', 'shuffle', 'move'];

const VERBS: Record<ActionName, string> = {
    add: 'added',
    remove: 'removed',
    shuffle: 'shuffled',
    move: 'moved'
};

/** How the arrow keys turn the view, in yaw and pitch, by `event.key` in lower case. */
const ARROWS: Record<string, [number, number]> = {
    arrowleft: [-1, 0],
    arrowright: [1, 0],
    arrowup: [0, -1],
    arrowdown: [0, 1]
};

const cellOf = (block: Block) => block.row * N + block.column;

const randomHeight = randomUniform(0.5, 2.5);

/** The cells no cube stands on, in random order. */
function freeCells(blocks: Block[]): { column: number; row: number }[] {
    const taken = new Set(blocks.map(cellOf));
    return shuffle(range(CELLS).filter((cell) => !taken.has(cell))).map((cell) => ({
        column: cell % N,
        row: Math.floor(cell / N)
    }));
}

/** `amount` cubes picked at random, in the order of the array. */
function pick(blocks: Block[], amount: number): Block[] {
    const picked = new Set(shuffle([...blocks]).slice(0, amount));
    return blocks.filter((block) => picked.has(block));
}

/**
 * The four actions, as changes to the data array: each returns a new array
 * and leaves the old one as it was. `fresh` names a new cube.
 */
const ACTIONS: Record<
    ActionName,
    (blocks: Block[], amount: number, fresh: () => string) => Change
> = {
    add: (blocks, amount, fresh) => {
        const added = freeCells(blocks)
            .slice(0, amount)
            .map((cell) => ({ id: fresh(), ...cell, height: randomHeight() }));
        return { blocks: [...blocks, ...added], ids: added.map((block) => block.id) };
    },
    remove: (blocks, amount) => {
        const gone = pick(blocks, amount);
        return {
            blocks: blocks.filter((block) => !gone.includes(block)),
            ids: gone.map((block) => block.id)
        };
    },
    shuffle: (blocks) => ({ blocks: shuffle([...blocks]), ids: [] }),
    move: (blocks, amount) => {
        const cells = freeCells(blocks);
        const movers = pick(blocks, Math.min(amount, cells.length));
        return {
            blocks: blocks.map((block) =>
                movers.includes(block) ? { ...block, ...cells[movers.indexOf(block)] } : block
            ),
            ids: movers.map((block) => block.id)
        };
    }
};

/** Whether an action changes anything with `n` cubes on the floor. */
const POSSIBLE: Record<ActionName, (n: number) => boolean> = {
    add: (n) => n < CELLS,
    remove: (n) => n > 0,
    shuffle: (n) => n > 1,
    move: (n) => n > 0 && n < CELLS
};

/** The eight vertices of a cube on its cell, in the order cubes3D expects. */
function makeCube(block: Block): BlockVertex[] {
    // The screen y grows downwards, so a cube rises towards a negative y.
    return box({
        x: block.column - HALF + 0.5,
        y: 0,
        z: block.row - HALF + 0.5,
        width: 0.7,
        height: block.height,
        depth: 0.7
    }).map((corner) => ({ ...block, ...corner }));
}

/** The anchor of a label: 0.3 above the middle of the top of its cube. */
function labelAnchor(block: Block): BlockVertex {
    return {
        ...block,
        x: block.column - HALF + 0.5,
        y: -block.height - 0.3,
        z: block.row - HALF + 0.5
    };
}

/** `c1`, `c1 and c2`, `c1, c2 and c3`. */
function listOf(ids: string[]): string {
    return ids.length > 1 ? `${ids.slice(0, -1).join(', ')} and ${ids[ids.length - 1]}` : ids[0];
}

/**
 * Takes the exiting elements out of the next joins and fades them out, or
 * removes them at once when the draw has no time.
 */
function leave<E extends BaseType, D, P extends BaseType, PD>(
    exit: Selection<E, D, P, PD>,
    duration: number
): void {
    if (!duration) {
        exit.remove();
        return;
    }
    exit.interrupt()
        .attr('class', 'exiting')
        .transition()
        .duration(duration)
        .style('opacity', 0)
        .remove();
}

/**
 * Mounts the figure into `host` and returns a function that removes it.
 */
export function mountDataUpdate(host: HTMLElement): () => void {
    // The state: the actions, the keys and the drag write it, `draw` reads it.
    let blocks: Block[] = [];
    let keyBy: 'id' | 'index' = 'id';
    let nextId = 1;
    const totals = { enter: 0, update: 0, exit: 0 };
    let yaw = 0;
    let pitch = 0;
    // The drag totals the scaffold reported last, and the stress test.
    let dragged = { yaw: 0, pitch: 0 };
    let stressing = false;
    let sinceStep = 0;

    // The cubes, their labels and the floor hang on one camera.
    const camera = camera3D();
    const cubes3d = cubes3D<BlockVertex>().camera(camera);
    const labels3d = points3D<BlockVertex>().camera(camera);

    // The history of an element, kept beside the data: the id it was born
    // with and the cell it was drawn on last.
    const bornAs = local<string>();
    const drawnAt = local<number>();

    // The scaffold reports the total of every drag so far. The view turns by
    // the change since the last report, so the keys can turn it too.
    const { group, button } = rotatingFigure(
        host,
        'update',
        'Up to 36 labelled cubes on a 6 by 6 floor, redrawn by a keyed join. Drag it to rotate it. With the figure focused, A adds cubes, D or Delete removes some, S shuffles the data, M moves cubes, P plays or pauses the stress test, K switches the key between id and index, and the arrow keys turn the view.',
        (dragYaw, dragPitch) => {
            turn(dragYaw - dragged.yaw, dragPitch - dragged.pitch);
            dragged = { yaw: dragYaw, pitch: dragPitch };
        }
    );

    host.classList.add('data-update');
    host.insertAdjacentHTML(
        'beforeend',
        `<style>${STYLES}</style>
        <div class="update-controls">
            <div class="update-actions">
                ${NAMES.map((name) => `<button type="button" value="${name}">${name}</button>`).join('')}
            </div>
            <fieldset>
                <legend>key</legend>
                <label><input type="radio" name="update-key" value="id" checked> id</label>
                <label><input type="radio" name="update-key" value="index"> index</label>
            </fieldset>
            <p class="update-readout"></p>
            <p class="update-status" aria-live="polite"></p>
        </div>`
    );

    const svg = select(host).select<SVGSVGElement>('svg').attr('tabindex', 0);
    // The floor goes in before the cubes and the labels after them.
    const drawFloor = floorGrid(svg, 'update', camera, N);
    group.attr('class', 'update-cubes');
    const labelGroup = svg.append('g').attr('class', 'update-labels');
    const actionButtons = select(host).selectAll<HTMLButtonElement, unknown>(
        '.update-actions button'
    );
    const keyInputs = Array.from(host.querySelectorAll<HTMLInputElement>('[name=update-key]'));
    const readout = host.querySelector('.update-readout') as HTMLElement;
    const status = host.querySelector('.update-status') as HTMLElement;

    button.attr('title', 'The stress test: a random action every 500 ms');

    // An element is matched to a datum by its id or by the index of the
    // datum it got last. d3's join by index pairs the data with the elements
    // in DOM order, and the painter's sort reorders those with every turn.
    const keyOf = (d: Keyed) => (keyBy === 'id' ? d.id : String(d.index));

    /**
     * Projects the scene and joins the cubes and their labels by the key.
     * Every element moves to its new state in a transition of `duration`. A
     * draw without time cuts the running transitions short, so a drag snaps
     * the cubes to their cells. Returns what the join saw.
     */
    function draw(duration: number): Counts {
        pose(camera, VIEW, yaw, pitch);
        drawFloor();

        // The exits of the last update are drawn where the view was, so a
        // turn takes them away.
        if (!duration) {
            svg.selectAll('.exiting').interrupt().remove();
        }

        // cubes3D returns fresh arrays, but every vertex keeps its cube, so
        // the id is attached again from the first one. The cubes stand on one
        // floor and sort by their footprint: the centre of a tall cube sits
        // high up and would paint over a short cube in front of it.
        const projected = cubes3d.data(blocks.map(makeCube)).map((cube, index) => {
            const { id, column, row, height } = cube[0];
            const bottom = cube.faces.find((face) => face.face === 'bottom')!;
            return Object.assign(cube, {
                id,
                column,
                row,
                height,
                index,
                centroid: bottom.centroid
            }) as BlockCube;
        });
        const labels: Label[] = labels3d
            .data(blocks.map(labelAnchor))
            .map((label, index) => Object.assign(label, { index }));

        const counts: Counts = { enter: 0, update: 0, exit: 0, adopted: 0 };

        // A flash starts at full strength, and the transition fades it.
        const flash = (
            groups: Selection<SVGGElement, BlockCube, SVGGElement, unknown>,
            color: string
        ) => {
            if (duration) {
                groups
                    .interrupt()
                    .style('--du-flash', `var(--du-${color})`)
                    .style('--du-glow', '100%');
            }
        };

        const cubeGroups = group
            .selectAll<SVGGElement, BlockCube>('g.cube')
            .data(projected, keyOf)
            .join(
                (enter) => {
                    counts.enter = enter.size();
                    const entered = enter
                        .append('g')
                        .attr('class', 'cube')
                        .style('opacity', 0)
                        .each(function (d) {
                            bornAs.set(this, d.id);
                        });
                    flash(entered, 'enter');
                    return entered;
                },
                (update) => {
                    counts.update = update.size();
                    flash(
                        update.filter(function (d) {
                            return drawnAt.get(this) !== cellOf(d);
                        }),
                        'update'
                    );
                    return update;
                },
                (exit) => {
                    counts.exit = exit.size();
                    leave(
                        exit.style('--du-flash', 'var(--du-exit)').style('--du-glow', '100%'),
                        duration
                    );
                }
            )
            .each(function (d) {
                drawnAt.set(this, cellOf(d));
            })
            .classed('is-adopted', function (d) {
                return bornAs.get(this) !== d.id;
            })
            .sort(sort);

        counts.adopted = cubeGroups.filter('.is-adopted').size();

        cubeGroups.transition().duration(duration).style('opacity', 1).style('--du-glow', '0%');

        // A face that turns away keeps its element and is only hidden. Every
        // face path has the same commands, so the slide interpolates exactly.
        cubeGroups
            .selectAll<SVGPathElement, CubeFace<BlockVertex>>('path')
            .data(
                (d) => d.faces,
                (d) => d.face
            )
            .join((enter) =>
                enter
                    .append('path')
                    .attr('class', (d) => `face face-${d.face}`)
                    .attr('d', cubes3d.draw)
            )
            .attr('visibility', (d) => (d.ccw ? null : 'hidden'))
            .transition()
            .duration(duration)
            .attr('d', cubes3d.draw);

        // The labels take the same key, so they follow the cubes.
        labelGroup
            .selectAll<SVGTextElement, Label>('text.label')
            .data(labels, keyOf)
            .join(
                (enter) =>
                    enter
                        .append('text')
                        .attr('class', 'label')
                        .style('opacity', 0)
                        .attr('x', (d) => d.projected.x)
                        .attr('y', (d) => d.projected.y),
                (update) => update,
                (exit) => leave(exit, duration)
            )
            .text((d) => d.id)
            .transition()
            .duration(duration)
            .style('opacity', 1)
            .attr('x', (d) => d.projected.x)
            .attr('y', (d) => d.projected.y);

        return counts;
    }

    /** Adds what a draw saw to the counters and shows them. */
    function report(counts: Counts): void {
        totals.enter += counts.enter;
        totals.update += counts.update;
        totals.exit += counts.exit;
        readout.innerHTML = `<span class="tally enter">${counts.enter} entered</span>
            <span class="tally update">${counts.update} updated</span>
            <span class="tally exit">${counts.exit} exited</span>
            <span class="tally adopted">${counts.adopted} adopted</span><br>
            in all ${totals.enter} entered, ${totals.update} updated, ${totals.exit} exited · ${blocks.length} of ${CELLS} cells taken`;
        actionButtons.property('disabled', function () {
            return !POSSIBLE[this.value as ActionName](blocks.length);
        });
    }

    /**
     * Runs an action on up to `amount` cubes, draws it and counts what the
     * join saw. The stress test does not announce its steps.
     */
    function act(name: ActionName, amount = randomInt(1, 4)(), announce = true): void {
        if (!POSSIBLE[name](blocks.length)) {
            return;
        }
        const change = ACTIONS[name](blocks, amount, () => `c${nextId++}`);
        blocks = change.blocks;
        const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const counts = draw(still ? 0 : DURATION);
        report(counts);
        if (announce) {
            const what = change.ids.length ? listOf(change.ids) : `${blocks.length} cubes`;
            status.textContent = `${VERBS[name]} ${what}: ${counts.enter} entered, ${counts.update} updated, ${counts.exit} exited`;
        }
    }

    /** Turns the view, by the drag or by the keys. */
    function turn(dYaw: number, dPitch: number): void {
        yaw += dYaw;
        pitch += dPitch;
        draw(0);
    }

    function setKey(key: 'id' | 'index'): void {
        keyBy = key;
        keyInputs[key === 'id' ? 0 : 1].checked = true;
        status.textContent = `joined by ${key}`;
    }

    /**
     * One step of the stress test: add below 6 cubes, remove above 30, and
     * otherwise a random action that keeps the count between the two.
     */
    function stressStep(): void {
        const n = blocks.length;
        const open = NAMES.filter(
            (name) =>
                POSSIBLE[name](n) &&
                (name !== 'add' || n < STRESS_MAX) &&
                (name !== 'remove' || n > STRESS_MIN)
        );
        const name =
            n < STRESS_MIN ? 'add' : n > STRESS_MAX ? 'remove' : open[randomInt(open.length)()];
        const room = name === 'add' ? STRESS_MAX - n : name === 'remove' ? n - STRESS_MIN : CELLS;
        act(name, Math.min(randomInt(1, 4)(), room), false);
    }

    // The scaffold's button plays and pauses the stress test. It goes
    // through `stress`, as P does, so the live region tells either.
    const play = playback(button, (elapsed) => {
        sinceStep += elapsed;
        if (sinceStep >= STRESS_STEP) {
            sinceStep = 0;
            stressStep();
        }
    });

    function stress(on: boolean): void {
        stressing = on;
        sinceStep = 0;
        play(on);
        status.textContent = on
            ? 'stress test running: a random action every 500 ms'
            : `stress test paused at ${blocks.length} cubes`;
    }

    button.on('click', () => stress(!stressing));

    actionButtons.on('click', function () {
        act(this.value as ActionName);
    });

    for (const input of keyInputs) {
        input.addEventListener('change', () => setKey(input.value as 'id' | 'index'));
    }

    /** What the keys do while the figure has the focus. */
    const keys: Record<string, () => void> = {
        a: () => act('add'),
        d: () => act('remove'),
        delete: () => act('remove'),
        s: () => act('shuffle'),
        m: () => act('move'),
        p: () => stress(!stressing),
        k: () => setKey(keyBy === 'id' ? 'index' : 'id')
    };

    // A key with Ctrl, ⌘ or Alt is left to the browser.
    svg.on('keydown', (event: KeyboardEvent) => {
        if (event.ctrlKey || event.metaKey || event.altKey) {
            return;
        }
        const key = event.key.toLowerCase();
        const arrow = ARROWS[key];
        const action = arrow ? () => turn(arrow[0] * TURN, arrow[1] * TURN) : keys[key];
        if (!action) {
            return;
        }
        event.preventDefault();
        action();
    });

    play(false);
    act('add', 12, false);

    return () => {
        play(false);
        svg.selectAll('*').interrupt();
        host.innerHTML = '';
        host.classList.remove('data-update');
    };
}

// The styles of the figure, scoped by the class of its host. VitePress puts
// the class `dark` on the root element in dark mode.
const STYLES = `
.data-update {
    --du-ink: #1b1e21;
    --du-muted: #5f6468;
    --du-button: #f0f1f1;
    --du-line: #c4c7c9;
    --du-bg: #ffffff;
    --du-floor: #eef0f1;
    --du-grid: #b3b8bc;
    --du-cube: #b4bbc1;
    --du-enter: #1baf7a;
    --du-update: #2a78d6;
    --du-exit: #d03a3a;
    margin: 1.5rem 0;
    position: relative;
    overflow: hidden;
    border: 1px solid var(--du-line);
    border-radius: 12px;
    background: var(--du-bg);
    color: var(--du-ink);
}

.dark .data-update {
    --du-ink: #e6e8e9;
    --du-muted: #9aa0a4;
    --du-button: #17181a;
    --du-line: #3d4144;
    --du-bg: #0c0d0e;
    --du-floor: #1a1c1e;
    --du-grid: #43484c;
    --du-cube: #6b7379;
    --du-enter: #22c08a;
    --du-update: #3987e5;
    --du-exit: #f06060;
}

.data-update .update-svg {
    display: block;
    width: 100%;
    height: auto;
    cursor: grab;
    touch-action: none;
}

.data-update .update-svg:active {
    cursor: grabbing;
}

/* The browser rings a focused SVG on every click: keep the ring for the keyboard. */
.data-update .update-svg:focus {
    outline: none;
}

.data-update .update-svg:focus-visible {
    outline: 2px solid var(--du-ink);
    outline-offset: -4px;
}

.data-update .floor {
    fill: var(--du-floor);
}

.data-update .update-floor line {
    stroke: var(--du-grid);
    stroke-width: 0.75;
}

/* A flash mixes its color into the cube by the glow, which the draw sets on
   the group and fades; the face picks the shade. */
.data-update .update-cubes > g {
    --du-tint: color-mix(in srgb, var(--du-flash, var(--du-cube)) var(--du-glow, 0%), var(--du-cube));
}

.data-update .face {
    fill: var(--du-tint);
    stroke: color-mix(in srgb, var(--du-tint) 50%, black);
    stroke-width: 0.75;
    stroke-linejoin: round;
}

.data-update .face-front,
.data-update .face-back {
    fill: color-mix(in srgb, var(--du-tint) 82%, black);
}

.data-update .face-left,
.data-update .face-right {
    fill: color-mix(in srgb, var(--du-tint) 66%, black);
}

/* An element bound to another cube than the one it was born for. */
.data-update .is-adopted .face {
    stroke: var(--du-ink);
    stroke-width: 1.5;
    stroke-dasharray: 4 3;
}

.data-update .update-labels text {
    font: 600 13px system-ui, sans-serif;
    text-anchor: middle;
    dominant-baseline: central;
    fill: var(--du-ink);
    stroke: var(--du-bg);
    stroke-width: 3;
    stroke-linejoin: round;
    paint-order: stroke;
    pointer-events: none;
}

.data-update button {
    padding: 0.35rem 0.9rem;
    border: 1px solid var(--du-line);
    border-radius: 8px;
    background: var(--du-button);
    color: var(--du-ink);
    font-size: 0.85rem;
    cursor: pointer;
}

.data-update button:hover:enabled {
    border-color: var(--du-ink);
}

.data-update button:disabled {
    color: var(--du-muted);
    cursor: not-allowed;
    opacity: 0.6;
}

.data-update .update-button {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
}

.data-update .update-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 1.5rem;
    padding: 0.75rem;
    border-top: 1px solid var(--du-line);
    font-size: 0.85rem;
}

.data-update .update-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.data-update fieldset {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    padding: 0;
    border: 0;
}

.data-update legend {
    float: left;
    margin-right: 4px;
    color: var(--du-muted);
}

.data-update .update-readout {
    flex: 1 1 18rem;
    margin: 0;
    line-height: 1.6;
    color: var(--du-muted);
    font-variant-numeric: tabular-nums;
}

.data-update .tally {
    color: var(--du-ink);
    white-space: nowrap;
}

.data-update .tally + .tally {
    margin-left: 0.5rem;
}

.data-update .tally::before {
    content: '';
    display: inline-block;
    box-sizing: border-box;
    width: 0.75em;
    height: 0.75em;
    margin-right: 0.3em;
    border-radius: 2px;
    background: var(--du-swatch);
}

.data-update .tally.enter {
    --du-swatch: var(--du-enter);
}

.data-update .tally.update {
    --du-swatch: var(--du-update);
}

.data-update .tally.exit {
    --du-swatch: var(--du-exit);
}

.data-update .tally.adopted::before {
    border: 1.5px dashed var(--du-ink);
    background: none;
}

.data-update .update-status {
    flex-basis: 100%;
    min-height: 1.5em;
    margin: 0;
}

/* At phone width every control takes a row of its own. */
@media (max-width: 640px) {
    .data-update .update-controls > * {
        flex-basis: 100%;
    }
}
`;
