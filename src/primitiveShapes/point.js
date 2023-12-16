import { rotateRzRyRx } from '../rotation.js';

export function point(points, options, point, angles) {
    for (var i = points.length - 1; i >= 0; i--) {
        var p = points[i];

        p.rotated = rotateRzRyRx({ x: point.x(p), y: point.y(p), z: point.z(p) }, angles);
        p.centroid = p.rotated;
        p.projected = options.project(p.rotated, options);
    }
    return points;
}
