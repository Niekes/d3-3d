import { TransformedPoint, Point3D } from '../types';
import { drawPolygon } from '../draw/drawPolygon';
import { ShapeInstance, ShapeRenderer } from './shape';
import { rotateRzRyRx } from '../rotation';
import { orthographic } from '../projection-orthographic';

interface Polygons3DInstance<Datum = Point3D> extends ShapeInstance<Datum> {
    data(data: Datum[][]): TransformedPoint<Datum>[][];
    draw(polygons: Datum[]): string;
}

class Polygons3DRenderer<Datum = Point3D>
    extends ShapeRenderer<Datum>
    implements Polygons3DInstance<Datum>
{
    constructor() {
        super();
    }

    data(data: Datum[][]): TransformedPoint<Datum>[][] {
        for (let index = 0; index < data.length; index++) {
            const polygon = data[index];

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
        }

        return data as TransformedPoint<Datum>[][];
    }

    draw(polygons: Datum[]): string {
        return drawPolygon(polygons as TransformedPoint<Datum>[]);
    }
}

export function polygons3D<Datum = Point3D>(): Polygons3DInstance<Datum> {
    return new Polygons3DRenderer<Datum>();
}
