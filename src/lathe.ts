import { Point2D, Point3D } from './types';

/**
 * The surface of revolution of a profile: the triangles that `triangles3D`
 * expects.
 *
 * The profile lies in the x-y plane, x the radius and y the height, and is
 * turned around the y axis in `segments` steps. Between two rings every step
 * is a quad of two triangles. A ring of radius 0 is a single point, so a
 * quad next to it is one triangle, and a profile that starts and ends on the
 * axis closes into a solid.
 *
 * The profile runs upwards, from a large y to a small one as on the screen.
 * Then every triangle runs counter-clockwise when it is seen from outside:
 * its `normal` points outwards and `ccw` tells the outside from the inside.
 * A profile that runs downwards turns the surface inside out.
 */
export function lathe(profile: ReadonlyArray<Point2D>, segments: number): Point3D[][] {
    const ring = (p: Point2D, j: number): Point3D => {
        const phi = (j / segments) * Math.PI * 2;
        return { x: p.x * Math.cos(phi), y: p.y, z: p.x * Math.sin(phi) };
    };

    const triangles: Point3D[][] = [];
    for (let j = 0; j < segments; j += 1) {
        for (let k = 0; k < profile.length - 1; k += 1) {
            const a = ring(profile[k], j);
            const b = ring(profile[k], j + 1);
            const c = ring(profile[k + 1], j + 1);
            const d = ring(profile[k + 1], j);
            if (profile[k + 1].x !== 0) {
                triangles.push([a, d, c]);
            }
            if (profile[k].x !== 0) {
                triangles.push([a, c, b]);
            }
        }
    }
    return triangles;
}
