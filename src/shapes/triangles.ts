import { TransformedPoint, Point3D } from '../types';
import { ShapeInstance, ShapeRenderer } from './shape';
import { ccw } from '../counter-clockwise';
import { centroid } from '../centroid';
import { transform } from '../transform';
import { drawTriangle } from '../draw/drawTriangle';

export type Triangle<Datum> = TransformedPoint<Datum>[] & {
    ccw: boolean;
    centroid: Point3D;
};

interface Triangles3DInstance<Datum = Point3D> extends ShapeInstance<Datum> {
    data(data: Datum[][]): Triangle<Datum>[];
    draw(triangles: Datum[]): string;
}

class Triangles3DRenderer<Datum = Point3D>
    extends ShapeRenderer<Datum>
    implements Triangles3DInstance<Datum>
{
    data(data: Datum[][]): Triangle<Datum>[] {
        return data.map((triangle) => {
            const transformedTriangles = transform(triangle, {
                origin: this.origin(),
                rotateCenter: this.rotationCenter(),
                rotateX: this.rotateX(),
                rotateY: this.rotateY(),
                rotateZ: this.rotateZ(),
                scale: this.scale(),
                x: this.x(),
                y: this.y(),
                z: this.z()
            }) as Triangle<Datum>;

            transformedTriangles.ccw = ccw(transformedTriangles);
            transformedTriangles.centroid = centroid(transformedTriangles);

            return transformedTriangles;
        });
    }

    draw(polygons: TransformedPoint<Datum>[]): string {
        return drawTriangle(polygons);
    }
}

export function triangles3D<Datum = Point3D>(): Triangles3DInstance<Datum> {
    return new Triangles3DRenderer<Datum>();
}
