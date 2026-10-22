import { drag, pointer, range, select } from 'd3';
import { box, camera3D, cubes3D, lines3D } from '../../index';
import type { Cube, CubeFace, CubeFaceName, Line, Point3D } from '../../index';
import { cellBox, joinCells, joinFaces, keyOf, neighborOf } from './cubeFaces';
import type { Cell } from './cubeFaces';
import { FLOOR_MOVES, floorGrid, followPointer, pose } from './floorView';
import type { Pointer } from './floorView';
import { endDrags, rotatingFigure } from './rotatingFigure';
import { placeSegments } from './segments';

/*
 * A packing playground: a see-through container of 6 × 4 × 4 cells on a
 * floor, filled with boxes from a tray. A box lands on the highest box under
 * its footprint, and a drag moves it across the floor at its own height: the
 * point under the pointer comes from `unproject` on the horizontal plane
 * through its base. Every box is drawn as unit cubes, which `sort` paints in
 * an exact order, and one map from cells to boxes tells what to draw, where
 * two boxes overlap and how full the container is. The styles ship with the
 * module: the figure adds them to its host.
 */

// The container: columns along x, rows along z and layers up from the floor.
const W = 6;
const D = 4;
const H = 4;
const CELLS = W * D * H;
// The floor around the container, in cells along each side.
const FLOOR = 8;
// The scene turns around the middle of the container. The camera stays above
// the floor, so the floor and the far walls are behind every box.
const VIEW = { scale: 40, center: { x: 0, y: -H / 2, z: 0 } };
// The normal of the floor and of every plane a box is dragged in.
const UP: Point3D = { x: 0, y: 1, z: 0 };
// The id of the ghost, the see-through box that shows where the next one lands.
const GHOST = -1;

const COLORS = ['blue', 'orange', 'green', 'yellow', 'purple', 'slate'];

/** The tray: the width, depth and height of every size of box. */
const SIZES: [number, number, number][] = [
    [1, 1, 1],
    [2, 1, 1],
    [2, 2, 1],
    [3, 2, 1],
    [2, 2, 2]
];

/** A box on the grid: the cell of its lowest corner and its size in cells. */
type Box = Cell & { width: number; depth: number; height: number };

/** A box in the container, with an id and the index of its color. */
type Piece = Box & { id: number; color: number };

/** One vertex of a unit cube: a point that carries its cell, the boxes in that cell and the color. */
type UnitVertex = Point3D & Cell & { key: string; owners: number[]; color: number };

/** A drag of a box: the box, its cell before the drag and the grab offset from the pointer, in cells. */
type Grab = { piece: Piece; from: string; column: number; row: number };

/** Three boxes that do not overlap, so the container is not empty on the first visit. */
const STARTER: Piece[] = [
    { id: 0, color: 0, column: 0, layer: 0, row: 0, width: 3, depth: 2, height: 1 },
    { id: 1, color: 1, column: 3, layer: 0, row: 1, width: 2, depth: 2, height: 2 },
    { id: 2, color: 2, column: 0, layer: 1, row: 0, width: 2, depth: 1, height: 1 }
];

/** The container as one box, so that cubes3D names its faces and tells which turn away. */
const SHELL = box({ x: 0, y: 0, z: 0, width: W, height: H, depth: D });

/** The grid lines on the floor of the container, between its cells. */
const GRID: Point3D[][] = [
    ...range(1, W).map((i) => [
        { x: i - W / 2, y: 0, z: -D / 2 },
        { x: i - W / 2, y: 0, z: D / 2 }
    ]),
    ...range(1, D).map((i) => [
        { x: -W / 2, y: 0, z: i - D / 2 },
        { x: W / 2, y: 0, z: i - D / 2 }
    ])
];

const clamp = (i: number, max: number) => Math.max(0, Math.min(max, i));

const sizeText = (b: Box) => `${b.width} × ${b.depth} × ${b.height}`;

const describe = (piece: Piece) =>
    `the ${COLORS[piece.color]} ${sizeText(piece)} box at column ${piece.column + 1}, row ${piece.row + 1}, layer ${piece.layer + 1}`;

/** Whether a box lies inside the container. */
const fits = (b: Box) =>
    b.column >= 0 &&
    b.row >= 0 &&
    b.layer >= 0 &&
    b.column + b.width <= W &&
    b.row + b.depth <= D &&
    b.layer + b.height <= H;

