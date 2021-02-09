import { ccw } from '../counter-clockwise';
import { centroid } from '../centroid';
import { point as pt } from './point';

// eslint-disable-next-line import/prefer-default-export
export function gridPlane(grid, options, point, angles) {
    const points = pt(grid, options, point, angles);
    const planes = [];
    const numPts = options.row;
    const numRow = points.length / numPts;

    let cnt = 0;

    for (let i = numRow - 1; i > 0; i -= 1) {
        for (let j = numPts - 1; j > 0; j -= 1) {
            const p1 = j + i * numPts;
            const p4 = p1 - 1;
            const p2 = p4 - numPts + 1;
            const p3 = p2 - 1;
            const pl = [points[p1], points[p2], points[p3], points[p4]];

            pl.plane = `plane_${cnt += 1}`;
            pl.ccw = ccw(pl);
            pl.centroid = centroid(pl);
            planes.push(pl);
        }
    }

    return planes;
}
