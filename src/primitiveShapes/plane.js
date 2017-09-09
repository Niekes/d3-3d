import {ccw}            from '../counter-clockwise';
import {centroid}       from '../centroid';
import {rotateRzRyRx}   from '../rotation';

export function plane(planes, options, point, angles){

    for (var i = planes.length - 1; i >= 0; i--) {

        var plane    = planes[i];

        var p1       = plane[0];
        var p2       = plane[1];
        var p3       = plane[2];
        var p4       = plane[3];

        p1.rotated   = rotateRzRyRx({x : point.x(p1), y : point.y(p1), z : point.z(p1)}, angles);
        p2.rotated   = rotateRzRyRx({x : point.x(p2), y : point.y(p2), z : point.z(p2)}, angles);
        p3.rotated   = rotateRzRyRx({x : point.x(p3), y : point.y(p3), z : point.z(p3)}, angles);
        p4.rotated   = rotateRzRyRx({x : point.x(p4), y : point.y(p4), z : point.z(p4)}, angles);

        p1.projected = options.project(p1.rotated, options);
        p2.projected = options.project(p2.rotated, options);
        p3.projected = options.project(p3.rotated, options);
        p4.projected = options.project(p4.rotated, options);

        plane.ccw      = ccw(plane);
        plane.centroid = centroid(plane);
    }
    return planes;
}
