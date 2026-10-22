import { TransformedPoint, Point3D } from '../types';
import { drawPolygon } from '../draw/drawPolygon';
import { ShapeInstance, ShapeRenderer } from './shape';
import { ccw } from '../counter-clockwise';
import { centroid } from '../centroid';
import { transform } from '../transform';

export type Polygon<Datum> = TransformedPoint<Datum>[] & {
    ccw: boolean;
    centroid: Point3D;
};

export interface Polygons3DInstance<Datum = Point3D> extends ShapeInstance<Datum> {
    data(data: Datum[][]): Polygon<Datum>[];
    draw(polygon: TransformedPoint<Datum>[]): string;
}

class Polygons3DRenderer<Datum = Point3D>
    extends ShapeRenderer<Datum>
    implements Polygons3DInstance<Datum>
{
    data(data: Datum[][]): Polygon<Datum>[] {
        return data.map((polygon) => {
            const transformedPolygon = transform(
                polygon,
                this.transformOptions()
            ) as Polygon<Datum>;

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
