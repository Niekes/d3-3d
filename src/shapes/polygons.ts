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

interface Polygons3DInstance<Datum = Point3D> extends ShapeInstance<Datum> {
    data(data: Datum[][]): Polygon<Datum>[];
    draw(polygons: Datum[]): string;
}

class Polygons3DRenderer<Datum = Point3D>
    extends ShapeRenderer<Datum>
    implements Polygons3DInstance<Datum>
{
    data(data: Datum[][]): Polygon<Datum>[] {
        return data.map((polygon) => {
            const transformedPolygon = transform(polygon, {
                origin: this.origin(),
                rotateCenter: this.rotationCenter(),
                rotateX: this.rotateX(),
                rotateY: this.rotateY(),
                rotateZ: this.rotateZ(),
                scale: this.scale(),
                x: this.x(),
                y: this.y(),
                z: this.z()
            }) as Polygon<Datum>;

            transformedPolygon.ccw = ccw(transformedPolygon);
            transformedPolygon.centroid = centroid(transformedPolygon);

            return transformedPolygon;
        });
    }

    draw(polygons: TransformedPoint<Datum>[]): string {
        return drawPolygon(polygons);
    }
}

export function polygons3D<Datum = Point3D>(): Polygons3DInstance<Datum> {
    return new Polygons3DRenderer<Datum>();
}
