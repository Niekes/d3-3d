import {
    generator3D,
    type CoordinateAccessors,
    type ProjectionParams,
    type RotationConfig
} from '../generator';
import { ccw } from '../counter-clockwise';
import { centroid, type RotatedPoint } from '../centroid';
import { point as pt, type PointDatum } from './points';
import { drawPlane, type ProjectedVertex } from '../draw/drawPlane';

export type CubeFaceName = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';

export interface CubeVertex extends PointDatum {}

export type CubeFace<Datum extends CubeVertex = CubeVertex> = Datum[] & {
    centroid: RotatedPoint;
    ccw: boolean;
    face: CubeFaceName;
};

export type CubeShape<Datum extends CubeVertex = CubeVertex> = Datum[] & {
    faces?: CubeFace<Datum>[];
    centroid?: RotatedPoint;
};

function annotateFace<Datum extends CubeVertex>(
    vertices: Datum[],
    name: CubeFaceName
): CubeFace<Datum> {
    const face = vertices as CubeFace<Datum>;
    face.centroid = centroid(face);
    face.ccw = ccw(face);
    face.face = name;
    return face;
}

export function cube<Datum extends CubeVertex>(
    cubes: CubeShape<Datum>[],
    options: ProjectionParams<Datum>,
    accessors: CoordinateAccessors<Datum>,
    angles: RotationConfig
): CubeShape<Datum>[] {
    for (let i = cubes.length - 1; i >= 0; i -= 1) {
        const cubeShape = cubes[i];

        const vertices = pt(
            [
                cubeShape[0],
                cubeShape[1],
                cubeShape[2],
                cubeShape[3],
                cubeShape[4],
                cubeShape[5],
                cubeShape[6],
                cubeShape[7]
            ],
            options,
            accessors,
            angles
        );

        const v1 = vertices[0];
        const v2 = vertices[1];
        const v3 = vertices[2];
        const v4 = vertices[3];
        const v5 = vertices[4];
        const v6 = vertices[5];
        const v7 = vertices[6];
        const v8 = vertices[7];

        const front = annotateFace([v1, v2, v3, v4], 'front');
        const back = annotateFace([v8, v7, v6, v5], 'back');
        const left = annotateFace([v5, v6, v2, v1], 'left');
        const right = annotateFace([v4, v3, v7, v8], 'right');
        const top = annotateFace([v5, v1, v4, v8], 'top');
        const bottom = annotateFace([v2, v6, v7, v3], 'bottom');

        cubeShape.faces = [front, back, left, right, top, bottom];

        cubeShape.centroid = {
            x: (left.centroid.x + right.centroid.x) / 2,
            y: (top.centroid.y + bottom.centroid.y) / 2,
            z: (front.centroid.z + back.centroid.z) / 2
        };
    }

    return cubes;
}

export function cubes3D() {
    return generator3D<
        CubeShape<CubeVertex>[],
        CubeVertex,
        CubeShape<CubeVertex>[],
        ProjectedVertex[]
    >(cube, drawPlane);
}
