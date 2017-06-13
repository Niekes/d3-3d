import {rotateRxRyRz}   from '../rotation';
import {project}        from '../projection';

export function lineStrip(data, options, point, angles){

    for (var i = data.length - 1; i >= 0; i--) {

        var l = data[i];

        for (var j = l.length - 1; j >= 0; j--) {
            var p = l[j];
            p.rotated   = rotateRxRyRz({x : point.x(p), y : point.y(p), z : point.z(p)}, angles);
            p.projected = project(p.rotated, options);
        }
    }

    return data;
}
