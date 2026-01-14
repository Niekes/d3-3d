import { TransformedPoint, Point3D } from '../types';
import { drawPolygon, Datum as DrawDatum } from '../draw/drawPolygon';
import { ShapeInstance, ShapeRenderer } from './shape';
import { rotateRzRyRx } from '../rotation';
import { orthographic } from '../projection-orthographic';
import { ccw } from '../counter-clockwise';
import { centroid } from '../centroid';

interface Polygons3DInstance<Datum = Point3D> extends ShapeInstance<Datum> {
    data(data: Datum[][]): Polygon<Datum>[];
    draw(polygons: Datum[]): string;
}

export type Polygon<Datum> = TransformedPoint<Datum>[] & {
    ccw: boolean;
    centroid: Point3D;
};

class Polygons3DRenderer<Datum = Point3D>
    extends ShapeRenderer<Datum>
    implements Polygons3DInstance<Datum>
{
    constructor() {
        super();
    }

    data(data: Datum[][]): Polygon<Datum>[] {
        for (let index = 0; index < data.length; index++) {
            const polygon = data[index] as Polygon<Datum>;

            for (let j = 0; j < polygon.length; j++) {
                const vertex = polygon[j];

                const startPoint: Point3D = {
                    x: this.x()(vertex),
                    y: this.y()(vertex),
                    z: this.z()(vertex)
                };

                (vertex as TransformedPoint<Datum>).projected = orthographic(startPoint, {
                    scale: this.scale(),
                    origin: this.origin()
                });

                (vertex as TransformedPoint<Datum>).rotated = rotateRzRyRx(startPoint, {
                    x: this.rotateX(),
                    y: this.rotateY(),
                    z: this.rotateZ(),
                    rotateCenter: this.rotationCenter()
                });
            }

            polygon.ccw = ccw(polygon);
            polygon.centroid = centroid(polygon);
        }

        return data as unknown as Polygon<Datum>[];
    }

    draw(polygons: Datum[]): string {
        return drawPolygon(polygons as unknown as DrawDatum[]);
    }
}

export function polygons3D<Datum = Point3D>(): Polygons3DInstance<Datum> {
    return new Polygons3DRenderer<Datum>();
}
