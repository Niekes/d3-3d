import { randomLcg, range, select } from 'd3';
import { camera3D, cubes3D } from '../../index';
import type { CubeFaceName, Point3D } from '../../index';
import { cellBox, joinCells, keyOf, neighborOf } from './cubeFaces';
import type { Cell } from './cubeFaces';
import { floorGrid, pose } from './floorView';
import { playback, rotatingFigure } from './rotatingFigure';

/*
 * A cellular automaton in three dimensions: a 12 × 12 × 12 grid of cells on
 * a floor, and every live cell is a unit cube. One generation follows from
 * the last by a rule that counts the 26 neighbors of every cell. A face that
 * touches another live cell or the floor is never drawn, so the DOM only
 * holds the surface. The styles ship with the module: the figure adds them
 * to its host.
 */

// The cells along each side of the grid.
const N = 12;
const HALF = N / 2;
// The scene turns around the middle of the grid. Its corners lie 6√3 units
// from the middle, 229 pixels at this scale, so the grid fits the 500 pixels
// of the view box at every tilt. The camera stays above the floor, so the
// floor is behind every cube and needs no place in the sort.
const VIEW = { scale: 22, center: { x: 0, y: -HALF, z: 0 } };
// The seed of the first visit: every rule runs for a while from it.
const SEED = 0.105;

/**
 * A rule: the neighbor counts a live cell survives on and a dead cell is
 * born on, and the soup it starts from, a cube of `size` cells along each
 * side in the middle of the grid, of which `density` are alive.
 */
type Rule = {
    name: string;
    survive: number[];
    birth: number[];
    soup: { size: number; density: number };
};

const RULES: Rule[] = [
    { name: '4555', survive: [4, 5], birth: [5], soup: { size: 10, density: 0.25 } },
    { name: '5766', survive: [5, 6, 7], birth: [6], soup: { size: N, density: 0.35 } },
    {
        name: 'Clouds',
        survive: range(13, 27),
        birth: [13, 14, 17, 18, 19],
        soup: { size: N, density: 0.6 }
    }
];

/** One vertex of a cube: a point that carries its cell and the bucket of its age. */
type CellVertex = Point3D & Cell & { key: string; bucket: number };

/** The 26 steps from a cell to its neighbors, in column, layer and row. */
const NEIGHBORS = range(27)
    .filter((i) => i !== 13)
    .map((i) => [(i % 3) - 1, (Math.floor(i / 3) % 3) - 1, Math.floor(i / 9) - 1]);

const inside = (cell: Cell) => [cell.column, cell.layer, cell.row].every((i) => i >= 0 && i < N);

/** The place of a cell in the arrays of the grid, which run by layer, row and column. */
const indexOf = (cell: Cell) => (cell.layer * N + cell.row) * N + cell.column;

const cellAt = (i: number): Cell => ({
    column: i % N,
    layer: Math.floor(i / N / N),
    row: Math.floor(i / N) % N
});

/** The four colors of the age: born this generation, 1, 2 to 4, and 5 or more. */
const bucketOf = (age: number) => (age < 2 ? age : age < 5 ? 2 : 3);

/** The cells a rule starts from: a random soup, the same for the same seed. */
function soup(rule: Rule, seed: number): Uint8Array {
    const random = randomLcg(seed);
    const { size, density } = rule.soup;
    const low = (N - size) / 2;
    const within = (i: number) => i >= low && i < low + size;
    return new Uint8Array(N ** 3).map((_, i) => {
        const { column, layer, row } = cellAt(i);
        return Number(within(column) && within(layer) && within(row) && random() < density);
    });
}

/**
 * One generation. Every live cell adds one to the count of each neighbor
 * inside the grid; outside it, every cell is dead. Then a live cell survives
 * when its count is in `survive` and a dead one is born when it is in
 * `birth`. A survivor grows a generation older and a newborn starts at 0.
 * `changed` tells whether a cell was born or died.
 */
