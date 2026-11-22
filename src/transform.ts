import { TransformedPoint, Point2D, Point3D, TransformOptions } from './types';
import { rotate, rotationMatrix } from './rotation';
import { perspective } from './projection-perspective';

export function transform<Datum = Point3D>(
    data: Datum[],
    options: TransformOptions<Datum>
): TransformedPoint<Datum>[] {
    const m = rotationMatrix({
        x: options.rotateX,
        y: options.rotateY,
        z: options.rotateZ,
        rotateCenter: options.rotateCenter
    });

    return data.map((point) => {
        const startPoint: Point3D = {
            x: options.x(point),
            y: options.y(point),
            z: options.z(point)
        };

        const rotated = rotate(m, startPoint, options.rotateCenter);

        const projected = perspective(rotated, {
            scale: options.scale,
            origin: options.origin,
            rotateCenter: options.rotateCenter,
            distance: options.perspective ?? Infinity
        });

        return copy(point, rotated, projected);
    });
}

/**
 * A copy of `point` with its rotated and projected position. A plain object
 * is spread, the fast path; an array stays an array and a class instance
 * keeps its prototype, so the result has the methods its type promises.
 * The two fields are passed apart, not as one object, so that the fast path
 * allocates nothing but the copy.
 *
 * shortcut: copies own enumerable fields only, so private `#fields` and the
 * internal state of built-ins such as typed arrays, `Date` or `Map` are lost;
 * handle them if a datum needs them.
 */
function copy<Datum>(point: Datum, rotated: Point3D, projected: Point2D): TransformedPoint<Datum> {
    const proto = typeof point === 'object' && point !== null ? Object.getPrototypeOf(point) : null;

    if (proto === null || proto === Object.prototype) {
        return { ...point, rotated, projected };
    }

    return Object.assign(Array.isArray(point) ? [] : Object.create(proto), point, {
        rotated,
        projected
    });
}
