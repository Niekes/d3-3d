import { Point3D } from './types';

/**
 * The unit normal of a polygon, by Newell's method: exact for a flat
 * polygon of any size, an average for a slightly bent one.
 *
 * It points to the side from which the vertices run counter-clockwise on
 * the screen, where y grows downwards: the side `ccw` reports. So the faces
 * of `cubes3D` point outwards, and a face faces the camera where
 * `dot(normal, viewDirection) > 0`.
 *
 * Returns the zero vector for a polygon without an area.
 */
export function normal(polygon: ReadonlyArray<Point3D>): Point3D {
    let x = 0;
    let y = 0;
    let z = 0;

    polygon.forEach((p, i) => {
        const q = polygon[(i + 1) % polygon.length];
        x += (q.y - p.y) * (p.z + q.z);
        y += (q.z - p.z) * (p.x + q.x);
        z += (q.x - p.x) * (p.y + q.y);
    });

    const length = Math.hypot(x, y, z);
    return length === 0 ? { x: 0, y: 0, z: 0 } : { x: x / length, y: y / length, z: z / length };
}
