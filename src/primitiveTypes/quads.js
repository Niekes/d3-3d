import {ccw}            from '../counter-clockwise';
import {centroid}       from '../centroid';
import {project}        from '../projection';
import {rotateRxRyRz}   from '../rotation';

export function quads(data, options, point, angles){

    for (var i = data.length - 1; i >= 0; i--) {

        var quad     = data[i];

        var p1       = quad[0];
        var p2       = quad[1];
        var p3       = quad[2];
        var p4       = quad[3];

        p1.rotated   = rotateRxRyRz({x : point.x(p1), y : point.y(p1), z : point.z(p1)}, angles, options.pivot);
        p2.rotated   = rotateRxRyRz({x : point.x(p2), y : point.y(p2), z : point.z(p2)}, angles, options.pivot);
        p3.rotated   = rotateRxRyRz({x : point.x(p3), y : point.y(p3), z : point.z(p3)}, angles, options.pivot);
        p4.rotated   = rotateRxRyRz({x : point.x(p4), y : point.y(p4), z : point.z(p4)}, angles, options.pivot);

        p1.projected = project(p1.rotated, options);
        p2.projected = project(p2.rotated, options);
        p3.projected = project(p3.rotated, options);
        p4.projected = project(p4.rotated, options);

        quad.ccw      = ccw(quad);
        quad.centroid = centroid(quad);
    }
    return data;
}
