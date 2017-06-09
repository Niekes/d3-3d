import {rotateRxRyRz}   from '../rotation.js';
import {project}        from '../projection.js';

export function points(data, alpha, beta, gamma, origin, scale, distance, xFn, yFn, zFn){
    for (var i = data.length - 1; i >= 0; i--) {
        var p       = data[i];
        p.rotated   = rotateRxRyRz({x : xFn(p), y : yFn(p), z : zFn(p)}, alpha, beta, gamma);
        p.centroid  = p.rotated;
        p.projected = project(p.rotated, origin, scale, distance);
    }
    return data;
}
