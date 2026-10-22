import { Point3D } from './types';

/**
 * The eight corners of a box in the order `cubes3D` expects: front top
 * left, front bottom left, front bottom right and front top right, then
 * the same four at the back.
 *
 * The box stands on the point (x, y, z): its footprint is centered on x and
 * z, `width` along x and `depth` along z, and it rises `height` from y
 * upwards, towards -y as on the screen. Its front is the side at +z.
 *
 * `topWidth` and `topDepth` size the top apart from the footprint, for a
 * tapered shaft; a top of zero width is a ridge, one of zero size an apex.
 */
export function box(spec: {
    x: number;
    y: number;
    z: number;
    width: number;
    height: number;
    depth: number;
    topWidth?: number;
    topDepth?: number;
}): Point3D[] {
    const { x, y, z } = spec;
    const w = spec.width / 2;
    const d = spec.depth / 2;
    const tw = (spec.topWidth ?? spec.width) / 2;
    const td = (spec.topDepth ?? spec.depth) / 2;
    const top = y - spec.height;

    return [
        { x: x - tw, y: top, z: z + td },
        { x: x - w, y, z: z + d },
        { x: x + w, y, z: z + d },
        { x: x + tw, y: top, z: z + td },
        { x: x - tw, y: top, z: z - td },
        { x: x - w, y, z: z - d },
        { x: x + w, y, z: z - d },
        { x: x + tw, y: top, z: z - td }
    ];
}
