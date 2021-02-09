import { ccw } from '../counter-clockwise';
import { centroid } from '../centroid';
import { rotateRzRyRx } from '../rotation';

// eslint-disable-next-line import/prefer-default-export
export function triangle(triangles, options, point, angles) {
    for (let i = triangles.length - 1; i >= 0; i -= 1) {
        const tri = triangles[i];
        const p1 = tri[0];
        const p2 = tri[1];
        const p3 = tri[2];

        p1.rotated = rotateRzRyRx({ x: point.x(p1), y: point.y(p1), z: point.z(p1) }, angles);
        p2.rotated = rotateRzRyRx({ x: point.x(p2), y: point.y(p2), z: point.z(p2) }, angles);
        p3.rotated = rotateRzRyRx({ x: point.x(p3), y: point.y(p3), z: point.z(p3) }, angles);

        p1.projected = options.project(p1.rotated, options);
        p2.projected = options.project(p2.rotated, options);
        p3.projected = options.project(p3.rotated, options);

        tri.ccw = ccw(tri);
        tri.centroid = centroid(tri);
    }
    return triangles;
}
