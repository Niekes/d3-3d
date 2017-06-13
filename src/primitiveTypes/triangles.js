import {rotateRxRyRz}   from '../rotation.js';
import {project}        from '../projection.js';

export function triangles(data, origin, scale, point, angles){
    for (var i = data.length - 1; i >= 0; i--) {
		var triangle = data[i];

        var p1       	= triangle[0];
        var p2       	= triangle[1];
        var p3       	= triangle[2];

        p1.rotated   	= rotateRxRyRz({x : point.x(p1), y : point.y(p1), z : point.z(p1)}, angles);
        p2.rotated   	= rotateRxRyRz({x : point.x(p2), y : point.y(p2), z : point.z(p2)}, angles);
        p3.rotated   	= rotateRxRyRz({x : point.x(p3), y : point.y(p3), z : point.z(p3)}, angles);

        p1.projected 	= project(p1.rotated, origin, scale);
        p2.projected 	= project(p2.rotated, origin, scale);
        p3.projected 	= project(p3.rotated, origin, scale);

        var v0 = (p2.rotated.x - p1.rotated.x) * (p2.rotated.y + p1.rotated.y);
        var v1 = (p3.rotated.x - p2.rotated.x) * (p3.rotated.y + p2.rotated.y);
        var v2 = (p1.rotated.x - p3.rotated.x) * (p1.rotated.y + p3.rotated.y);

        triangle.ccw      = v0 + v1 + v2 < 0 ? true : false;
        triangle.centroid = { x: (p1.rotated.x + p2.rotated.x + p3.rotated.x)/3, y: (p1.rotated.y + p2.rotated.y + p3.rotated.y)/3, z: (p1.rotated.z + p2.rotated.z + p3.rotated.z)/3};
    }
    return data;
}
