import {rotateRxRyRz}   from '../rotation.js';
import {project}        from '../projection.js';

export function points(data, alpha, beta, gamma, origin, scale, distance){
    for (var i = data.length - 1; i >= 0; i--) {
        var p  		= data[i];
        p.rotated 	= rotateRxRyRz({x : p.x, y : p.y, z : p.z}, alpha, beta, gamma);
        p.projected = project(p.rotated, origin, scale, distance);
    }
    return data;
}
