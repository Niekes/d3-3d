import { ShapeFields, TransformedPoint, Point3D } from '../types';
import { ShapeInstance, ShapeRenderer } from './shape';
import { centroid } from '../centroid';
import { drawLineStrip } from '../draw/drawLineStrip';

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
            const midpoint = strip.length / 2;
            const truncatedMidpoint = Math.trunc(midpoint);

            const transformedLineStrip = this.transformShape(strip) as LineStrip<Datum, Shape>;

            transformedLineStrip.centroid =
                truncatedMidpoint === midpoint
                    ? centroid([transformedLineStrip[midpoint - 1], transformedLineStrip[midpoint]])
                    : transformedLineStrip[truncatedMidpoint].rotated;

            return transformedLineStrip;
        });
    }

    draw(lineStrip: TransformedPoint<Datum>[]): string {
        return drawLineStrip(lineStrip);
    }
}

export function lineStrips3D<Datum = Point3D>(): LineStrips3DInstance<Datum> {
    return new LineStrips3DRenderer<Datum>();
}
