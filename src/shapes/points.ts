import { TransformedPoint, Point3D } from '../types';
import { ShapeInstance, ShapeRenderer } from './shape';
import { rotateRzRyRx } from '../rotation';
import { orthographic } from '../projection-orthographic';

interface Points3DInstance<Datum = Point3D> extends ShapeInstance<Datum> {
    data(data: Datum[]): Point<Datum>[];
}

export type Point<Datum> = TransformedPoint<Datum> & {
    centroid: Point3D;
};

class Points3DRenderer<Datum = Point3D>
    extends ShapeRenderer<Datum>
    implements Points3DInstance<Datum>
{
    constructor() {
        super();
    }

    data(data: Datum[]): Point<Datum>[] {
        for (let index = 0; index < data.length; index++) {
            const point = data[index] as Point<Datum>;

            const startPoint: Point3D = {
                x: this.x()(point as Datum),
                y: this.y()(point as Datum),
                z: this.z()(point as Datum)
            };

            (point as TransformedPoint<Datum>).rotated = rotateRzRyRx(startPoint, {
                x: this.rotateX(),
                y: this.rotateY(),
                z: this.rotateZ(),
                rotateCenter: this.rotationCenter()
            });

            (point as TransformedPoint<Datum>).projected = orthographic(startPoint, {
                scale: this.scale(),
                origin: this.origin()
            });

            point.centroid = point.rotated;
        }

        return data as unknown as Point<Datum>[];
    }
}

export function points3D<Datum = Point3D>(): Points3DInstance<Datum> {
    return new Points3DRenderer<Datum>();
}
