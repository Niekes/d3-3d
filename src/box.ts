import { Point3D } from './types';

/**
 * The eight corners of a box in the order `cubes3D` expects: front top
 * left, front bottom left, front bottom right and front top right, then
 * the same four at the back.
 *
 * The box stands on the point (x, y, z): its footprint is centered on x and
 * z, `width` along x and `depth` along z, and it rises `height` from y
 * upwards, towards -y as on the screen. Its front is the side at +z.
 */
export function box(spec: {
    x: number;
    y: number;
    z: number;
    width: number;
    height: number;
    depth: number;
}): Point3D[] {
    const { x, y, z } = spec;
    const w = spec.width / 2;
    const d = spec.depth / 2;
    const top = y - spec.height;

    return [
        { x: x - w, y: top, z: z + d },
        { x: x - w, y, z: z + d },
        { x: x + w, y, z: z + d },
        { x: x + w, y: top, z: z + d },
        { x: x - w, y: top, z: z - d },
        { x: x - w, y, z: z - d },
        { x: x + w, y, z: z - d },
        { x: x + w, y: top, z: z - d }
    ];
}