function step(
    cells: Uint8Array,
    ages: Uint8Array,
    rule: Rule
): { cells: Uint8Array; ages: Uint8Array; changed: boolean } {
    const counts = new Uint8Array(cells.length);
    cells.forEach((alive, i) => {
        if (!alive) {
            return;
        }
        const { column, layer, row } = cellAt(i);
        for (const [dc, dl, dr] of NEIGHBORS) {
            const next = { column: column + dc, layer: layer + dl, row: row + dr };
            if (inside(next)) {
                counts[indexOf(next)] += 1;
            }
        }
    });

    const next = cells.map((alive, i) =>
        Number((alive ? rule.survive : rule.birth).includes(counts[i]))
    );
    return {
        cells: next,
        ages: ages.map((age, i) => (cells[i] && next[i] ? Math.min(age + 1, 255) : 0)),
        changed: next.some((alive, i) => alive !== cells[i])
    };
}

/** The eight vertices of the cube in a cell, in the order cubes3D expects. */
function makeCube(cell: Cell, age: number): CellVertex[] {
    const key = keyOf(cell);
    return cellBox(cell, { x: -HALF, y: 0, z: -HALF }).map((corner) => ({
        ...cell,
        ...corner,
        key,
        bucket: bucketOf(age)
    }));
}

/**
 * Mounts the figure into `host` and returns a function that removes it.
 */
