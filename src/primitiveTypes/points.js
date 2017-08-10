import {rotateRxRyRz}   from '../rotation';
import {project}        from '../projection';

export function points(data, options, point, angles){

    for (var i = data.length - 1; i >= 0; i--) {

        var p       = data[i];

        p.rotated   = rotateRxRyRz({x : point.x(p), y : point.y(p), z : point.z(p)}, angles, options.pivot);
        p.centroid  = p.rotated;
        p.projected = project(p.rotated, options);
    }
    return data;
}
