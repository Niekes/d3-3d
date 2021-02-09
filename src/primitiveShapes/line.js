import { centroid } from '../centroid';
import { rotateRzRyRx } from '../rotation';

// eslint-disable-next-line import/prefer-default-export
export function line(lines, options, point, angles) {
    for (let i = lines.length - 1; i >= 0; i -= 1) {
        // eslint-disable-next-line no-shadow
        const line = lines[i];

        const p1 = line[0];
        const p2 = line[1];

        p1.rotated = rotateRzRyRx({ x: point.x(p1), y: point.y(p1), z: point.z(p1) }, angles);
        p2.rotated = rotateRzRyRx({ x: point.x(p2), y: point.y(p2), z: point.z(p2) }, angles);

        p1.projected = options.project(p1.rotated, options);
        p2.projected = options.project(p2.rotated, options);

        line.centroid = centroid(line);
    }
    return lines;
}
