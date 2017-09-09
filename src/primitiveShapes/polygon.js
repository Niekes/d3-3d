import {ccw}            from '../counter-clockwise';
import {centroid}       from '../centroid';
import {rotateRzRyRx}   from '../rotation';

export function polygon(polygons, options, point, angles){

    for (var i = polygons.length - 1; i >= 0; i--) {

        var ploygon = polygons[i];

        for (var j = ploygon.length - 1; j >= 0; j--) {
            var p = ploygon[j];
            p.rotated   = rotateRzRyRx({x : point.x(p), y : point.y(p), z : point.z(p)}, angles);
            p.projected = options.project(p.rotated, options);
        }

        ploygon.ccw      = ccw(ploygon);
        ploygon.centroid = centroid(ploygon);
    }
    return polygons;
}