/** The cells a box covers. */
function cellsOf(b: Box): Cell[] {
    return range(b.width).flatMap((dc) =>
        range(b.height).flatMap((dl) =>
            range(b.depth).map((dr) => ({
                column: b.column + dc,
                layer: b.layer + dl,
                row: b.row + dr
            }))
        )
    );
}

/** The cell map: the ids of the boxes in every cell that a box covers. */
function cellMap(pieces: Piece[]): Map<string, number[]> {
    const cells = new Map<string, number[]>();
    for (const piece of pieces) {
        for (const cell of cellsOf(piece)) {
            const key = keyOf(cell);
            cells.set(key, [...(cells.get(key) ?? []), piece.id]);
        }
    }
    return cells;
}

/**
 * The layer a box comes to rest on when it falls from the layer `from`: the
 * first one with a box other than `self`, or the floor, under its footprint.
 */
function dropLayer(cells: Map<string, number[]>, b: Box, from: number, self = GHOST): number {
    const blocked = (layer: number) =>
        cellsOf({ ...b, layer, height: 1 }).some((cell) =>
            (cells.get(keyOf(cell)) ?? []).some((id) => id !== self)
        );
    let layer = from;
    while (layer > 0 && !blocked(layer - 1)) {
        layer -= 1;
    }
    return layer;
}

/** The eight vertices of the unit cube in a cell, in the order cubes3D expects. */
function unitCube(cell: Cell, key: string, owners: number[], color: number): UnitVertex[] {
    return cellBox(cell, { x: -W / 2, y: 0, z: -D / 2 }).map((corner) => ({
        ...cell,
        ...corner,
        key,
        owners,
        color
    }));
}

/**
 * Mounts the figure into `host` and returns a function that removes it.
 */
