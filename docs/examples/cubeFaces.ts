import type { BaseType, Selection } from 'd3';
import { box, sort } from '../../index';
import type { Cube, CubeFace, CubeFaceName, Cubes3DInstance, Point3D } from '../../index';

/** A place in the grid: the column along x, the layer up from the floor and the row along z. */
export type Cell = { column: number; layer: number; row: number };

/** The neighbor behind every face, as a step in column, layer and row. */
export const STEPS: Record<CubeFaceName, [number, number, number]> = {
    front: [0, 0, 1],
    back: [0, 0, -1],
    left: [-1, 0, 0],
    right: [1, 0, 0],
    top: [0, 1, 0],
    bottom: [0, -1, 0]
};

/** The key of a cell, to join its cube by. */
export function keyOf(cell: Cell): string {
    return `${cell.column},${cell.layer},${cell.row}`;
}

/**
 * The eight corners of the unit cube in `cell`, in the order cubes3D
 * expects. A cell spans one unit from its corner, and the corner of the cell
 * 0, 0, 0 lies at `origin`; the screen y grows downwards, so the layers rise
 * towards a negative y.
 */
export function cellBox(cell: Cell, origin: Point3D): Point3D[] {
    return box({
        x: origin.x + cell.column + 0.5,
        y: origin.y - cell.layer,
        z: origin.z + cell.row + 0.5,
        width: 1,
        height: 1,
        depth: 1
    });
}

/** The cell behind a face of the cube in `cell`. */
export function neighborOf(cell: Cell, face: CubeFaceName): Cell {
    const [dc, dl, dr] = STEPS[face];
    return { column: cell.column + dc, layer: cell.layer + dl, row: cell.row + dr };
}

/**
 * Joins one path per face of a cube, keyed by the face name, and draws it.
 * A face that turns away, by default one that does not wind
 * counter-clockwise, keeps its element and is only hidden, so a drag never
 * adds or removes one.
 */
export function joinFaces<Datum, Parent extends BaseType, ParentDatum>(
    faces: Selection<SVGPathElement, CubeFace<Datum>, Parent, ParentDatum>,
    draw: (face: CubeFace<Datum>) => string,
    visible: (face: CubeFace<Datum>) => boolean = (face) => face.ccw
): void {
    faces
        .join((enter) => enter.append('path').attr('class', (d) => `face face-${d.face}`))
        .attr('visibility', (d) => (visible(d) ? null : 'hidden'))
        .attr('d', draw);
}

/**
 * Joins one group per cube of a grid, keyed by the key on its vertices, and
 * paints the groups back to front: equal cubes on a grid sort exactly by
 * their centers. The cubes are sorted before the join, so a group only
 * moves in the DOM when the order changes. Of every cube only the faces
 * that `isOpen` keeps are joined, so a face against another cube or the
 * floor never reaches the DOM. Returns the groups.
 */
export function joinCells<Datum extends Point3D & Cell & { key: string }>(
    group: Selection<SVGGElement, unknown, null, undefined>,
    cubes: Cubes3DInstance<Datum>,
    data: Datum[][],
    isOpen: (cell: Cell, face: CubeFaceName) => boolean
): Selection<SVGGElement, Cube<Datum>, SVGGElement, unknown> {
    const cubeGroups = group
        .selectAll<SVGGElement, Cube<Datum>>('g')
        .data(cubes.data(data).sort(sort), (d) => d[0].key)
        .join('g');

    joinFaces(
        cubeGroups.selectAll<SVGPathElement, CubeFace<Datum>>('path').data(
            (d) => d.faces.filter((face) => isOpen(d[0], face.face)),
            (d) => d.face
        ),
        cubes.draw
    );
    return cubeGroups;
}
