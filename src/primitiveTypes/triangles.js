import {rotateRxRyRz}   from '../rotation.js';
import {project}        from '../projection.js';

export function triangles(data, projection, alpha, beta, gamma, origin, scale, distance){
    for (var i = data.length - 1; i >= 0; i--) {
		var triangles = data[i];

        var p1       	= triangles[0];
        var p2       	= triangles[1];
        var p3       	= triangles[2];

        p1.rotated   	= rotateRxRyRz({x : p1.x, y : p1.y, z : p1.z}, alpha, beta, gamma);
        p2.rotated   	= rotateRxRyRz({x : p2.x, y : p2.y, z : p2.z}, alpha, beta, gamma);
        p3.rotated   	= rotateRxRyRz({x : p3.x, y : p3.y, z : p3.z}, alpha, beta, gamma);

        p1.projected 	= project(p1.rotated, projection, origin, scale, distance);
        p2.projected 	= project(p2.rotated, projection, origin, scale, distance);
        p3.projected 	= project(p3.rotated, projection, origin, scale, distance);

        triangles.area  = 1;
    }
    return data;
}
