import { pointer, range, select } from 'd3';
import { box, cubes3D, lines3D, planes3D, sort } from '../../index';
import type { Cube, CubeFace, CubeFaceName, Line, Point3D } from '../../index';
import { joinFaces } from './cubeFaces';
import { pose, tiltOf } from './floorView';
import { rotatingFigure } from './rotatingFigure';
import { placeSegments } from './segments';

/*
 * A voxel builder: unit cubes on an 8 × 8 floor. The floor is one plane and
 * its grid lines, so there is no element per cell to hit: the cell under the
 * pointer comes from `unproject`, the inverse of the projection. A clicked
 * face names its own neighbor, and a face that touches another cube or the
 * floor is never drawn. The styles ship with the module: the figure adds
 * them to its host.
 */

// The cells along each side of the floor and the layers a column may hold.
const N = 8;
const H = 6;
const HALF = N / 2;
// The scene turns around the middle of the space a build can fill. The
// camera stays above the floor, so the floor is behind every cube and needs
// no place in the sort.
const VIEW = { scale: 38, center: { x: 0, y: -H / 2, z: 0 } };

const COLORS = ['blue', 'orange', 'green', 'yellow', 'purple', 'red'];

/** A place in the grid: the column along x, the layer up from the floor and the row along z. */
type Cell = { column: number; layer: number; row: number };

/** A cube of the build: its cell and the index of its color. */
type Voxel = Cell & { color: number };

/** One vertex of a cube: a point that carries its cube, so the cube survives the projection. */
type VoxelVertex = Point3D & Voxel & { key: string; ghost: boolean };

/** One cube after the projection: cubes3D always sets its faces and its centroid. */
type VoxelCube = Cube<VoxelVertex> & { faces: CubeFace<VoxelVertex>[]; centroid: Point3D };

/** Where the next click lands: a free cell to build in, or a cube to erase. */
type Target = Cell & { erase: boolean };

/** A pointer position in client pixels, kept so the target can follow a glide. */
type Pointer = { clientX: number; clientY: number; shiftKey: boolean };

/** The neighbor behind every face, as a step in column, layer and row. */
const STEPS: Record<CubeFaceName, [number, number, number]> = {
    front: [0, 0, 1],
    back: [0, 0, -1],
    left: [-1, 0, 0],
    right: [1, 0, 0],
    top: [0, 1, 0],
    bottom: [0, -1, 0]
};

const FACES = Object.keys(STEPS) as CubeFaceName[];

/** How the arrow keys move the cursor, as a step in column and row. */
const MOVES: Record<string, [number, number]> = {
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0]
};

/** A stepped corner, so the floor is not empty on the first visit. */
const STARTER: Voxel[] = [
    { column: 3, layer: 0, row: 3, color: 0 },
    { column: 4, layer: 0, row: 3, color: 0 },
    { column: 3, layer: 0, row: 4, color: 1 },
    { column: 4, layer: 0, row: 4, color: 2 },
    { column: 3, layer: 1, row: 3, color: 3 },
    { column: 4, layer: 1, row: 3, color: 0 },
    { column: 3, layer: 2, row: 3, color: 4 }
];

// The floor: one plane, and a grid line along every cell edge.
const FLOOR: Point3D[][] = [
    [
        { x: -HALF, y: 0, z: -HALF },
        { x: HALF, y: 0, z: -HALF },
        { x: HALF, y: 0, z: HALF },
        { x: -HALF, y: 0, z: HALF }
    ]
];

const GRID: Point3D[][] = range(N + 1).flatMap((i) => [
    [
        { x: i - HALF, y: 0, z: -HALF },
        { x: i - HALF, y: 0, z: HALF }
    ],
    [
        { x: -HALF, y: 0, z: i - HALF },
        { x: HALF, y: 0, z: i - HALF }
    ]
]);

const keyOf = (cell: Cell) => `${cell.column},${cell.layer},${cell.row}`;

const inside = (cell: Cell) =>
    cell.column >= 0 &&
    cell.column < N &&
    cell.row >= 0 &&
    cell.row < N &&
    cell.layer >= 0 &&
    cell.layer < H;

const clamp = (i: number) => Math.max(0, Math.min(N - 1, i));

