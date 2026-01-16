import { TransformedPoint, Point3D, TransformOptions } from './types';
import { rotateRzRyRx } from './rotation';
import { orthographic } from './projection-orthographic';

export const transform = <Datum = Point3D>(
    data: Datum[],
    options: TransformOptions<Datum>
): TransformedPoint<Datum>[] => {
    return data.map((point) => {
        const startPoint: Point3D = {
            x: options.x(point),
            y: options.y(point),
            z: options.z(point)
        };

        const rotated = rotateRzRyRx(startPoint, {
            x: options.rotateX,
            y: options.rotateY,
            z: options.rotateZ,
            rotateCenter: options.rotateCenter
        });

        const projected = orthographic(rotated, {
            scale: options.scale,
            origin: options.origin
        });

        return {
            ...point,
            rotated,
            projected
        };
    });
};
