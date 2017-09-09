import {rotateRzRyRx}   from '../rotation';

export function gridPlane(planes, options, point, angles){

    for (var i = planes.length - 1; i >= 0; i--) {

        var p       = planes[i];

        p.rotated   = rotateRzRyRx({x : point.x(p), y : point.y(p), z : point.z(p)}, angles);
        p.centroid  = p.rotated;
        p.projected = options.project(p.rotated, options);
    }
    return planes;
}
