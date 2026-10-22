import { ShapeFields, TransformedPoint, Point3D } from '../types';
import { ShapeInstance, ShapeRenderer } from './shape';
import { ccw } from '../counter-clockwise';
import { centroid } from '../centroid';
import { drawTriangle } from '../draw/drawTriangle';

export type Triangle<Datum, Shape extends Datum[] = Datum[]> = TransformedPoint<Datum>[] &
    ShapeFields<Shape> & {
        ccw: boolean;
        centroid: Point3D;
    };

export interface Triangles3DInstance<Datum = Point3D> extends ShapeInstance<Datum> {
    data<Shape extends Datum[]>(data: Shape[]): Triangle<Datum, Shape>[];
    draw(triangle: TransformedPoint<Datum>[]): string;
}

class Triangles3DRenderer<Datum = Point3D>
    extends ShapeRenderer<Datum>
    implements Triangles3DInstance<Datum>
{
    data<Shape extends Datum[]>(data: Shape[]): Triangle<Datum, Shape>[] {
        return data.map((triangle) => {
            const transformedTriangles = this.transformShape(triangle) as Triangle<Datum, Shape>;

            transformedTriangles.ccw = ccw(transformedTriangles);
            transformedTriangles.centroid = centroid(transformedTriangles);

            return transformedTriangles;
        });
    }

    draw(triangle: TransformedPoint<Datum>[]): string {
        return drawTriangle(triangle);
    }
}

export function triangles3D<Datum = Point3D>(): Triangles3DInstance<Datum> {
    return new Triangles3DRenderer<Datum>();
}