/** The cell behind a face of the cube in `cell`. */
function neighborOf(cell: Cell, face: CubeFaceName): Cell {
    const [dc, dl, dr] = STEPS[face];
    return { column: cell.column + dc, layer: cell.layer + dl, row: cell.row + dr };
}

/** The eight vertices of the cube in a cell, in the order cubes3D expects. */
function makeCube(voxel: Voxel, ghost = false): VoxelVertex[] {
    const key = ghost ? 'ghost' : keyOf(voxel);
    // A cell spans one unit from its corner; the screen y grows downwards,
    // so the layers rise towards a negative y.
    return box({
        x: voxel.column - HALF + 0.5,
        y: -voxel.layer,
        z: voxel.row - HALF + 0.5,
        width: 1,
        height: 1,
        depth: 1
    }).map((corner) => ({ ...voxel, ...corner, key, ghost }));
}

/**
 * Mounts the figure into `host` and returns a function that removes it.
 */
export function mountVoxelBuilder(host: HTMLElement): () => void {
    // The state: every input writes it, and `render` reads it.
    const built = new Map<string, Voxel>();
    let color = 0;
    let erasing = false;
    let yaw = 0;
    let pitch = 0;
    let target: Target | undefined;
    // What picks the target: the pointer while it rests over the figure with
    // no button down, otherwise the keyboard's cursor column.
    let hovering: Pointer | undefined;
    let cursor: { column: number; row: number } | undefined;

    const cubes = cubes3D<VoxelVertex>();
    const floor = planes3D();
    const grid = lines3D();

    const { group, button } = rotatingFigure(
        host,
        'voxel',
        'An 8 by 8 floor to build on with cubes. Drag it to rotate it, click the floor or a cube to place a cube and shift-click a cube to remove it, or focus it and build with the arrow keys and Enter.',
        (dragYaw, dragPitch) => {
            yaw = dragYaw;
            pitch = dragPitch;
            render();
            retarget();
        }
    );

    host.classList.add('voxel-builder');
    host.insertAdjacentHTML(
        'beforeend',
        `<style>${STYLES}</style>
        <div class="voxel-controls">
            <fieldset>
                <legend>color</legend>
                ${COLORS.map(
                    (name, i) =>
                        `<input class="swatch color-${i}" type="radio" name="voxel-color" value="${i}" aria-label="${name}" title="${name} (${i + 1})"${i === color ? ' checked' : ''}>`
                ).join('')}
            </fieldset>
            <fieldset>
                <legend>mode</legend>
                <label><input type="radio" name="voxel-mode" value="build" checked> build</label>
                <label><input type="radio" name="voxel-mode" value="erase"> erase</label>
            </fieldset>
            <p class="voxel-readout"><span></span> <span aria-live="polite"></span> <span></span></p>
        </div>`
    );

    const svg = select(host).select<SVGSVGElement>('svg').attr('tabindex', 0);
    // The floor goes in before the cubes, so it is always painted first.
    const floorGroup = svg.insert('g', 'g').attr('class', 'voxel-floor');
    group.attr('class', 'voxel-cubes');
    const [floorText, status, tally] = Array.from(
        host.querySelectorAll<HTMLElement>('.voxel-readout span')
    );
    const colorInputs = Array.from(host.querySelectorAll<HTMLInputElement>('[name=voxel-color]'));
    const modeInputs = Array.from(host.querySelectorAll<HTMLInputElement>('[name=voxel-mode]'));

    /** Whether the face of a cell in this direction shows: no cube and no floor behind it. */
    function isOpen(cell: Cell, face: CubeFaceName): boolean {
        const next = neighborOf(cell, face);
        return next.layer >= 0 && !built.has(keyOf(next));
    }

    /** Turns the scene, draws the floor and paints the cubes and the ghost back to front. */
    function render(): void {
        const tilt = tiltOf(pitch);
        pose(cubes, VIEW, yaw, tilt);
        pose(floor, VIEW, yaw, tilt);
        pose(grid, VIEW, yaw, tilt);

        floorGroup
            .selectAll('path')
            .data(floor.data(FLOOR))
            .join('path')
            .attr('class', 'floor')
            .attr('d', floor.draw);

        floorGroup
            .selectAll<SVGLineElement, Line<Point3D>>('line')
            .data(grid.data(GRID))
            .join('line')
            .call(placeSegments);

        const voxels = [...built.values()].map((voxel) => makeCube(voxel));
        if (target && !target.erase) {
            voxels.push(makeCube({ ...target, color }, true));
        }
        const erased = target?.erase ? keyOf(target) : undefined;

        const cubeGroups = group
            .selectAll<SVGGElement, VoxelCube>('g.cube')
            .data(cubes.data(voxels) as VoxelCube[], (d) => d[0].key)
            .join('g')
            .attr(
                'class',
                (d) =>
                    `cube color-${d[0].color}${d[0].ghost ? ' ghost' : ''}${d[0].key === erased ? ' is-target' : ''}`
            )
            .sort(sort);

        // A face against another cube or the floor is dropped, so the DOM
        // only holds the surface of the build.
        joinFaces(
            cubeGroups.selectAll<SVGPathElement, CubeFace<VoxelVertex>>('path').data(
                (d) => d.faces.filter((face) => isOpen(d[0], face.face)),
                (d) => d.face
            ),
            cubes.draw
        );

        const faces = [...built.values()].reduce(
            (sum, voxel) => sum + FACES.filter((face) => isOpen(voxel, face)).length,
            0
        );
        tally.textContent = `${built.size} cube${built.size === 1 ? '' : 's'} · ${faces} faces drawn`;
    }

    /** The point of the floor plane under a pointer, in world units, or null when it misses. */
    function floorAt(at: Pointer): Point3D | null {
        const [x, y] = pointer(at, group.node());
        return cubes.unproject({ x, y }, { x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 });
    }

    /** The first free cell of a column to build in, or its top cube to erase. */
    function columnTarget(column: number, row: number, erase: boolean): Target | undefined {
        let layer = 0;
        while (layer < H && built.has(keyOf({ column, layer, row }))) {
            layer += 1;
        }
        if (erase) {
            return layer > 0 ? { column, layer: layer - 1, row, erase } : undefined;
        }
        return layer < H ? { column, layer, row, erase } : undefined;
    }

    /**
     * Where a click at the pointer would land. Over a face the face names the
     * cell: the cube itself to erase it, its neighbor to build. Anywhere
     * else the floor plane under the pointer names the column.
     */
    function targetAt(at: Pointer): Target | undefined {
        const erase = erasing !== at.shiftKey;
        const hit = document.elementFromPoint(at.clientX, at.clientY);

        if (hit && hit.matches('.face') && host.contains(hit)) {
            const face = select<Element, CubeFace<VoxelVertex>>(hit).datum();
            const { column, layer, row } = face[0];
            if (erase) {
                return { column, layer, row, erase };
            }
            const next = neighborOf(face[0], face.face);
            return inside(next) && !built.has(keyOf(next)) ? { ...next, erase } : undefined;
        }

        const point = floorAt(at);
        const column = point ? Math.floor(point.x + HALF) : -1;
        const row = point ? Math.floor(point.z + HALF) : -1;
        if (erase || !inside({ column, layer: 0, row })) {
            return undefined;
        }
        return columnTarget(column, row, false);
    }

    /** Picks the target again from the pointer or the cursor, and draws it if it moved. */
    function retarget(): void {
        const targetKey = (t: Target | undefined) => (t ? `${keyOf(t)} ${t.erase}` : '');
        const previous = target;
        target = hovering
            ? targetAt(hovering)
            : cursor
              ? columnTarget(cursor.column, cursor.row, erasing)
              : undefined;
        const point = hovering ? floorAt(hovering) : null;
        floorText.textContent = point
            ? `floor x ${point.x.toFixed(2)}, z ${point.z.toFixed(2)}`
            : '';
        if (targetKey(previous) !== targetKey(target)) {
            render();
        }
    }

    /** Builds or erases the cube of a target and tells what happened. */
    function apply(change: Target): void {
        const key = keyOf(change);
        const name = COLORS[change.erase ? built.get(key)!.color : color];
        if (change.erase) {
            built.delete(key);
        } else {
            built.set(key, { column: change.column, layer: change.layer, row: change.row, color });
        }
        status.textContent = `${change.erase ? 'Removed' : 'Placed'} ${/^[aeiou]/.test(name) ? 'an' : 'a'} ${name} cube at column ${change.column + 1}, row ${change.row + 1}, layer ${change.layer + 1}. ${built.size} cube${built.size === 1 ? '' : 's'}.`;
        target = undefined;
        retarget();
        render();
    }

    function setColor(index: number): void {
        color = index;
        colorInputs[index].checked = true;
        render();
    }

    function setMode(erase: boolean): void {
        erasing = erase;
        modeInputs[erase ? 1 : 0].checked = true;
        retarget();
    }

    function reset(): void {
        built.clear();
        for (const voxel of STARTER) {
            built.set(keyOf(voxel), voxel);
        }
        target = undefined;
        retarget();
        render();
    }

    // The pointer is kept while no button is down, so the target follows the
    // scene through a glide; during a drag there is no target.
    function hover(event: PointerEvent): void {
        hovering = event.buttons
            ? undefined
            : { clientX: event.clientX, clientY: event.clientY, shiftKey: event.shiftKey };
        cursor = undefined;
        retarget();
    }

    svg.on('pointermove', hover).on('pointerup', hover);

    svg.on('pointerleave', () => {
        hovering = undefined;
        retarget();
    });

    // d3.drag swallows the click that ends a drag, so turning the scene
    // never builds. The target is picked from the click itself, so a tap
    // builds without a hover first.
    svg.on('click', (event: MouseEvent) => {
        const at = targetAt(event);
        if (at) {
            apply(at);
        }
    });

    // The arrow keys walk a cursor column over the floor; Enter builds on
    // top of it and Delete takes its top cube away.
    svg.on('keydown', (event: KeyboardEvent) => {
        const move = MOVES[event.key];
        if (move) {
            event.preventDefault();
            hovering = undefined;
            cursor = cursor
                ? { column: clamp(cursor.column + move[0]), row: clamp(cursor.row + move[1]) }
                : { column: HALF, row: HALF };
            const height = columnTarget(cursor.column, cursor.row, true)?.layer ?? -1;
            status.textContent = `Column ${cursor.column + 1}, row ${cursor.row + 1}: ${height + 1} high.`;
            retarget();
            return;
        }
        if ((event.key === 'Enter' || event.key === ' ') && target) {
            event.preventDefault();
            apply(target);
        } else if ((event.key === 'Delete' || event.key === 'Backspace') && cursor) {
            event.preventDefault();
            const top = columnTarget(cursor.column, cursor.row, true);
            if (top) {
                apply(top);
            }
        } else if (Number(event.key) >= 1 && Number(event.key) <= COLORS.length) {
            setColor(Number(event.key) - 1);
        } else if (event.key === 'e' || event.key === 'E') {
            setMode(!erasing);
        } else if (event.key === 'Escape') {
            cursor = undefined;
            retarget();
        }
    });

    for (const input of colorInputs) {
        input.addEventListener('change', () => setColor(Number(input.value)));
    }

    for (const input of modeInputs) {
        input.addEventListener('change', () => setMode(input.value === 'erase'));
    }

    button.text('reset').on('click', () => {
        reset();
        status.textContent = 'Back to the starter build.';
    });

    reset();

    return () => {
        host.innerHTML = '';
        host.classList.remove('voxel-builder');
    };
}

