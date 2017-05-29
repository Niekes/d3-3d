import {rotateRxRyRz}   from '../rotation.js';
import {project}        from '../projection.js';

export function lines(data, projection, alpha, beta, gamma, origin, scale, distance){
    for (var i = data.length - 1; i >= 0; i--) {
        var line      = data[i];

        var p1        = line[0];
        var p2        = line[1];

        p1.rotated    = rotateRxRyRz({x : p1.x, y : p1.y, z : p1.z}, alpha, beta, gamma);
        p2.rotated    = rotateRxRyRz({x : p2.x, y : p2.y, z : p2.z}, alpha, beta, gamma);

        p1.projected  = project(p1.rotated, projection, origin, scale, distance);
        p2.projected  = project(p2.rotated, projection, origin, scale, distance);

        line.lng      = Math.sqrt(Math.pow(p2.rotated.x - p1.rotated.x, 2) + Math.pow(p2.rotated.y - p1.rotated.y, 2) + Math.pow(p2.rotated.z - p1.rotated.z, 2));
        line.midPoint = {x: (p1.x + p2.x)/2, y: (p1.y + p2.y)/2, z: (p1.z + p2.z)/2};
    }
    return data;
}
