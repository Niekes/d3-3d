import { ShapeFields, TransformedPoint, Point3D } from '../types';
import { ShapeInstance, ShapeRenderer } from './shape';
import { ccw } from '../counter-clockwise';
import { centroid } from '../centroid';
import { drawPlane } from '../draw/drawPlane';

export type Plane<Datum, Shape extends Datum[] = Datum[]> = TransformedPoint<Datum>[] &
    ShapeFields<Shape> & {
        ccw: boolean;
        centroid: Point3D;
    };

export interface Planes3DInstance<Datum = Point3D> extends ShapeInstance<Datum> {
    data<Shape extends Datum[]>(data: Shape[]): Plane<Datum, Shape>[];
    draw(plane: TransformedPoint<Datum>[]): string;
}

class Planes3DRenderer<Datum = Point3D>
    extends ShapeRenderer<Datum>
    implements Planes3DInstance<Datum>
{
    data<Shape extends Datum[]>(data: Shape[]): Plane<Datum, Shape>[] {
        return data.map((plane) => {
            const transformedPlane = this.transformShape(plane) as Plane<Datum, Shape>;

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
