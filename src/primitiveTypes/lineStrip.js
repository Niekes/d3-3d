import {centroid}       from '../centroid';
import {project}        from '../projection';
import {rotateRxRyRz}   from '../rotation';

export function lineStrip(data, options, point, angles){

    for (var i = data.length - 1; i >= 0; i--) {

        var l = data[i], m = l.length/2, t = parseInt(m);

        for (var j = l.length - 1; j >= 0; j--) {
            var p = l[j];
            p.rotated   = rotateRxRyRz({x : point.x(p), y : point.y(p), z : point.z(p)}, angles, options.pivot);
            p.projected = project(p.rotated, options);
        }

        l.centroid = t === m ? centroid([ l[m - 1], l[m] ]) : { x: l[t].rotated.x, y: l[t].rotated.y, z: l[t].rotated.z };
    }


    return data;
}
