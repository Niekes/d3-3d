import { ShapeFields, TransformedPoint, Point3D } from '../types';
import { ShapeInstance, ShapeRenderer } from './shape';
import { centroid } from '../centroid';
import { drawPolyline } from '../draw/drawPolyline';

export type LineStrip<Datum, Shape extends Datum[] = Datum[]> = TransformedPoint<Datum>[] &
    ShapeFields<Shape> & {
        centroid: Point3D;
    };

export interface LineStrips3DInstance<Datum = Point3D> extends ShapeInstance<Datum> {
    data<Shape extends Datum[]>(data: Shape[]): LineStrip<Datum, Shape>[];
    draw(lineStrip: TransformedPoint<Datum>[]): string;
}

class LineStrips3DRenderer<Datum = Point3D>
    extends ShapeRenderer<Datum>
    implements LineStrips3DInstance<Datum>
{
    data<Shape extends Datum[]>(data: Shape[]): LineStrip<Datum, Shape>[] {
        return data.map((strip) => {
            const length = strip.length;
            const transformedLineStrip = this.transformShape(strip) as LineStrip<Datum, Shape>;

            // The middle point, or the middle two; none for an empty strip,
            // whose centroid is then NaN, as in lines3D.
            transformedLineStrip.centroid = centroid(
                transformedLineStrip.slice(Math.ceil(length / 2) - 1, Math.floor(length / 2) + 1)
            );

            return transformedLineStrip;
        });
    }

    draw(lineStrip: TransformedPoint<Datum>[]): string {
        return drawPolyline(lineStrip);
    }
}

export function lineStrips3D<Datum = Point3D>(): LineStrips3DInstance<Datum> {
    return new LineStrips3DRenderer<Datum>();
}