export function mountPackingPlayground(host: HTMLElement): () => void {
    // The state: every input writes it, and `render` reads it.
    let pieces: Piece[] = [];
    let nextId = 0;
    let size = 2;
    let turned = false;
    let moving = false;
    let selected: number | undefined;
    let target: Box | undefined;
    let grab: Grab | undefined;
    let yaw = 0;
    let pitch = 0;
    // What picks the target: the pointer while it rests over the figure with
    // no button down, otherwise the keyboard's cursor on the floor.
    let hovering: Pointer | undefined;
    let cursor: { column: number; row: number } | undefined;

    // The boxes, the container and the floor hang on one camera.
    const camera = camera3D();
    const cubes = cubes3D<UnitVertex>().camera(camera);
    const shell = cubes3D().camera(camera);
    const lines = lines3D().camera(camera);

    const { group, button } = rotatingFigure(
        host,
        'pack',
        'A see-through container of 6 by 4 by 4 cells to fill with boxes. Click the floor or the top of a box to place the next box, switch to move mode to drag a box across the floor, and drag the background to rotate. Or focus it: the arrow keys walk a cursor and Enter places a box, the bracket keys select a box, the arrow keys and Page Up and Page Down move it, D drops it, R turns it and Delete removes it.',
        (dragYaw, dragPitch) => {
            yaw = dragYaw;
            pitch = dragPitch;
            render();
            retarget();
        }
    );

    host.classList.add('packing-playground');
    host.insertAdjacentHTML(
        'beforeend',
        `<style>${STYLES}</style>
        <div class="pack-controls">
            <fieldset>
                <legend>box</legend>
                ${SIZES.map(
                    (s, i) =>
                        `<label><input type="radio" name="pack-size" value="${i}"${i === size ? ' checked' : ''}> ${s.join(' × ')}</label>`
                ).join('')}
                <label><input type="checkbox" name="pack-turn"> turned</label>
            </fieldset>
            <fieldset>
                <legend>mode</legend>
                <label><input type="radio" name="pack-mode" value="place" checked> place</label>
                <label><input type="radio" name="pack-mode" value="move"> move</label>
            </fieldset>
            <p class="pack-readout"><label>volume <meter min="0" max="${CELLS}"></meter></label> <span></span> <span aria-live="polite"></span></p>
        </div>`
    );

    const svg = select(host).select<SVGSVGElement>('svg').attr('tabindex', 0);
    // Painted in this order: the floor, the walls that turn away from the
    // camera, the boxes and the edges of the walls that turn towards it.
    const drawFloor = floorGrid(svg, 'pack', camera, FLOOR, GRID);
    const backGroup = group.append('g').attr('class', 'pack-back');
    const cubeGroup = group.append('g').attr('class', 'pack-cubes');
    const frontGroup = group.append('g').attr('class', 'pack-front');
    const meter = host.querySelector('meter') as HTMLMeterElement;
    const [tally, status] = Array.from(host.querySelectorAll<HTMLElement>('.pack-readout span'));
    const sizeInputs = Array.from(host.querySelectorAll<HTMLInputElement>('[name=pack-size]'));
    const turnInput = host.querySelector('[name=pack-turn]') as HTMLInputElement;
    const modeInputs = Array.from(host.querySelectorAll<HTMLInputElement>('[name=pack-mode]'));

    /**
     * Draws the container: the walls that turn away from the camera, and
     * every edge in front of the boxes or behind them. An edge borders two
     * walls; it lies in front once one of them turns towards the camera.
     */
    function drawShell(): void {
        const faces = shell.data([SHELL])[0].faces;
        joinFaces(
            backGroup
                .selectAll<SVGPathElement, CubeFace<Point3D>>('path')
                .data(faces, (d) => d.face),
            shell.draw,
            (face) => !face.ccw
        );

        const edges = faces
            .flatMap((a, i) =>
                faces.slice(i + 1).map((b) => ({
                    ends: a.filter((corner) => b.includes(corner)),
                    near: a.ccw || b.ccw
                }))
            )
            .filter((edge) => edge.ends.length === 2);
        const segments = lines.data(edges.map((edge) => edge.ends));
        // Both groups keep all twelve edges and only hide some, so a turn
        // never adds or removes one.
        for (const [edgeGroup, near] of [
            [backGroup, false],
            [frontGroup, true]
        ] as const) {
            edgeGroup
                .selectAll<SVGLineElement, Line<Point3D>>('line')
                .data(segments)
                .join('line')
                .attr('visibility', (_, i) => (edges[i].near === near ? null : 'hidden'))
                .call(placeSegments);
        }
    }

    /** Turns the scene and draws the floor, the container and every box as unit cubes, back to front. */
    function render(): void {
        pose(camera, VIEW, yaw, pitch);
        drawFloor();
        drawShell();

        const ghost: Piece[] = target
            ? [{ ...target, id: GHOST, color: nextId % COLORS.length }]
            : [];
        const all = [...pieces, ...ghost];
        const cells = cellMap(all);

        // A cell of one box is a cube of that box, keyed by the box and the
        // place of the cell in it, so a moved box keeps its elements. A cell
        // of two or more boxes is one red cube, keyed by the cell.
        const units = all.flatMap((piece) =>
            cellsOf(piece).flatMap((cell) => {
                const owners = cells.get(keyOf(cell))!;
                if (owners.length === 1) {
                    const offset = {
                        column: cell.column - piece.column,
                        layer: cell.layer - piece.layer,
                        row: cell.row - piece.row
                    };
                    return [unitCube(cell, `${piece.id}:${keyOf(offset)}`, owners, piece.color)];
                }
                return owners[0] === piece.id
                    ? [unitCube(cell, `overlap:${keyOf(cell)}`, owners, piece.color)]
                    : [];
            })
        );

        // A face on the floor, against its own box or between two red cubes
        // is never seen, so it never reaches the DOM.
        const isOpen = (cell: Cell, face: CubeFaceName) => {
            const next = neighborOf(cell, face);
            const mine = cells.get(keyOf(cell))!;
            const theirs = cells.get(keyOf(next)) ?? [];
            return (
                next.layer >= 0 && (mine.length > 1 ? theirs.length < 2 : !theirs.includes(mine[0]))
            );
        };

        joinCells(cubeGroup, cubes, units, isOpen).attr('class', (d) => {
            const { owners, color } = d[0];
            if (owners.length > 1) {
                return 'cube overlap';
            }
            return owners[0] === GHOST
                ? `cube ghost color-${color}`
                : `cube piece color-${color}${owners[0] === selected ? ' is-selected' : ''}`;
        });

        // The ghost never shares a cell, so it is the only owner of its cells.
        const volume = [...cells.values()].filter((owners) => owners[0] !== GHOST).length;
        const overlaps = [...cells.values()].filter((owners) => owners.length > 1).length;
        meter.value = volume;
        tally.textContent = `${volume} of ${CELLS} cells · ${Math.round((100 * volume) / CELLS)}% · ${overlaps} overlapping`;
    }

    /** The tray box with its footprint turned or not, at the corner of the container. */
    function trayBox(): Box {
        const [width, depth, height] = SIZES[size];
        return turned
            ? { column: 0, layer: 0, row: 0, width: depth, depth: width, height }
            : { column: 0, layer: 0, row: 0, width, depth, height };
    }

    /**
     * Where the tray box lands with its footprint around a cell of the
     * floor: on the highest box under the footprint. Nowhere, when the
     * footprint leaves the container or the box would rise above it.
     */
    function landing(cell: { column: number; row: number }): Box | undefined {
        const b = trayBox();
        b.column = cell.column - Math.floor((b.width - 1) / 2);
        b.row = cell.row - Math.floor((b.depth - 1) / 2);
        b.layer = dropLayer(cellMap(pieces), b, H);
        return fits(b) ? b : undefined;
    }

    /** The point of the floor plane under a pointer, in world units, or null when it misses. */
    function floorAt(at: Pointer): Point3D | null {
        const [x, y] = pointer(at, group.node());
        return cubes.unproject({ x, y }, { x: 0, y: 0, z: 0 }, UP);
    }

    /**
     * Where a click at the pointer would place the tray box: on the top face
     * of a box, its cell, and anywhere else the cell of the floor plane
     * under the pointer. Nowhere in move mode.
     */
    function targetAt(at: Pointer): Box | undefined {
        if (moving !== at.shiftKey) {
            return undefined;
        }
        const hit = document.elementFromPoint(at.clientX, at.clientY);
        if (hit && hit.matches('.cube .face-top') && host.contains(hit)) {
            return landing(select<Element, CubeFace<UnitVertex>>(hit).datum()[0]);
        }
        const point = floorAt(at);
        return point
            ? landing({ column: Math.floor(point.x + W / 2), row: Math.floor(point.z + D / 2) })
            : undefined;
    }

    const pickTarget = () => (hovering ? targetAt(hovering) : cursor ? landing(cursor) : undefined);

    /** Picks the target again from the pointer or the cursor, and draws it if it moved. */
    function retarget(): void {
        const keyOfBox = (b: Box | undefined) => (b ? `${keyOf(b)} ${sizeText(b)}` : '');
        const previous = target;
        target = pickTarget();
        if (keyOfBox(previous) !== keyOfBox(target)) {
            render();
        }
    }

    /** Draws an edit with the target picked again, and tells what happened and how full the container is. */
    function edit(message: string): void {
        target = pickTarget();
        render();
        status.textContent = `${message} ${tally.textContent}.`;
    }

    /** The box an element belongs to: in a red cube the selected box, or else the newest one in it. */
    function pieceAt(element: EventTarget | null): Piece | undefined {
        const hit = (element as Element | null)?.closest?.('.piece, .overlap');
        if (!hit) {
            return undefined;
        }
        const { owners } = select<Element, Cube<UnitVertex>>(hit).datum()[0];
        const id =
            selected !== undefined && owners.includes(selected)
                ? selected
                : owners[owners.length - 1];
        return pieces.find((piece) => piece.id === id);
    }

    function place(at: Box): void {
        const piece = { ...at, id: nextId, color: nextId % COLORS.length };
        nextId += 1;
        pieces.push(piece);
        edit(`Placed ${describe(piece)}.`);
    }

    function choose(piece: Piece | undefined): void {
        selected = piece?.id;
        cursor = undefined;
        edit(piece ? `Selected ${describe(piece)}.` : 'No box selected.');
    }

    /** Moves a box to a cell, kept inside the container. A move may push it into another box. */
    function moveTo(piece: Piece, to: Cell, verb: string): void {
        piece.column = clamp(to.column, W - piece.width);
        piece.layer = clamp(to.layer, H - piece.height);
        piece.row = clamp(to.row, D - piece.depth);
        edit(`${verb} ${describe(piece)}.`);
    }

    /** Turns the footprint of a box by a quarter turn, if it still fits. */
    function turn(piece: Piece): void {
        const turnedPiece = { ...piece, width: piece.depth, depth: piece.width };
        if (fits(turnedPiece)) {
            Object.assign(piece, turnedPiece);
            edit(`Turned ${describe(piece)}.`);
        } else {
            edit(`Turning would push ${describe(piece)} out of the container.`);
        }
    }

    function setSize(index: number): void {
        size = index;
        sizeInputs[index].checked = true;
        edit(`Next box ${sizeText(trayBox())}.`);
    }

    function setTurned(on: boolean): void {
        turned = on;
        turnInput.checked = on;
        edit(`Next box ${sizeText(trayBox())}.`);
    }

    function setMode(move: boolean): void {
        moving = move;
        modeInputs[move ? 1 : 0].checked = true;
        host.classList.toggle('is-moving', move);
        retarget();
    }

    /** The cell of the plane through the base of a box under a point of the view box, in fractional cells. */
    function baseAt(x: number, y: number, piece: Piece): { column: number; row: number } | null {
        const hit = cubes.unproject({ x, y }, { x: 0, y: -piece.layer, z: 0 }, UP);
        return hit && { column: hit.x + W / 2, row: hit.z + D / 2 };
    }

    // The drag on a box moves it across the floor at its own height: the
    // plane through its base with the normal up. d3.drag stops the press
    // from reaching the drag of the figure, so moving a box never turns the
    // scene. In place mode the filter lets the press through, and the scene
    // turns. The subject is the pointer, so the events carry it in the units
    // of the view box, the units `unproject` expects.
    const dragPiece = drag<SVGGElement, unknown>()
        .filter(
            (event) =>
                !event.button && moving !== event.shiftKey && pieceAt(event.target) !== undefined
        )
        .subject((event) => ({ x: event.x, y: event.y }))
        .on('start', (event) => {
            const piece = pieceAt(event.sourceEvent.target)!;
            // The offset keeps the box where it was grabbed, not with its
            // corner under the pointer.
            const at = baseAt(event.x, event.y, piece) ?? piece;
            grab = {
                piece,
                from: keyOf(piece),
                column: piece.column - at.column,
                row: piece.row - at.row
            };
            selected = piece.id;
            cursor = undefined;
            render();
        })
        .on('drag', (event) => {
            const at = grab && baseAt(event.x, event.y, grab.piece);
            // A plane seen edge-on has no point under the pointer, and the
            // box keeps its cell.
            if (!grab || !at) {
                return;
            }
            const { piece } = grab;
            const column = clamp(Math.round(at.column + grab.column), W - piece.width);
            const row = clamp(Math.round(at.row + grab.row), D - piece.depth);
            if (column !== piece.column || row !== piece.row) {
                piece.column = column;
                piece.row = row;
                render();
            }
        })
        .on('end', () => {
            if (grab && grab.from !== keyOf(grab.piece)) {
                edit(`Moved ${describe(grab.piece)}.`);
            }
            grab = undefined;
        });

    cubeGroup.call(dragPiece);

    // The pointer is kept while no button is down, so the target follows the
    // scene through a glide; during a drag there is no target. A move takes
    // over from the keyboard's cursor.
    followPointer(svg, (at, left) => {
        hovering = at;
        cursor = left ? cursor : undefined;
        retarget();
    });

    // A click places the tray box, or in move mode selects the box under it.
    // d3.drag swallows the click that ends a drag, so turning the scene or
    // moving a box never places one.
    svg.on('click', (event: MouseEvent) => {
        if (moving !== event.shiftKey) {
            choose(pieceAt(event.target));
            return;
        }
        const at = targetAt(event);
        if (at) {
            place(at);
        }
    });

    svg.on('keydown', (event: KeyboardEvent) => {
        // Cmd and Ctrl keep their browser shortcuts, such as Cmd+[ for back.
        // AltGr reports Ctrl too, and types the brackets on many layouts.
        if (event.metaKey || (event.ctrlKey && !event.getModifierState('AltGraph'))) {
            return;
        }
        const piece = pieces.find((p) => p.id === selected);
        const move = FLOOR_MOVES[event.key];
        const key = event.key.toLowerCase();
        if (move && piece) {
            moveTo(
                piece,
                {
                    column: piece.column + move[0],
                    layer: piece.layer - move[1],
                    row: piece.row + move[2]
                },
                'Moved'
            );
        } else if (move && !move[1]) {
            // Without a selection the arrow keys walk a cursor over the
            // floor, and the ghost shows where Enter places the tray box.
            hovering = undefined;
            cursor = cursor
                ? {
                      column: clamp(cursor.column + move[0], W - 1),
                      row: clamp(cursor.row + move[2], D - 1)
                  }
                : { column: W / 2, row: D / 2 };
            const at = landing(cursor);
            edit(
                `Column ${cursor.column + 1}, row ${cursor.row + 1}: ${at ? `the box lands on layer ${at.layer + 1}` : 'the box does not fit'}.`
            );
        } else if (key === 'd' && piece) {
            moveTo(
                piece,
                { ...piece, layer: dropLayer(cellMap(pieces), piece, piece.layer, piece.id) },
                'Dropped'
            );
        } else if (key === 'r') {
            if (piece) {
                turn(piece);
            } else {
                setTurned(!turned);
            }
        } else if ((event.key === 'Delete' || event.key === 'Backspace') && piece) {
            pieces = pieces.filter((p) => p !== piece);
            selected = undefined;
            edit(`Removed ${describe(piece)}.`);
        } else if ((event.key === '[' || event.key === ']') && pieces.length) {
            const n = pieces.length;
            const step = event.key === ']' ? 1 : -1;
            const index = pieces.findIndex((p) => p.id === selected);
            choose(pieces[index < 0 ? (step > 0 ? 0 : n - 1) : (index + step + n) % n]);
        } else if (event.key === 'Escape') {
            choose(undefined);
        } else if (event.key === 'Enter' && target) {
            place(target);
        } else if (Number(event.key) >= 1 && Number(event.key) <= SIZES.length) {
            setSize(Number(event.key) - 1);
        } else {
            return;
        }
        event.preventDefault();
    });

    for (const input of sizeInputs) {
        input.addEventListener('change', () => setSize(Number(input.value)));
    }

    turnInput.addEventListener('change', () => setTurned(turnInput.checked));

    for (const input of modeInputs) {
        input.addEventListener('change', () => setMode(input.value === 'move'));
    }

    button.text('empty').on('click', () => {
        pieces = [];
        selected = undefined;
        edit('Emptied the container.');
    });

    pieces = STARTER.map((piece) => ({ ...piece }));
    nextId = STARTER.length;
    render();

    return () => {
        endDrags();
        host.innerHTML = '';
        host.classList.remove('packing-playground');
    };
}

