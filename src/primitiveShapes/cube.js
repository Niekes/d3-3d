import {centroid}       from '../centroid';
import {rotateRxRyRz}   from '../rotation';

export function cube(cubes, options, point, angles){

    for (var i = cubes.length - 1; i >= 0; i--) {

        var cube      = cubes[i];

        var p1        = cube[0];
        var p2        = cube[1];

        p1.rotated    = rotateRxRyRz({x : point.x(p1), y : point.y(p1), z : point.z(p1)}, angles);
        p2.rotated    = rotateRxRyRz({x : point.x(p2), y : point.y(p2), z : point.z(p2)}, angles);

        p1.projected  = options.project(p1.rotated, options);
        p2.projected  = options.project(p2.rotated, options);

        cube.centroid = centroid(cube);
    }
    return cubes;
}
