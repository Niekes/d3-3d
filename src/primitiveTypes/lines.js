import {rotateRxRyRz}   from '../rotation';
import {project}        from '../projection';

export function lines(data, options, point, angles){

    for (var i = data.length - 1; i >= 0; i--) {

        var line      = data[i];

        var p1        = line[0];
        var p2        = line[1];

        p1.rotated    = rotateRxRyRz({x : point.x(p1), y : point.y(p1), z : point.z(p1)}, angles);
        p2.rotated    = rotateRxRyRz({x : point.x(p2), y : point.y(p2), z : point.z(p2)}, angles);

        p1.projected  = project(p1.rotated, options);
        p2.projected  = project(p2.rotated, options);

        line.centroid = {x: (p1.x + p2.x)/2, y: (p1.y + p2.y)/2, z: (p1.z + p2.z)/2};
    }
    return data;
}
