import { generator3D } from '../generator.js';
import { rotateRzRyRx } from '../rotation.js';

export function point(points, options, point, angles) {
    for (let i = points.length - 1; i >= 0; i--) {
        const p = points[i];

        p.rotated = rotateRzRyRx({ x: point.x(p), y: point.y(p), z: point.z(p) }, angles);
        p.centroid = p.rotated;
        p.projected = options.project(p.rotated, options);
    }
    return points;
}

export function points3D() {
    return generator3D(point, undefined);
}