// The styles of the figure, scoped by the class of its host. VitePress puts
// the class `dark` on the root element in dark mode.
const STYLES = `
.packing-playground {
    --pp-ink: #1b1e21;
    --pp-muted: #5f6468;
    --pp-button: #f0f1f1;
    --pp-line: #c4c7c9;
    --pp-bg: #ffffff;
    --pp-floor: #eef0f1;
    --pp-grid: #b3b8bc;
    --pp-wall: rgba(27, 30, 33, 0.05);
    --pp-edge: #7d8388;
    --pp-overlap: #d03a3a;
    --pp-color-0: #2a78d6;
    --pp-color-1: #eb6834;
    --pp-color-2: #1baf7a;
    --pp-color-3: #eda100;
    --pp-color-4: #8a5cd6;
    --pp-color-5: #6b7f99;
    margin: 1.5rem 0;
    position: relative;
    overflow: hidden;
    border: 1px solid var(--pp-line);
    border-radius: 12px;
    background: var(--pp-bg);
    color: var(--pp-ink);
}

.dark .packing-playground {
    --pp-ink: #e6e8e9;
    --pp-muted: #9aa0a4;
    --pp-button: #17181a;
    --pp-line: #3d4144;
    --pp-bg: #0c0d0e;
    --pp-floor: #1a1c1e;
    --pp-grid: #43484c;
    --pp-wall: rgba(230, 232, 233, 0.06);
    --pp-edge: #8d9397;
    --pp-overlap: #f06060;
    --pp-color-0: #3987e5;
    --pp-color-1: #d95926;
    --pp-color-2: #199e70;
    --pp-color-3: #c98500;
    --pp-color-4: #9a70e0;
    --pp-color-5: #7d90a8;
}

.packing-playground .pack-svg {
    display: block;
    width: 100%;
    height: auto;
    cursor: crosshair;
    touch-action: none;
}

.packing-playground.is-moving .pack-svg {
    cursor: default;
}

.packing-playground.is-moving .piece,
.packing-playground.is-moving .overlap {
    cursor: grab;
}

.packing-playground .pack-svg:active {
    cursor: grabbing;
}

/* The browser rings a focused SVG on every click: keep the ring for the keyboard. */
.packing-playground .pack-svg:focus {
    outline: none;
}

.packing-playground .pack-svg:focus-visible {
    outline: 2px solid var(--pp-ink);
    outline-offset: -4px;
}

.packing-playground .floor {
    fill: var(--pp-floor);
}

.packing-playground .pack-floor line {
    stroke: var(--pp-grid);
    stroke-width: 0.75;
}

/* The walls that turn away: the floor and the far sides seen from inside. */
.packing-playground .pack-back .face {
    fill: var(--pp-wall);
}

.packing-playground .pack-back line,
.packing-playground .pack-front line {
    stroke: var(--pp-edge);
    stroke-width: 1.25;
}

.packing-playground .pack-front {
    pointer-events: none;
}

.packing-playground .pack-front line {
    stroke-dasharray: 5 4;
}

/* The color picks the hue, the face its shade, so the figure never sets a fill. */
.packing-playground .color-0 {
    --pp-base: var(--pp-color-0);
}

.packing-playground .color-1 {
    --pp-base: var(--pp-color-1);
}

.packing-playground .color-2 {
    --pp-base: var(--pp-color-2);
}

.packing-playground .color-3 {
    --pp-base: var(--pp-color-3);
}

.packing-playground .color-4 {
    --pp-base: var(--pp-color-4);
}

.packing-playground .color-5 {
    --pp-base: var(--pp-color-5);
}

.packing-playground .overlap {
    --pp-base: var(--pp-overlap);
}

/* Each face is stroked in its own fill, so the seams between the unit cubes
   of a box stay faint, and the boxes behind show through. */
.packing-playground .pack-cubes .face {
    --pp-shade: var(--pp-base);
    fill: var(--pp-shade);
    fill-opacity: 0.85;
    stroke: var(--pp-shade);
    stroke-opacity: 0.85;
    stroke-width: 0.5;
    stroke-linejoin: round;
}

.packing-playground .pack-cubes .face-front,
.packing-playground .pack-cubes .face-back {
    --pp-shade: color-mix(in srgb, var(--pp-base) 82%, black);
}

.packing-playground .pack-cubes .face-left,
.packing-playground .pack-cubes .face-right {
    --pp-shade: color-mix(in srgb, var(--pp-base) 66%, black);
}

.packing-playground .pack-cubes .is-selected .face {
    stroke: var(--pp-ink);
    stroke-opacity: 1;
    stroke-width: 1.25;
}

/* The ghost shows where the next box lands; it never takes the pointer, so
   the pointer always finds the box or the floor behind it. */
.packing-playground .ghost {
    pointer-events: none;
}

.packing-playground .pack-cubes .ghost .face {
    fill-opacity: 0.3;
    stroke: var(--pp-ink);
    stroke-opacity: 0.6;
    stroke-dasharray: 3 2;
}

.packing-playground .pack-button {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    padding: 0.35rem 0.9rem;
    border: 1px solid var(--pp-line);
    border-radius: 8px;
    background: var(--pp-button);
    color: var(--pp-ink);
    font-size: 0.85rem;
    cursor: pointer;
}

.packing-playground .pack-button:hover {
    border-color: var(--pp-ink);
}

.packing-playground .pack-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 1.5rem;
    padding: 0.75rem;
    border-top: 1px solid var(--pp-line);
    font-size: 0.85rem;
}

.packing-playground fieldset {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem 0.75rem;
    margin: 0;
    padding: 0;
    border: 0;
}

.packing-playground legend {
    float: left;
    color: var(--pp-muted);
}

.packing-playground label {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
}

.packing-playground .pack-readout {
    flex: 1 1 16rem;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem 0.75rem;
    margin: 0;
    /* Two lines, so an announcement does not push the page down. */
    min-height: 3em;
    color: var(--pp-muted);
    font-variant-numeric: tabular-nums;
}

.packing-playground .pack-readout span:last-child {
    flex-basis: 100%;
    color: var(--pp-ink);
}

.packing-playground meter {
    width: 8rem;
}

/* On a phone the controls stack, one to a line. */
@media (max-width: 480px) {
    .packing-playground .pack-controls {
        flex-direction: column;
        align-items: flex-start;
    }

    .packing-playground .pack-readout {
        flex-basis: auto;
    }
}
`;
