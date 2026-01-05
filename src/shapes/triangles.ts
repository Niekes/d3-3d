import {
    generator3D,
    type CoordinateAccessors,
    type CoordinateAccessor,
    type CoordinateValue,
    type ProjectionParams,
    type RotationConfig
} from '../generator';
import { ccw, type PolygonPoint } from '../counter-clockwise';
import { centroid, type RotatedPoint } from '../centroid';
import { rotateRzRyRx } from '../rotation';
import { drawTriangle, type TriangleVertex } from '../draw/drawTriangle';
import type { Point3D } from '../point';
import type { Point2D } from '../projection-orthographic';

export interface TrianglePoint extends Point3D, PolygonPoint {
    projected?: Point2D;
}

export type TriangleShape<Datum extends TrianglePoint = TrianglePoint> = Datum[] & {
    centroid?: RotatedPoint;
    ccw?: boolean;
};

function toAccessor<Datum extends Point3D>(
    value: CoordinateValue<Datum>
): CoordinateAccessor<Datum> {
    return typeof value === 'function' ? value : () => Number(value);
}

export function triangle<Datum extends TrianglePoint>(
    triangles: TriangleShape<Datum>[],
    options: ProjectionParams<Datum>,
    accessors: CoordinateAccessors<Datum>,
    angles: RotationConfig
): TriangleShape<Datum>[] {
    const getX = toAccessor(accessors.x);
    const getY = toAccessor(accessors.y);
    const getZ = toAccessor(accessors.z);

    for (let i = triangles.length - 1; i >= 0; i -= 1) {
        const tri = triangles[i];

        for (let j = 0; j < 3; j += 1) {
            const vertex = tri[j];

            vertex.rotated = rotateRzRyRx(
                {
                    x: getX(vertex),
                    y: getY(vertex),
                    z: getZ(vertex)
                },
                angles
            );

            vertex.projected = options.project(vertex.rotated, options);
        }

        tri.ccw = ccw(tri);
        tri.centroid = centroid(tri);
    }

    return triangles;
}

export function triangles3D() {
    return generator3D<
        TriangleShape<TrianglePoint>[],
        TrianglePoint,
        TriangleShape<TrianglePoint>[],
        TriangleVertex[]
    >(triangle, drawTriangle);
}
