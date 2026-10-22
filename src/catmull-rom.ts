import { Point3D } from './types';

/**
 * The uniform Catmull–Rom spline through `points`, `steps` samples per
 * segment: a smooth curve that passes through every point, ready for
 * `lineStrips3D`.
 *
 * The end points stand in for their missing neighbours, so the curve starts
 * on the first point and ends on the last.
 */
export function catmullRom(points: ReadonlyArray<Point3D>, steps: number): Point3D[] {
    const last = points.length - 1;
    if (last < 0) {
        return [];
    }

    const at = (i: number) => points[Math.max(0, Math.min(last, i))];
    const samples: Point3D[] = [];

    for (let s = 0; s < last * steps; s += 1) {
        const i = Math.floor(s / steps);
        const t = (s % steps) / steps;
        const p0 = at(i - 1);
        const p1 = at(i);
        const p2 = at(i + 1);
        const p3 = at(i + 2);
        const blend = (k: keyof Point3D) =>
            0.5 *
            (2 * p1[k] +
                (p2[k] - p0[k]) * t +
                (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t ** 2 +
                (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * t ** 3);
        samples.push({ x: blend('x'), y: blend('y'), z: blend('z') });
    }

    const end = points[last];
    samples.push({ x: end.x, y: end.y, z: end.z });
    return samples;
}
