import {rotateRxRyRz}   from '../rotation';

export function points(data, options, point, angles){

    for (var i = data.length - 1; i >= 0; i--) {

        var p       = data[i];

        p.rotated   = rotateRxRyRz({x : point.x(p), y : point.y(p), z : point.z(p)}, angles);
        p.centroid  = p.rotated;
        p.projected = options.project(p.rotated, options);
    }
    return data;
}
