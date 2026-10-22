import { TransformedPoint, Point3D } from '../types';
import { ShapeInstance, ShapeRenderer } from './shape';
import { centroid } from '../centroid';
import { transform } from '../transform';
import { drawPolyline } from '../draw/drawPolyline';

export type Line<Datum> = TransformedPoint<Datum>[] & {
    centroid: Point3D;
};

export interface Lines3DInstance<Datum = Point3D> extends ShapeInstance<Datum> {
    data(data: Datum[][]): Line<Datum>[];
    draw(line: TransformedPoint<Datum>[]): string;
}

class Lines3DRenderer<Datum = Point3D>
    extends ShapeRenderer<Datum>
    implements Lines3DInstance<Datum>
{
    data(data: Datum[][]): Line<Datum>[] {
        return data.map((line) => {
            const transformedLine = transform(line, this.transformOptions()) as Line<Datum>;

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
