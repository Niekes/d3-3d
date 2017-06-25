import {ccw}            from '../counter-clockwise';
import {centroid}       from '../centroid';
import {project}        from '../projection';
import {rotateRxRyRz}   from '../rotation';

export function quadStrip(data, options, point, angles){

    for (var i = data.length - 1; i >= 0; i--) {

        var quad = data[i];

        for (var j = quad.length - 1; j >= 0; j--) {
            var q = quad[j];
            var p1 = q[0];
            var p2 = q[1];

            p1.rotated   = rotateRxRyRz({x : point.x(p1), y : point.y(p1), z : point.z(p1)}, angles);
            p2.rotated   = rotateRxRyRz({x : point.x(p2), y : point.y(p2), z : point.z(p2)}, angles);
            p1.projected = project(p1.rotated, options);
            p2.projected = project(p2.rotated, options);
        }

        // quad.ccw     = ccw(quad);
        // quad.centroid = centroid(quad);
    }
    return data;
}
