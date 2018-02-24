import {ccw}            from '../counter-clockwise';
import {centroid}       from '../centroid';
import {point as pt}    from './point';

export function gridPlane(grid, options, point, angles){

    var points = pt(grid, options, point, angles);
    var cnt    = 0, planes = [];
    var numPts = options.row;
    var numRow = points.length/numPts;

    for (var i = numRow - 1; i > 0; i--) {
        for (var j = numPts - 1; j > 0; j--) {

            var p1 = j + i * numPts, p4 = p1 - 1, p2 = p4 - numPts + 1, p3 = p2 - 1;
            var pl = [points[p1], points[p2], points[p3], points[p4]];

            pl.plane    = 'plane_' + cnt++;
            pl.ccw      = ccw(pl);
            pl.centroid = centroid(pl);
            planes.push(pl);
        }
    }

    return planes;
}