export function mountCellularAutomaton(host: HTMLElement): () => void {
    // The state: every input writes it, and `render` reads it.
    let rule = RULES[0];
    let seed = SEED;
    let cells = soup(rule, seed);
    let ages: Uint8Array = new Uint8Array(cells.length);
    let generation = 0;
    let speed = 5;
    let yaw = 0;
    let pitch = 0;
    // The milliseconds play has waited for the next generation, and the
    // frame a render is due in.
    let waited = 0;
    let frame = 0;

    // The cubes and the floor hang on one camera.
    const camera = camera3D();
    const cubes = cubes3D<CellVertex>().camera(camera);

    const { group, button } = rotatingFigure(
        host,
        'cells',
        'A 12 by 12 by 12 grid of cells on a floor, every live cell a cube. Drag it to rotate it, or focus it, step with Enter, play with Space, draw a new seed with N and pick a rule with 1 to 3.',
        (dragYaw, dragPitch) => {
            yaw = dragYaw;
            pitch = dragPitch;
            update();
        }
    );

    host.classList.add('cellular-automaton');
    host.insertAdjacentHTML(
        'beforeend',
        `<style>${STYLES}</style>
        <div class="cells-controls">
            <label>rule <select name="cells-rule">${RULES.map(
                (r, i) => `<option value="${i}">${r.name}</option>`
            ).join('')}</select></label>
            <button type="button" name="step">step</button>
            <button type="button" name="seed">new seed</button>
            <label>speed <input name="cells-speed" type="range" min="1" max="10" step="1" value="${speed}"><output></output></label>
            <p class="cells-readout"><span></span> <span aria-live="polite"></span></p>
        </div>`
    );

    const svg = select(host).select<SVGSVGElement>('svg').attr('tabindex', 0);
    // The floor goes in before the cubes, so it is always painted first.
    const drawFloor = floorGrid(svg, 'cells', camera, N);
    group.attr('class', 'cells-cubes');
    const [tally, status] = Array.from(host.querySelectorAll<HTMLElement>('.cells-readout span'));
    const ruleSelect = host.querySelector('[name=cells-rule]') as HTMLSelectElement;
    const speedInput = host.querySelector('[name=cells-speed]') as HTMLInputElement;
    const speedOutput = speedInput.nextElementSibling as HTMLOutputElement;

    const population = () => cells.reduce((sum, alive) => sum + alive, 0);

    /** Whether the face of a cell in this direction shows: no live cell and no floor behind it. */
    function isOpen(cell: Cell, face: CubeFaceName): boolean {
        const next = neighborOf(cell, face);
        return next.layer >= 0 && !(inside(next) && cells[indexOf(next)]);
    }

    /** Turns the scene, draws the floor and paints the live cells back to front. */
    function render(): void {
        frame = 0;
        pose(camera, VIEW, yaw, pitch);
        drawFloor();

        const live = range(cells.length)
            .filter((i) => cells[i])
            .map((i) => makeCube(cellAt(i), ages[i]));

        // A cell keeps its group from one generation to the next, so only a
        // birth adds one and only a death removes one. A face against
        // another live cell or the floor is dropped.
        const cubeGroups = joinCells(group, cubes, live, isOpen).attr(
            'class',
            (d) => `cube age-${d[0].bucket}`
        );

        const faces = cubeGroups.selectAll('path').size();
        tally.textContent = `generation ${generation} · ${live.length} cell${live.length === 1 ? '' : 's'} · ${faces} faces drawn`;
    }

    /** Asks for a render in the next frame, so a step and a turn in one frame render once. */
    function update(): void {
        frame ||= requestAnimationFrame(render);
    }

    /** Moves on one generation and tells whether the grid changed; a still grid keeps its generation. */
    function advance(): boolean {
        const next = step(cells, ages, rule);
        if (next.changed) {
            ({ cells, ages } = next);
            generation += 1;
            update();
        }
        return next.changed;
    }

    const report = () => {
        const live = population();
        return `Generation ${generation}: ${live} cell${live === 1 ? '' : 's'}.`;
    };

    const ending = () =>
        population()
            ? `Generation ${generation}: the grid stands still. Draw a new seed or pick another rule.`
            : `Generation ${generation}: the grid died out. Draw a new seed.`;

    function stepOnce(): void {
        status.textContent = advance() && population() ? report() : ending();
    }

    /** Starts the rule over from the soup of the seed. */
    function restart(): void {
        cells = soup(rule, seed);
        ages = new Uint8Array(cells.length);
        generation = 0;
        waited = 0;
        update();
    }

    function setRule(index: number): void {
        rule = RULES[index];
        ruleSelect.value = String(index);
        restart();
        status.textContent = `Rule ${rule.name}. ${report()}`;
    }

    function newSeed(): void {
        seed = Math.random();
        restart();
        status.textContent = `New seed. ${report()}`;
    }

    function setSpeed(): void {
        speed = Number(speedInput.value);
        speedOutput.textContent = `${speed} / s`;
    }

    // Play moves on one generation per interval of the speed, and stops by
    // itself once the grid dies out or stands still. It announces only
    // that, not every generation.
    const play = playback(button, (elapsed) => {
        waited += elapsed;
        if (waited < 1000 / speed) {
            return;
        }
        waited %= 1000 / speed;
        if (!advance() || !population()) {
            play(false);
            status.textContent = ending();
        }
    });

    // The keys act only while the figure has the focus.
    svg.on('keydown', (event: KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === 'ArrowRight') {
            stepOnce();
        } else if (event.key === ' ') {
            button.node()!.click();
        } else if (event.key === 'n' || event.key === 'N') {
            newSeed();
        } else if (Number(event.key) >= 1 && Number(event.key) <= RULES.length) {
            setRule(Number(event.key) - 1);
        } else {
            return;
        }
        event.preventDefault();
    });

    ruleSelect.addEventListener('change', () => setRule(Number(ruleSelect.value)));
    host.querySelector('[name=step]')!.addEventListener('click', stepOnce);
    host.querySelector('[name=seed]')!.addEventListener('click', newSeed);
    speedInput.addEventListener('input', setSpeed);

    // The figure starts paused on its seed.
    play(false);
    setSpeed();
    render();

    return () => {
        play(false);
        cancelAnimationFrame(frame);
        host.innerHTML = '';
        host.classList.remove('cellular-automaton');
    };
}

