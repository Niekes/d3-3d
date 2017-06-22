import {centroid}       from '../centroid';
import {project}        from '../projection';
import {rotateRxRyRz}   from '../rotation';

export function lineStrip(data, options, point, angles){

    for (var i = data.length - 1; i >= 0; i--) {

        var l = data[i];

        for (var j = l.length - 1; j >= 0; j--) {
            var p = l[j];
            p.rotated   = rotateRxRyRz({x : point.x(p), y : point.y(p), z : point.z(p)}, angles);
            p.projected = project(p.rotated, options);
        }

        var mid = l.length/2;
        var int = parseInt(mid);
        l.centroid = mid === int ? centroid([ l[mid - 1], l[mid] ]) : {x: point.x(l[int]), y: point.y(l[int]), z: point.z(l[int])};
    }


    return data;
}
