import {ccw}            from '../counter-clockwise';
import {centroid}       from '../centroid';
import {project}        from '../projection';
import {rotateRxRyRz}   from '../rotation';

export function quadStrip(data, options, point, angles){

    for (var i = data.length - 1; i >= 0; i--) {

        var quad = data[i];

        for (var j = quad.length - 1; j >= 0; j--) {
            var p = quad[j];

            p.rotated   = rotateRxRyRz({x : point.x(p), y : point.y(p), z : point.z(p)}, angles);
            p.projected = project(p.rotated, options);
        }
        // quad.ccw     = ccw(quad);
        // quad.centroid = centroid(quad);
    }
    return data;
}
