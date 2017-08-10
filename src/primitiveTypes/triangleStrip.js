import {ccw}            from '../counter-clockwise';
import {centroid}       from '../centroid';
import {project}        from '../projection';
import {rotateRxRyRz}   from '../rotation';

export function triangleStrip(data, options, point, angles){

    for (var i = data.length - 1; i >= 0; i--) {

        var tri = data[i];

        for (var j = tri.length - 1; j >= 0; j--) {
            var p = tri[j];
            p.rotated   = rotateRxRyRz({x : point.x(p), y : point.y(p), z : point.z(p)}, angles, options.pivot);
            p.projected = project(p.rotated, options);
        }

        // tri.ccw     = ccw(tri);
        // tri.centroid = centroid(tri);
    }
    return data;
}
