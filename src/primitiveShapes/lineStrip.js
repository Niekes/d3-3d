import { centroid } from '../centroid';
import { rotateRzRyRx } from '../rotation';

// eslint-disable-next-line import/prefer-default-export
export function lineStrip(ls, options, point, angles) {
    for (let i = ls.length - 1; i >= 0; i -= 1) {
        const l = ls[i];
        const m = l.length / 2;
        const t = Number.parseInt(m, 10);

        for (let j = l.length - 1; j >= 0; j -= 1) {
            const p = l[j];
            p.rotated = rotateRzRyRx({ x: point.x(p), y: point.y(p), z: point.z(p) }, angles);
            p.projected = options.project(p.rotated, options);
        }

        l.centroid = t === m
            ? centroid([l[m - 1], l[m]])
            : { x: l[t].rotated.x, y: l[t].rotated.y, z: l[t].rotated.z };
    }
    return ls;
}
