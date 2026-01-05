import {
    generator3D,
    type CoordinateAccessors,
    type CoordinateAccessor,
    type CoordinateValue,
    type ProjectionParams,
    type RotationConfig
} from '../generator';
import { rotateRzRyRx } from '../rotation';
import type { Point3D } from '../point';
import type { Point2D } from '../projection-orthographic';

export interface PointDatum extends Point3D {
    rotated?: Point3D;
    centroid?: Point3D;
    projected?: Point2D;
}

function toAccessor<Datum extends Point3D>(
    value: CoordinateValue<Datum>
): CoordinateAccessor<Datum> {
    return typeof value === 'function' ? value : () => Number(value);
}

export function point<Datum extends PointDatum>(
    points: Datum[],
    options: ProjectionParams<Datum>,
    accessors: CoordinateAccessors<Datum>,
    angles: RotationConfig
): Datum[] {
    const getX = toAccessor(accessors.x);
    const getY = toAccessor(accessors.y);
    const getZ = toAccessor(accessors.z);

    for (let i = points.length - 1; i >= 0; i -= 1) {
        const current = points[i];

        const rotated = rotateRzRyRx(
            {
                x: getX(current),
                y: getY(current),
                z: getZ(current)
            },
            angles
        );

        current.rotated = rotated;
        current.centroid = rotated;
        current.projected = options.project(rotated, options);
    }

    return points;
}

export function points3D() {
    return generator3D<PointDatum[], PointDatum, PointDatum[]>(point, undefined);
}
