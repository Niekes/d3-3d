import { Point3D, Point2D } from './types';
import { OrthographicOptions } from './projection-orthographic';

export interface PerspectiveOptions extends OrthographicOptions {
    rotateCenter: Point3D;
    /** The distance of the eye from the rotation center, in model units. */
    distance: number;
}

/**
 * Projects a rotated point as seen from an eye `distance` in front of the
 * rotation center, on the rotated z axis that points towards the viewer.
 *
 * A point in the plane of the center keeps the scale of `orthographic`, a
 * nearer one is drawn larger and a farther one smaller, by
 * `k = distance / (distance − (z − center.z))`. An infinite distance gives
 * `k = 1`: the orthographic projection. The point has to lie in front of
 * the eye.
 */
export function perspective(d: Point3D, options: PerspectiveOptions): Point2D {
    const c = options.rotateCenter;
    // k − 1 rather than k, so that an infinite distance is exactly orthographic.
    const k1 = 1 / (1 - (d.z - c.z) / options.distance) - 1;

    return {
        x: options.origin.x + options.scale * (d.x + (d.x - c.x) * k1),
        y: options.origin.y + options.scale * (d.y + (d.y - c.y) * k1)
    };
}
