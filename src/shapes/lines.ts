import { ShapeFields, TransformedPoint, Point3D } from '../types';
import { ShapeInstance, ShapeRenderer } from './shape';
import { centroid } from '../centroid';
import { drawPolyline } from '../draw/drawPolyline';

export type Line<Datum, Shape extends Datum[] = Datum[]> = TransformedPoint<Datum>[] &
    ShapeFields<Shape> & {
        centroid: Point3D;
    };

export interface Lines3DInstance<Datum = Point3D> extends ShapeInstance<Datum> {
    data<Shape extends Datum[]>(data: Shape[]): Line<Datum, Shape>[];
    draw(line: TransformedPoint<Datum>[]): string;
}

class Lines3DRenderer<Datum = Point3D>
    extends ShapeRenderer<Datum>
    implements Lines3DInstance<Datum>
{
    data<Shape extends Datum[]>(data: Shape[]): Line<Datum, Shape>[] {
        return data.map((line) => {
            const transformedLine = this.transformShape(line) as Line<Datum, Shape>;

            transformedLine.centroid = centroid(transformedLine);

            return transformedLine;
        });
    }

    draw(line: TransformedPoint<Datum>[]): string {
        return drawPolyline(line);
    }
}

export function lines3D<Datum = Point3D>(): Lines3DInstance<Datum> {
    return new Lines3DRenderer<Datum>();
}
