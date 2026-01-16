import { TransformedPoint, Point3D } from '../types';
import { ShapeInstance, ShapeRenderer } from './shape';
import { centroid } from '../centroid';
import { transform } from '../transform';
import { drawLineStrip } from '../draw/drawLineStrip';

export type LineStrip<Datum> = TransformedPoint<Datum>[] & {
    centroid: Point3D;
};

interface LineStrips3DInstance<Datum = Point3D> extends ShapeInstance<Datum> {
    data(data: Datum[][]): LineStrip<Datum>[];
    draw(lineStrips: Datum[]): string;
}

class LineStrips3DRenderer<Datum = Point3D>
    extends ShapeRenderer<Datum>
    implements LineStrips3DInstance<Datum>
{
    data(data: Datum[][]): LineStrip<Datum>[] {
        return data.map((strip) => {
            const midpoint = strip.length / 2;
            const truncatedMidpoint = Math.trunc(midpoint);

            const transformedLineStrip = transform(strip, {
                origin: this.origin(),
                rotateCenter: this.rotationCenter(),
                rotateX: this.rotateX(),
                rotateY: this.rotateY(),
                rotateZ: this.rotateZ(),
                scale: this.scale(),
                x: this.x(),
                y: this.y(),
                z: this.z()
            }) as LineStrip<Datum>;

            transformedLineStrip.centroid =
                truncatedMidpoint === midpoint
                    ? centroid([transformedLineStrip[midpoint - 1], transformedLineStrip[midpoint]])
                    : transformedLineStrip[truncatedMidpoint].rotated;

            return transformedLineStrip;
        });
    }

    draw(lineStrips: TransformedPoint<Datum>[]): string {
        return drawLineStrip(lineStrips);
    }
}

export function lineStrips3D<Datum = Point3D>(): LineStrips3DInstance<Datum> {
    return new LineStrips3DRenderer<Datum>();
}