// The styles of the figure, scoped by the class of its host. VitePress puts
// the class `dark` on the root element in dark mode.
const STYLES = `
.voxel-builder {
    --vb-ink: #1b1e21;
    --vb-muted: #5f6468;
    --vb-button: #f0f1f1;
    --vb-line: #c4c7c9;
    --vb-bg: #ffffff;
    --vb-floor: #eef0f1;
    --vb-grid: #b3b8bc;
    --vb-erase: #d03a3a;
    --vb-color-0: #2a78d6;
    --vb-color-1: #eb6834;
    --vb-color-2: #1baf7a;
    --vb-color-3: #eda100;
    --vb-color-4: #8a5cd6;
    --vb-color-5: #d64560;
    margin: 1.5rem 0;
    position: relative;
    overflow: hidden;
    border: 1px solid var(--vb-line);
    border-radius: 12px;
    background: var(--vb-bg);
    color: var(--vb-ink);
}

.dark .voxel-builder {
    --vb-ink: #e6e8e9;
    --vb-muted: #9aa0a4;
    --vb-button: #17181a;
    --vb-line: #3d4144;
    --vb-bg: #0c0d0e;
    --vb-floor: #1a1c1e;
    --vb-grid: #43484c;
    --vb-erase: #f06060;
    --vb-color-0: #3987e5;
    --vb-color-1: #d95926;
    --vb-color-2: #199e70;
    --vb-color-3: #c98500;
    --vb-color-4: #9a70e0;
    --vb-color-5: #e05a72;
}

.voxel-builder .voxel-svg {
    display: block;
    width: 100%;
    height: auto;
    cursor: crosshair;
    touch-action: none;
}

.voxel-builder .voxel-svg:active {
    cursor: grabbing;
}

/* The browser rings a focused SVG on every click: keep the ring for the keyboard. */
.voxel-builder .voxel-svg:focus {
    outline: none;
}

.voxel-builder .voxel-svg:focus-visible {
    outline: 2px solid var(--vb-ink);
    outline-offset: -4px;
}

.voxel-builder .floor {
    fill: var(--vb-floor);
}

.voxel-builder .voxel-floor line {
    stroke: var(--vb-grid);
    stroke-width: 0.75;
}

/* The color picks the hue, the face its shade, so the figure never sets a fill. */
.voxel-builder .color-0 {
    --vb-base: var(--vb-color-0);
}

.voxel-builder .color-1 {
    --vb-base: var(--vb-color-1);
}

.voxel-builder .color-2 {
    --vb-base: var(--vb-color-2);
}

.voxel-builder .color-3 {
    --vb-base: var(--vb-color-3);
}

.voxel-builder .color-4 {
    --vb-base: var(--vb-color-4);
}

.voxel-builder .color-5 {
    --vb-base: var(--vb-color-5);
}

.voxel-builder .face {
    fill: var(--vb-base);
    stroke: color-mix(in srgb, var(--vb-base) 50%, black);
    stroke-width: 0.75;
    stroke-linejoin: round;
}

.voxel-builder .face-front,
.voxel-builder .face-back {
    fill: color-mix(in srgb, var(--vb-base) 82%, black);
}

.voxel-builder .face-left,
.voxel-builder .face-right {
    fill: color-mix(in srgb, var(--vb-base) 66%, black);
}

/* The ghost shows where the next cube goes; it never takes the pointer, so
   the pointer always finds the cube or the floor behind it. */
.voxel-builder .ghost {
    pointer-events: none;
}

.voxel-builder .ghost .face {
    fill-opacity: 0.35;
    stroke-dasharray: 3 2;
}

.voxel-builder .is-target .face {
    fill: color-mix(in srgb, var(--vb-erase) 70%, var(--vb-base));
    stroke: var(--vb-erase);
    stroke-width: 1.5;
}

.voxel-builder .voxel-button {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    padding: 0.35rem 0.9rem;
    border: 1px solid var(--vb-line);
    border-radius: 8px;
    background: var(--vb-button);
    color: var(--vb-ink);
    font-size: 0.85rem;
    cursor: pointer;
}

.voxel-builder .voxel-button:hover {
    border-color: var(--vb-ink);
}

.voxel-builder .voxel-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 1.5rem;
    padding: 0.75rem;
    border-top: 1px solid var(--vb-line);
    font-size: 0.85rem;
}

.voxel-builder fieldset {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    padding: 0;
    border: 0;
}

.voxel-builder legend {
    float: left;
    margin-right: 4px;
    color: var(--vb-muted);
}

.voxel-builder .swatch {
    appearance: none;
    width: 20px;
    height: 20px;
    margin: 0;
    border: 2px solid var(--vb-bg);
    border-radius: 50%;
    outline: 1px solid var(--vb-line);
    background: var(--vb-base);
    cursor: pointer;
}

.voxel-builder .swatch:checked {
    outline: 2px solid var(--vb-ink);
}

.voxel-builder .swatch:focus-visible {
    outline: 3px solid var(--vb-ink);
}

.voxel-builder .voxel-readout {
    flex: 1 1 16rem;
    margin: 0;
    color: var(--vb-muted);
    font-variant-numeric: tabular-nums;
}

.voxel-builder .voxel-readout span:nth-child(2) {
    color: var(--vb-ink);
}
`;
