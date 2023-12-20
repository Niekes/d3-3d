import { generator3D } from '../generator.js';
import { centroid } from '../centroid.js';
import { rotateRzRyRx } from '../rotation.js';
import { drawLineStrip } from '../draw/drawLineStrip.js';

export function lineStrip(lineStrip, options, point, angles) {
    for (let i = lineStrip.length - 1; i >= 0; i--) {
        const l = lineStrip[i];
        const m = l.length / 2;
        const t = parseInt(m);

        for (let j = l.length - 1; j >= 0; j--) {
            const p = l[j];

            p.rotated = rotateRzRyRx({ x: point.x(p), y: point.y(p), z: point.z(p) }, angles);
            p.projected = options.project(p.rotated, options);
        }

        l.centroid =
            t === m
                ? centroid([l[m - 1], l[m]])
                : { x: l[t].rotated.x, y: l[t].rotated.y, z: l[t].rotated.z };
    }
    return lineStrip;
}

export function lineStrips3D() {
    return generator3D(lineStrip, drawLineStrip);
}
