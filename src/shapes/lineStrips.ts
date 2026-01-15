import { TransformedPoint, Point3D } from '../types';
import { ShapeInstance, ShapeRenderer } from './shape';
import { centroid } from '../centroid';
import { transform } from '../transform';
import { drawLineStrip } from '../draw/drawLineStrip';

export type LineStrip<Datum> = TransformedPoint<Datum>[] & {
    centroid: Point3D;
};

interface LineStrips3DInstance<Datum = Point3D> extends ShapeInstance<Datum> {
    data(data: Datum[][]): LineStrip<Datum>[];
    draw(lineStrips: Datum[]): string;
}

class LineStrips3DRenderer<Datum = Point3D>
    extends ShapeRenderer<Datum>
    implements LineStrips3DInstance<Datum>
{
    data(data: Datum[][]): LineStrip<Datum>[] {
        return data.map((strip) => {
            const midpoint = strip.length / 2;
            const truncatedMidpoint = Math.trunc(midpoint);

            const transformedLineStrip = transform(strip, {
                origin: this.origin(),
                rotateCenter: this.rotationCenter(),
                rotateX: this.rotateX(),
                rotateY: this.rotateY(),
                rotateZ: this.rotateZ(),
                scale: this.scale(),
                x: this.x(),
                y: this.y(),
                z: this.z()
            }) as LineStrip<Datum>;

            transformedLineStrip.centroid =
                truncatedMidpoint === midpoint
                    ? centroid([transformedLineStrip[midpoint - 1], transformedLineStrip[midpoint]])
                    : transformedLineStrip[truncatedMidpoint].rotated;

            return transformedLineStrip;
        });
    }

    draw(lineStrips: TransformedPoint<Datum>[]): string {
        return drawLineStrip(lineStrips);
    }
}

export function lineStrips3D<Datum = Point3D>(): LineStrips3DInstance<Datum> {
    return new LineStrips3DRenderer<Datum>();
}

/**
 *
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

*/
