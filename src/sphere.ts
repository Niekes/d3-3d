import { Point3D } from './types';
import { lathe } from './lathe';

/**
 * The triangles of a sphere around the point (x, y, z): the triangles that
 * `triangles3D` expects.
 *
 * A half circle from the bottom pole to the top one is turned around the y
 * axis by `lathe` in `segments` steps, and half as many bands, rounded up,
 * run from pole to pole, so the quads between them are close to square. The
 * poles lie on the axis, so the bands next to them close in fans. Below 3
 * segments there is no sphere and the list is empty.
 *
 * Every triangle runs counter-clockwise when it is seen from outside: its
 * `normal` points outwards and `ccw` tells the front of the sphere from its
 * back.
 */
export function sphere(
    spec: { x: number; y: number; z: number; radius: number },
    segments: number
): Point3D[][] {
    const r = spec.radius;
    const bands = Math.ceil(segments / 2);
    const profile = [{ x: 0, y: r }];
    for (let i = 1; i < bands; i += 1) {
        const theta = (i / bands) * Math.PI;
        profile.push({ x: r * Math.sin(theta), y: r * Math.cos(theta) });
    }
    profile.push({ x: 0, y: -r });

    return lathe(profile, segments).map((triangle) =>
        triangle.map((p) => ({ x: p.x + spec.x, y: p.y + spec.y, z: p.z + spec.z }))
    );
}
