import { generator3D } from '../generator.js';
import { ccw } from '../counter-clockwise.js';
import { centroid } from '../centroid.js';
import { point as pt } from './points.js';
import { drawPlane } from '../draw/drawPlane.js';

export function gridPlane(grid, options, point, angles) {
    const points = pt(grid, options, point, angles);
    const planes = [];
    const numPts = options.row;
    const numRow = points.length / numPts;
    let cnt = 0;

    for (var i = numRow - 1; i > 0; i--) {
        for (var j = numPts - 1; j > 0; j--) {
            var p1 = j + i * numPts,
                p4 = p1 - 1,
                p2 = p4 - numPts + 1,
                p3 = p2 - 1;
            var pl = [points[p1], points[p2], points[p3], points[p4]];

            pl.plane = `plane-${cnt++}`;
            pl.ccw = ccw(pl);
            pl.centroid = centroid(pl);
            planes.push(pl);
        }
    }

    return planes;
}

export function gridPlanes3D() {
    return generator3D(gridPlane, drawPlane);
}
