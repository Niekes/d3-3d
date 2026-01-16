import { Point3D, TransformedPoint } from '../types';
import { ShapeInstance, ShapeRenderer } from './shape';
import { rotateRzRyRx } from '../rotation';
import { orthographic } from '../projection-orthographic';

export type Point<Datum> = TransformedPoint<Datum> & {
    centroid: Point3D;
};

interface Points3DInstance<Datum = Point3D> extends ShapeInstance<Datum> {
    data(data: Datum[]): Point<Datum>[];
}

class Points3DRenderer<Datum = Point3D>
    extends ShapeRenderer<Datum>
    implements Points3DInstance<Datum>
{
    data(data: Datum[]): Point<Datum>[] {
        return data.map((point) => {
            const startPoint: Point3D = {
                x: this.x()(point),
                y: this.y()(point),
                z: this.z()(point)
            };

            const rotated = rotateRzRyRx(startPoint, {
                x: this.rotateX(),
                y: this.rotateY(),
                z: this.rotateZ(),
                rotateCenter: this.rotationCenter()
            });

            const projected = orthographic(startPoint, {
                scale: this.scale(),
                origin: this.origin()
            });

            const centroid = rotated;

            return {
                ...point,
                rotated,
                centroid,
                projected
            };
        });
    }
}

export function points3D<Datum = Point3D>(): Points3DInstance<Datum> {
    return new Points3DRenderer<Datum>();
}
