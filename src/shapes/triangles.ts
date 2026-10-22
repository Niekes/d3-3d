import { TransformedPoint, Point3D } from '../types';
import { ShapeInstance, ShapeRenderer } from './shape';
import { ccw } from '../counter-clockwise';
import { centroid } from '../centroid';
import { transform } from '../transform';
import { drawTriangle } from '../draw/drawTriangle';

export type Triangle<Datum> = TransformedPoint<Datum>[] & {
    ccw: boolean;
    centroid: Point3D;
};

export interface Triangles3DInstance<Datum = Point3D> extends ShapeInstance<Datum> {
    data(data: Datum[][]): Triangle<Datum>[];
    draw(triangle: TransformedPoint<Datum>[]): string;
}

class Triangles3DRenderer<Datum = Point3D>
    extends ShapeRenderer<Datum>
    implements Triangles3DInstance<Datum>
{
    data(data: Datum[][]): Triangle<Datum>[] {
        return data.map((triangle) => {
            const transformedTriangles = transform(
                triangle,
                this.transformOptions()
            ) as Triangle<Datum>;

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
