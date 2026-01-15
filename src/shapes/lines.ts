import { TransformedPoint, Point3D } from '../types';
import { ShapeInstance, ShapeRenderer } from './shape';
import { centroid } from '../centroid';
import { transform } from '../transform';

export type Line<Datum> = TransformedPoint<Datum>[] & {
    centroid: Point3D;
};

interface Lines3DInstance<Datum = Point3D> extends ShapeInstance<Datum> {
    data(data: Datum[][]): Line<Datum>[];
}

class Lines3DRenderer<Datum = Point3D>
    extends ShapeRenderer<Datum>
    implements Lines3DInstance<Datum>
{
    data(data: Datum[][]): Line<Datum>[] {
        return data.map((line) => {
            const transformedLine = transform(line, {
                origin: this.origin(),
                rotateCenter: this.rotationCenter(),
                rotateX: this.rotateX(),
                rotateY: this.rotateY(),
                rotateZ: this.rotateZ(),
                scale: this.scale(),
                x: this.x(),
                y: this.y(),
                z: this.z()
            }) as Line<Datum>;

            transformedLine.centroid = centroid(transformedLine);

            return transformedLine;
        });
    }
}

export function lines3D<Datum = Point3D>(): Lines3DInstance<Datum> {
    return new Lines3DRenderer<Datum>();
}
