import { TransformedPoint, Point3D } from '../types';
import { drawPlane } from '../draw/drawPlane';
import { ShapeInstance, ShapeRenderer } from './shape';
import { ccw } from '../counter-clockwise';
import { centroid } from '../centroid';
import { transform } from '../transform';

export type CubeFaceName = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';

export type CubeFace<Datum = Point3D> = TransformedPoint<Datum>[] & {
    centroid: Point3D;
    ccw: boolean;
    face: CubeFaceName;
};

export type Cube<Datum = Point3D> = TransformedPoint<Datum>[] & {
    faces?: CubeFace<Datum>[];
    centroid?: Point3D;
};

interface Cubes3DInstance<Datum = Point3D> extends ShapeInstance<Datum> {
    data(data: Datum[][]): Cube<Datum>[];
    draw(face: TransformedPoint<Datum>[]): string;
}

function createFace<Datum = Point3D>(
    vertices: TransformedPoint<Datum>[],
    name: CubeFaceName
): CubeFace<Datum> {
    const face = vertices as CubeFace<Datum>;
    face.centroid = centroid(face);
    face.ccw = ccw(face);
    face.face = name;
    return face;
}

class Cubes3DRenderer<Datum = Point3D>
    extends ShapeRenderer<Datum>
    implements Cubes3DInstance<Datum>
{
    data(data: Datum[][]): Cube<Datum>[] {
        return data.map((cubeData) => {
            const transformedCube = transform(cubeData, {
                origin: this.origin(),
                rotateCenter: this.rotationCenter(),
                rotateX: this.rotateX(),
                rotateY: this.rotateY(),
                rotateZ: this.rotateZ(),
                scale: this.scale(),
                x: this.x(),
                y: this.y(),
                z: this.z()
            }) as Cube<Datum>;

            const front = createFace(
                [transformedCube[0], transformedCube[1], transformedCube[2], transformedCube[3]],
                'front'
            );

            const back = createFace(
                [transformedCube[7], transformedCube[6], transformedCube[5], transformedCube[4]],
                'back'
            );

            const left = createFace(
                [transformedCube[4], transformedCube[5], transformedCube[1], transformedCube[0]],
                'left'
            );

            const right = createFace(
                [transformedCube[3], transformedCube[2], transformedCube[6], transformedCube[7]],
                'right'
            );

            const top = createFace(
                [transformedCube[4], transformedCube[0], transformedCube[3], transformedCube[7]],
                'top'
            );

            const bottom = createFace(
                [transformedCube[1], transformedCube[5], transformedCube[6], transformedCube[2]],
                'bottom'
            );

            transformedCube.faces = [front, back, left, right, top, bottom];

            transformedCube.centroid = {
                x: (left.centroid.x + right.centroid.x) / 2,
                y: (top.centroid.y + bottom.centroid.y) / 2,
                z: (front.centroid.z + back.centroid.z) / 2
            };

            return transformedCube;
        });
    }

    draw(face: TransformedPoint<Datum>[]): string {
        return drawPlane(face);
    }
}

export function cubes3D<Datum = Point3D>(): Cubes3DInstance<Datum> {
    return new Cubes3DRenderer<Datum>();
}
