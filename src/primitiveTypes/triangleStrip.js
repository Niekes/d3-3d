import {centroid}       from '../centroid';
import {clockwise}      from '../clockwise';
import {project}        from '../projection';
import {rotateRxRyRz}   from '../rotation';

export function triangleStrip(data, options, point, angles){

    for (var i = data.length - 1; i >= 0; i--) {

        var tri = data[i];

        for (var j = tri.length - 1; j >= 0; j--) {
            var p = tri[j];
            p.rotated   = rotateRxRyRz({x : point.x(p), y : point.y(p), z : point.z(p)}, angles);
            p.projected = project(p.rotated, options);
        }

        tri.ccw      = clockwise(tri);
        tri.centroid = centroid(tri);
    }
    return data;
}
