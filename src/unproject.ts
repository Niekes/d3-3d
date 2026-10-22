import { Point2D, Point3D, TransformOptions } from './types';
import { rotationMatrix } from './rotation';

/**
 * The world point on a plane that projects to `point` on the screen.
 *
 * A projection drops the depth, so a screen point stands for a whole ray:
 * along the view direction in an orthographic view, from the eye in
 * perspective. The plane through `planePoint` with the normal `planeNormal`
 * picks one point of that ray. Both the plane and the result are in world
 * coordinates, the values the `x`, `y` and `z` accessors return.
 *
 * Returns `null` when the plane is seen edge-on and the ray never meets it,
 * or when it meets it only behind the eye.
 */
export function unproject<Datum>(
    point: Point2D,
    planePoint: Point3D,
    planeNormal: Point3D,
    options: TransformOptions<Datum>
): Point3D | null {
    const m = rotationMatrix({
        x: options.rotateX,
        y: options.rotateY,
        z: options.rotateZ,
        rotateCenter: options.rotateCenter
    });
    const rc = options.rotateCenter;
    const d = options.perspective ?? Infinity;

    // The screen point in view space, relative to the rotation center, in
    // the plane of the center, where both projections agree.
    const x = (point.x - options.origin.x) / options.scale - rc.x;
    const y = (point.y - options.origin.y) / options.scale - rc.y;

    // The ray back in world space: the inverse of a rotation is its
    // transpose, so the view z axis turns into the third row of `m`. The
    // ray runs from that point towards the eye, `d` in front of the center,
    // which for an infinite `d` is along the view z axis.
    const ax = m[0] * x + m[3] * y + rc.x;
    const ay = m[1] * x + m[4] * y + rc.y;
    const az = m[2] * x + m[5] * y + rc.z;
    const dx = m[6] - (m[0] * x + m[3] * y) / d;
    const dy = m[7] - (m[1] * x + m[4] * y) / d;
    const dz = m[8] - (m[2] * x + m[5] * y) / d;

    const n = planeNormal;
    const denom = n.x * dx + n.y * dy + n.z * dz;

    if (Math.abs(denom) < 1e-9) {
        return null;
    }

    const t = (n.x * (planePoint.x - ax) + n.y * (planePoint.y - ay) + n.z * (planePoint.z - az)) / denom;

    // The eye sits at t = d.
    if (t >= d) {
        return null;
    }

    return { x: ax + t * dx, y: ay + t * dy, z: az + t * dz };
}
