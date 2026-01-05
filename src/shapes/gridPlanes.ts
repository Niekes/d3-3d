import {
    generator3D,
    type CoordinateAccessors,
    type ProjectionParams,
    type RotationConfig,
    type RowsValue
} from '../generator';
import { ccw } from '../counter-clockwise';
import { centroid, type RotatedPoint } from '../centroid';
import { point as pt, type PointDatum } from './points';
import { drawPlane, type ProjectedVertex } from '../draw/drawPlane';
import type { Point3D } from '../point';

export interface GridPoint extends PointDatum {}

export type GridPlaneFace<Datum extends GridPoint = GridPoint> = Datum[] & {
    plane?: string;
    centroid?: RotatedPoint;
    ccw?: boolean;
};

function resolveRowsValue<Datum extends Point3D>(
    rowValue: RowsValue<Datum>,
    sample?: Datum
): number {
    if (typeof rowValue === 'function') {
        if (sample === undefined) {
            throw new Error('gridPlane: cannot resolve row accessor without a sample datum');
        }
        return Number(rowValue(sample));
    }
    return Number(rowValue);
}

export function gridPlane<Datum extends GridPoint>(
    grid: Datum[],
    options: ProjectionParams<Datum>,
    accessors: CoordinateAccessors<Datum>,
    angles: RotationConfig
): GridPlaneFace<Datum>[] {
    if (grid.length === 0) {
        return [];
    }

    const points = pt(grid, options, accessors, angles);
    const numPts = resolveRowsValue(options.row, grid[0]);

    if (!Number.isFinite(numPts) || numPts <= 0) {
        throw new Error('gridPlane: options.row must resolve to a positive number');
    }

    const numRows = points.length / numPts;
    const planes: GridPlaneFace<Datum>[] = [];
    let counter = 0;

    for (let row = numRows - 1; row > 0; row -= 1) {
        for (let col = numPts - 1; col > 0; col -= 1) {
            const p1 = col + row * numPts;
            const p4 = p1 - 1;
            const p2 = p4 - numPts + 1;
            const p3 = p2 - 1;

            const face = [points[p1], points[p2], points[p3], points[p4]] as GridPlaneFace<Datum>;

            face.plane = `plane-${counter}`;
            face.ccw = ccw(face);
            face.centroid = centroid(face);

            planes.push(face);
            counter += 1;
        }
    }

    return planes;
}

export function gridPlanes3D() {
    return generator3D<GridPoint[], GridPoint, GridPlaneFace<GridPoint>[], ProjectedVertex[]>(
        gridPlane,
        drawPlane
    );
}
