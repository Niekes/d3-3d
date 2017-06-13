import {rotateRxRyRz}   from '../rotation.js';
import {project}        from '../projection.js';

export function lines(data, origin, scale, point, angles){
    for (var i = data.length - 1; i >= 0; i--) {
        var line      = data[i];

        var p1        = line[0];
        var p2        = line[1];

        p1.rotated    = rotateRxRyRz({x : point.x(p1), y : point.y(p1), z : point.z(p1)}, angles);
        p2.rotated    = rotateRxRyRz({x : point.x(p2), y : point.y(p2), z : point.z(p2)}, angles);

        p1.projected  = project(p1.rotated, origin, scale);
        p2.projected  = project(p2.rotated, origin, scale);

        line.lng      = Math.sqrt(Math.pow(p2.rotated.x - p1.rotated.x, 2) + Math.pow(p2.rotated.y - p1.rotated.y, 2) + Math.pow(p2.rotated.z - p1.rotated.z, 2));
        line.centroid = {x: (p1.x + p2.x)/2, y: (p1.y + p2.y)/2, z: (p1.z + p2.z)/2};
    }
    return data;
}
