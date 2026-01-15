import { Point3D, TransformedPoint } from '../types';
import { ShapeInstance, ShapeRenderer } from './shape';
import { transform } from '../transform';

export type Point<Datum> = TransformedPoint<Datum>;

interface Points3DInstance<Datum = Point3D> extends ShapeInstance<Datum> {
    data(data: Datum[]): Point<Datum>[];
}

class Points3DRenderer<Datum = Point3D>
    extends ShapeRenderer<Datum>
    implements Points3DInstance<Datum>
{
    data(data: Datum[]): Point<Datum>[] {
        return transform(data, {
            origin: this.origin(),
            rotateCenter: this.rotationCenter(),
            rotateX: this.rotateX(),
            rotateY: this.rotateY(),
            rotateZ: this.rotateZ(),
            scale: this.scale(),
            x: this.x(),
            y: this.y(),
            z: this.z()
        });
    }
}

export function points3D<Datum = Point3D>(): Points3DInstance<Datum> {
    return new Points3DRenderer<Datum>();
}
