import {
    generator3D,
    type CoordinateAccessors,
    type CoordinateAccessor,
    type CoordinateValue,
    type ProjectionParams,
    type RotationConfig
} from '../generator';
import { ccw, type PolygonPoint as CCWPolygonPoint } from '../counter-clockwise';
import { centroid, type RotatedPoint } from '../centroid';
import { rotateRzRyRx } from '../rotation';
import { drawPolygon, type PolygonVertex } from '../draw/drawPolygon';
import type { Point3D } from '../point';
import type { Point2D } from '../projection-orthographic';

export interface PolygonPoint extends Point3D, CCWPolygonPoint {
    projected?: Point2D;
}

export type PolygonShape<Datum extends PolygonPoint = PolygonPoint> = Datum[] & {
    centroid?: RotatedPoint;
    ccw?: boolean;
};

function toAccessor<Datum extends Point3D>(
    value: CoordinateValue<Datum>
): CoordinateAccessor<Datum> {
    return typeof value === 'function' ? value : () => Number(value);
}

export function polygon<Datum extends PolygonPoint>(
    polygons: PolygonShape<Datum>[],
    options: ProjectionParams<Datum>,
    accessors: CoordinateAccessors<Datum>,
    angles: RotationConfig
): PolygonShape<Datum>[] {
    const getX = toAccessor(accessors.x);
    const getY = toAccessor(accessors.y);
    const getZ = toAccessor(accessors.z);

    for (let i = polygons.length - 1; i >= 0; i -= 1) {
        const poly = polygons[i];

        for (let j = poly.length - 1; j >= 0; j -= 1) {
            const vertex = poly[j];

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

        poly.ccw = ccw(poly);
        poly.centroid = centroid(poly);
    }

    return polygons;
}

export function polygons3D() {
    return generator3D<
        PolygonShape<PolygonPoint>[],
        PolygonPoint,
        PolygonShape<PolygonPoint>[],
        PolygonVertex[]
    >(polygon, drawPolygon);
}
