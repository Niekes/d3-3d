import {centroid}       from '../centroid';
import {clockwise}      from '../clockwise';
import {project}        from '../projection';
import {rotateRxRyRz}   from '../rotation';

export function polygons(data, options, point, angles){

    for (var i = data.length - 1; i >= 0; i--) {

        var pol = data[i];

        for (var j = pol.length - 1; j >= 0; j--) {
            var p = pol[j];
            p.rotated   = rotateRxRyRz({x : point.x(p), y : point.y(p), z : point.z(p)}, angles);
            p.projected = project(p.rotated, options);
        }

        pol.ccw      = clockwise(pol);
        pol.centroid = centroid(pol);
    }
    return data;
}
