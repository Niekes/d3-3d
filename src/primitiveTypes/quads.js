import {rotateRxRyRz}   from '../rotation';
import {project}        from '../projection';
import {clockwise}      from '../clockwise';

export function quads(data, options, point, angles){

    for (var i = data.length - 1; i >= 0; i--) {

        var quad     = data[i];

        var p1       = quad[0];
        var p2       = quad[1];
        var p3       = quad[2];
        var p4       = quad[3];
        var n        = quad.length;

        p1.rotated   = rotateRxRyRz({x : point.x(p1), y : point.y(p1), z : point.z(p1)}, angles);
        p2.rotated   = rotateRxRyRz({x : point.x(p2), y : point.y(p2), z : point.z(p2)}, angles);
        p3.rotated   = rotateRxRyRz({x : point.x(p3), y : point.y(p3), z : point.z(p3)}, angles);
        p4.rotated   = rotateRxRyRz({x : point.x(p4), y : point.y(p4), z : point.z(p4)}, angles);

        p1.projected = project(p1.rotated, options);
        p2.projected = project(p2.rotated, options);
        p3.projected = project(p3.rotated, options);
        p4.projected = project(p4.rotated, options);

        quad.cw       = clockwise(quad);
        quad.centroid = { x: (p1.rotated.x + p2.rotated.x + p3.rotated.x + p4.rotated.x)/n, y: (p1.rotated.y + p2.rotated.y + p3.rotated.y + p4.rotated.y)/n, z: (p1.rotated.z + p2.rotated.z + p3.rotated.z + p4.rotated.z)/n};
    }
    return data;
}
