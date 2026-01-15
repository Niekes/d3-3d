import { TransformedPoint, Point3D } from '../types';
import { drawPlane, ProjectedVertex } from '../draw/drawPlane';
import { ShapeInstance, ShapeRenderer } from './shape';
import { rotateRzRyRx } from '../rotation';
import { orthographic } from '../projection-orthographic';
import { ccw } from '../counter-clockwise';
import { centroid } from '../centroid';

export type CubeFaceName = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';

export type CubeFace<Datum = Point3D> = TransformedPoint<Datum>[] & {
    centroid: Point3D;
    ccw: boolean;
    face: CubeFaceName;
};

export type CubeShape<Datum = Point3D> = TransformedPoint<Datum>[] & {
    faces?: CubeFace<Datum>[];
    centroid?: Point3D;
};

interface Cubes3DInstance<Datum = Point3D> extends ShapeInstance<Datum> {
    data(data: Datum[][]): CubeShape<Datum>[];
    draw(face: ProjectedVertex[]): string;
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
    data(data: Datum[][]): CubeShape<Datum>[] {
        for (let i = data.length - 1; i >= 0; i -= 1) {
            const cube = data[i] as unknown as CubeShape<Datum>;

            for (let j = 0; j < cube.length; j++) {
                const vertex = cube[j];

                const startPoint: Point3D = {
                    x: this.x()(vertex as Datum),
                    y: this.y()(vertex as Datum),
                    z: this.z()(vertex as Datum)
                };

                (vertex as TransformedPoint<Datum>).projected = orthographic(startPoint, {
                    scale: this.scale(),
                    origin: this.origin()
                });

                (vertex as TransformedPoint<Datum>).rotated = rotateRzRyRx(startPoint, {
                    x: this.rotateX(),
                    y: this.rotateY(),
                    z: this.rotateZ(),
                    rotateCenter: this.rotationCenter()
                });
            }

            const v = cube as unknown as TransformedPoint<Datum>[];

            const front = createFace([v[0], v[1], v[2], v[3]], 'front');
            const back = createFace([v[7], v[6], v[5], v[4]], 'back');
            const left = createFace([v[4], v[5], v[1], v[0]], 'left');
            const right = createFace([v[3], v[2], v[6], v[7]], 'right');
            const top = createFace([v[4], v[0], v[3], v[7]], 'top');
            const bottom = createFace([v[1], v[5], v[6], v[2]], 'bottom');

            cube.faces = [front, back, left, right, top, bottom];

            cube.centroid = {
                x: (left.centroid.x + right.centroid.x) / 2,
                y: (top.centroid.y + bottom.centroid.y) / 2,
                z: (front.centroid.z + back.centroid.z) / 2
            };
        }

        return data as unknown as CubeShape<Datum>[];
    }

    draw(face: ProjectedVertex[]): string {
        return drawPlane(face);
    }
}

export function cubes3D<Datum = Point3D>(): Cubes3DInstance<Datum> {
    return new Cubes3DRenderer<Datum>();
}