// The styles of the figure, scoped by the class of its host. VitePress puts
// the class `dark` on the root element in dark mode.
const STYLES = `
.cellular-automaton {
    --ca-ink: #1b1e21;
    --ca-muted: #5f6468;
    --ca-button: #f0f1f1;
    --ca-line: #c4c7c9;
    --ca-bg: #ffffff;
    --ca-floor: #eef0f1;
    --ca-grid: #b3b8bc;
    --ca-age-0: #eda100;
    --ca-age-1: #eb6834;
    --ca-age-2: #d64560;
    --ca-age-3: #8a5cd6;
    margin: 1.5rem 0;
    position: relative;
    overflow: hidden;
    border: 1px solid var(--ca-line);
    border-radius: 12px;
    background: var(--ca-bg);
    color: var(--ca-ink);
}

.dark .cellular-automaton {
    --ca-ink: #e6e8e9;
    --ca-muted: #9aa0a4;
    --ca-button: #17181a;
    --ca-line: #3d4144;
    --ca-bg: #0c0d0e;
    --ca-floor: #1a1c1e;
    --ca-grid: #43484c;
    --ca-age-0: #c98500;
    --ca-age-1: #d95926;
    --ca-age-2: #e05a72;
    --ca-age-3: #9a70e0;
}

.cellular-automaton .cells-svg {
    display: block;
    width: 100%;
    height: auto;
    cursor: grab;
    touch-action: none;
}

.cellular-automaton .cells-svg:active {
    cursor: grabbing;
}

/* The browser rings a focused SVG on every click: keep the ring for the keyboard. */
.cellular-automaton .cells-svg:focus {
    outline: none;
}

.cellular-automaton .cells-svg:focus-visible {
    outline: 2px solid var(--ca-ink);
    outline-offset: -4px;
}

.cellular-automaton .floor {
    fill: var(--ca-floor);
}

.cellular-automaton .cells-floor line {
    stroke: var(--ca-grid);
    stroke-width: 0.75;
}

/* The age picks the hue, the face its shade, so the figure never sets a fill. */
.cellular-automaton .age-0 {
    --ca-base: var(--ca-age-0);
}

.cellular-automaton .age-1 {
    --ca-base: var(--ca-age-1);
}

.cellular-automaton .age-2 {
    --ca-base: var(--ca-age-2);
}

.cellular-automaton .age-3 {
    --ca-base: var(--ca-age-3);
}

.cellular-automaton .face {
    fill: var(--ca-base);
    stroke: color-mix(in srgb, var(--ca-base) 50%, black);
    stroke-width: 0.75;
    stroke-linejoin: round;
}

.cellular-automaton .face-front,
.cellular-automaton .face-back {
    fill: color-mix(in srgb, var(--ca-base) 82%, black);
}

.cellular-automaton .face-left,
.cellular-automaton .face-right {
    fill: color-mix(in srgb, var(--ca-base) 66%, black);
}

.cellular-automaton button {
    padding: 0.35rem 0.9rem;
    border: 1px solid var(--ca-line);
    border-radius: 8px;
    background: var(--ca-button);
    color: var(--ca-ink);
    font-size: 0.85rem;
    cursor: pointer;
}

.cellular-automaton button:hover {
    border-color: var(--ca-ink);
}

.cellular-automaton .cells-button {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
}

.cellular-automaton .cells-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 1.5rem;
    padding: 0.75rem;
    border-top: 1px solid var(--ca-line);
    font-size: 0.85rem;
}

.cellular-automaton .cells-controls label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--ca-muted);
}

.cellular-automaton select {
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--ca-line);
    border-radius: 6px;
    background: var(--ca-button);
    color: var(--ca-ink);
}

.cellular-automaton output {
    min-width: 3em;
    color: var(--ca-ink);
    font-variant-numeric: tabular-nums;
}

.cellular-automaton .cells-readout {
    flex: 1 1 16rem;
    margin: 0;
    /* Two lines, so an announcement does not push the page down. */
    min-height: 3em;
    line-height: 1.5;
    color: var(--ca-muted);
    font-variant-numeric: tabular-nums;
}

.cellular-automaton .cells-readout span:nth-child(2) {
    color: var(--ca-ink);
}

/* On a phone the controls stack, one to a line. */
@media (max-width: 480px) {
    .cellular-automaton .cells-controls {
        flex-direction: column;
        align-items: flex-start;
    }

    .cellular-automaton .cells-readout {
        flex-basis: auto;
    }
}
`;
