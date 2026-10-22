import { ShapeFields, TransformedPoint, Point3D } from '../types';
import { drawPolygon } from '../draw/drawPolygon';
import { ShapeInstance, ShapeRenderer } from './shape';
import { ccw } from '../counter-clockwise';
import { centroid } from '../centroid';

export type Polygon<Datum, Shape extends Datum[] = Datum[]> = TransformedPoint<Datum>[] &
    ShapeFields<Shape> & {
        ccw: boolean;
        centroid: Point3D;
    };

export interface Polygons3DInstance<Datum = Point3D> extends ShapeInstance<Datum> {
    data<Shape extends Datum[]>(data: Shape[]): Polygon<Datum, Shape>[];
    draw(polygon: TransformedPoint<Datum>[]): string;
}

class Polygons3DRenderer<Datum = Point3D>
    extends ShapeRenderer<Datum>
    implements Polygons3DInstance<Datum>
{
    data<Shape extends Datum[]>(data: Shape[]): Polygon<Datum, Shape>[] {
        return data.map((polygon) => {
            const transformedPolygon = this.transformShape(polygon) as Polygon<Datum, Shape>;

            transformedPolygon.ccw = ccw(transformedPolygon);
            transformedPolygon.centroid = centroid(transformedPolygon);

            return transformedPolygon;
        });
    }

    draw(polygon: TransformedPoint<Datum>[]): string {
        return drawPolygon(polygon);
    }
}

export function polygons3D<Datum = Point3D>(): Polygons3DInstance<Datum> {
    return new Polygons3DRenderer<Datum>();
}
