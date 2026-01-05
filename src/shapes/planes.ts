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
import { drawPlane, type ProjectedVertex } from '../draw/drawPlane';
import type { Point3D } from '../point';
import type { Point2D } from '../projection-orthographic';

export interface PlanePoint extends Point3D, PolygonPoint {
    projected?: Point2D;
}

export type PlaneShape<Datum extends PlanePoint = PlanePoint> = Datum[] & {
    centroid?: RotatedPoint;
    ccw?: boolean;
};

function toAccessor<Datum extends Point3D>(
    value: CoordinateValue<Datum>
): CoordinateAccessor<Datum> {
    return typeof value === 'function' ? value : () => Number(value);
}

export function plane<Datum extends PlanePoint>(
    planes: PlaneShape<Datum>[],
    options: ProjectionParams<Datum>,
    accessors: CoordinateAccessors<Datum>,
    angles: RotationConfig
): PlaneShape<Datum>[] {
    const getX = toAccessor(accessors.x);
    const getY = toAccessor(accessors.y);
    const getZ = toAccessor(accessors.z);

    for (let i = planes.length - 1; i >= 0; i -= 1) {
        const currentPlane = planes[i];

        for (let j = 0; j < 4; j += 1) {
            const vertex = currentPlane[j];

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

        currentPlane.ccw = ccw(currentPlane);
        currentPlane.centroid = centroid(currentPlane);
    }

    return planes;
}

export function planes3D() {
    return generator3D<
        PlaneShape<PlanePoint>[],
        PlanePoint,
        PlaneShape<PlanePoint>[],
        ProjectedVertex[]
    >(plane, drawPlane);
}
