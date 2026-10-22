import { TransformedPoint, Point3D } from '../types';
import { ShapeInstance, ShapeRenderer } from './shape';
import { ccw } from '../counter-clockwise';
import { centroid } from '../centroid';
import { transform } from '../transform';
import { drawPlane } from '../draw/drawPlane';

export type Plane<Datum> = TransformedPoint<Datum>[] & {
    ccw: boolean;
    centroid: Point3D;
};

export interface Planes3DInstance<Datum = Point3D> extends ShapeInstance<Datum> {
    data(data: Datum[][]): Plane<Datum>[];
    draw(plane: TransformedPoint<Datum>[]): string;
}

class Planes3DRenderer<Datum = Point3D>
    extends ShapeRenderer<Datum>
    implements Planes3DInstance<Datum>
{
    data(data: Datum[][]): Plane<Datum>[] {
        return data.map((plane) => {
            const transformedPlane = transform(plane, this.transformOptions()) as Plane<Datum>;

            transformedPlane.ccw = ccw(transformedPlane);
            transformedPlane.centroid = centroid(transformedPlane);

            return transformedPlane;
        });
    }

    draw(plane: TransformedPoint<Datum>[]): string {
        return drawPlane(plane);
    }
}

export function planes3D<Datum = Point3D>(): Planes3DInstance<Datum> {
    return new Planes3DRenderer<Datum>();
}
