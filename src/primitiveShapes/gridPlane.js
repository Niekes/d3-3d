import {ccw}            from '../counter-clockwise';
import {centroid}       from '../centroid';
import {point as pt}    from './point';

export function gridPlane(grid, options, point, angles){

    var points = pt(grid, options, point, angles);
    var row    = options.row, cnt = 0, planes = [];
    var numRow = row ? row : Math.sqrt(grid.length) - 1;

    for (var i = numRow; i > 0; i--) {
        for (var j = numRow; j > 0; j--) {

            var p1 = j + i * (numRow + 1), p4 = p1 - 1, p2 = p4 - numRow, p3 = p2 - 1;
            var pl = [points[p1], points[p2], points[p3], points[p4]];

            pl.id       = 'plane_' + cnt++;
            pl.ccw      = ccw(pl);
            pl.centroid = centroid(pl);
            planes.push(pl);
        }
    }
    return planes;
}
