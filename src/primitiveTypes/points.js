import {rotateRxRyRz}   from '../rotation.js';
import {project}        from '../projection.js';

export function points(data, alpha, beta, gamma, origin, scale, distance, point){
    for (var i = data.length - 1; i >= 0; i--) {
        var p       = data[i];
        p.rotated   = rotateRxRyRz({x : point.x(p), y : point.y(p), z : point.z(p)}, alpha, beta, gamma);
        p.centroid  = p.rotated;
        p.projected = project(p.rotated, origin, scale, distance);
    }
    return data;
}
