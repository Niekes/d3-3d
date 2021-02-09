import { rotateRzRyRx } from '../rotation';

// eslint-disable-next-line import/prefer-default-export, no-shadow
export function point(points, options, point, angles) {
    for (let i = points.length - 1; i >= 0; i -= 1) {
        const p = points[i];

        p.rotated = rotateRzRyRx({ x: point.x(p), y: point.y(p), z: point.z(p) }, angles);
        p.centroid = p.rotated;
        p.projected = options.project(p.rotated, options);
    }

    return points;
}
