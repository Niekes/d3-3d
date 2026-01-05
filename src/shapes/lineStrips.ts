import {
    generator3D,
    type CoordinateAccessors,
    type CoordinateAccessor,
    type CoordinateValue,
    type ProjectionParams,
    type RotationConfig
} from '../generator';
import { centroid, type RotatedPoint } from '../centroid';
import { rotateRzRyRx } from '../rotation';
import { drawLineStrip, type LineStripVertex } from '../draw/drawLineStrip';
import type { Point3D } from '../point';
import type { Point2D } from '../projection-orthographic';

export interface LineStripPoint extends Point3D {
    rotated?: Point3D;
    projected?: Point2D;
}

export type LineStripPath<Datum extends LineStripPoint = LineStripPoint> = Datum[] & {
    centroid?: RotatedPoint;
};

function toAccessor<Datum extends Point3D>(
    value: CoordinateValue<Datum>
): CoordinateAccessor<Datum> {
    return typeof value === 'function' ? value : () => Number(value);
}

export function lineStrip<Datum extends LineStripPoint>(
    lineStrips: LineStripPath<Datum>[],
    options: ProjectionParams<Datum>,
    accessors: CoordinateAccessors<Datum>,
    angles: RotationConfig
): LineStripPath<Datum>[] {
    const getX = toAccessor(accessors.x);
    const getY = toAccessor(accessors.y);
    const getZ = toAccessor(accessors.z);

    for (let i = lineStrips.length - 1; i >= 0; i -= 1) {
        const strip = lineStrips[i];
        const midpoint = strip.length / 2;
        const truncatedMidpoint = Math.trunc(midpoint);

        for (let j = strip.length - 1; j >= 0; j -= 1) {
            const vertex = strip[j];

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

        if (truncatedMidpoint === midpoint) {
            strip.centroid = centroid([strip[midpoint - 1], strip[midpoint]]);
        } else {
            const middle = strip[truncatedMidpoint].rotated;
            if (middle === undefined) {
                throw new Error('lineStrip: middle vertex lacks rotated coordinates');
            }
            strip.centroid = middle;
        }
    }

    return lineStrips;
}

export function lineStrips3D() {
    return generator3D<
        LineStripPath<LineStripPoint>[],
        LineStripPoint,
        LineStripPath<LineStripPoint>[],
        LineStripVertex[]
    >(lineStrip, drawLineStrip);
}
