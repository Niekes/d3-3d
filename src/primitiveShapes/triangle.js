import {ccw}            from '../counter-clockwise';
import {centroid}       from '../centroid';
import {rotateRzRyRx}   from '../rotation';

export function triangle(triangles, options, point, angles){

    for (var i = triangles.length - 1; i >= 0; i--) {
        var tri      = triangles[i];
        var p1       = tri[0];
        var p2       = tri[1];
        var p3       = tri[2];

        p1.rotated   = rotateRzRyRx({x : point.x(p1), y : point.y(p1), z : point.z(p1)}, angles);
        p2.rotated   = rotateRzRyRx({x : point.x(p2), y : point.y(p2), z : point.z(p2)}, angles);
        p3.rotated   = rotateRzRyRx({x : point.x(p3), y : point.y(p3), z : point.z(p3)}, angles);

        p1.projected = options.project(p1.rotated, options);
        p2.projected = options.project(p2.rotated, options);
        p3.projected = options.project(p3.rotated, options);

        tri.ccw      = ccw(tri);
        tri.centroid = centroid(tri);
    }
    return triangles;
}
