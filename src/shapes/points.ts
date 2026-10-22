import { Point3D, TransformedPoint } from '../types';
import { ShapeInstance, ShapeRenderer } from './shape';
import { transform } from '../transform';

export type Point<Datum> = TransformedPoint<Datum> & {
    centroid: Point3D;
};

export interface Points3DInstance<Datum = Point3D> extends ShapeInstance<Datum> {
    data(data: Datum[]): Point<Datum>[];
}

class Points3DRenderer<Datum = Point3D>
    extends ShapeRenderer<Datum>
    implements Points3DInstance<Datum>
{
    data(data: Datum[]): Point<Datum>[] {
        return transform(data, this.transformOptions()).map((transformed) => {
            const point = transformed as Point<Datum>;
            point.centroid = point.rotated;
            return point;
        });
    }
}

export function points3D<Datum = Point3D>(): Points3DInstance<Datum> {
    return new Points3DRenderer<Datum>();
}
