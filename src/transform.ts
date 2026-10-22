import { TransformedPoint, Point3D, TransformOptions } from './types';
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

        return {
            ...point,
            rotated,
            projected
        };
    });
}
