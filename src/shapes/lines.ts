import { TransformedPoint, Point3D } from '../types';
import { ShapeInstance, ShapeRenderer } from './shape';
import { ccw } from '../counter-clockwise';
import { centroid } from '../centroid';
import { transform } from '../transform';

export type Line<Datum> = TransformedPoint<Datum>[] & {
    ccw: boolean;
    centroid: Point3D;
};

interface Lines3DInstance<Datum = Point3D> extends ShapeInstance<Datum> {
    data(data: Datum[][]): Line<Datum>[];
}

class Lines3DRenderer<Datum = Point3D>
    extends ShapeRenderer<Datum>
    implements Lines3DInstance<Datum>
{
    data(data: Datum[][]): Line<Datum>[] {
        return data.map((line) => {
            const transformedLine = transform(line, {
                origin: this.origin(),
                rotateCenter: this.rotationCenter(),
                rotateX: this.rotateX(),
                rotateY: this.rotateY(),
                rotateZ: this.rotateZ(),
                scale: this.scale(),
                x: this.x(),
                y: this.y(),
                z: this.z()
            }) as Line<Datum>;

            transformedLine.centroid = centroid(transformedLine);

            return transformedLine;
        });
    }
}

export function lines3D<Datum = Point3D>(): Lines3DInstance<Datum> {
    return new Lines3DRenderer<Datum>();
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
import { centroid } from '../centroid';
import { rotateRzRyRx } from '../rotation';
import type { Point3D } from '../point';
import type { Point2D } from '../projection-orthographic';

export interface LinePoint extends Point3D {
    rotated?: Point3D;
    projected?: Point2D;
}

export type LineSegment<Datum extends LinePoint = LinePoint> = [Datum, Datum] & {
    centroid?: Point3D;
};

function toAccessor<Datum extends Point3D>(
    value: CoordinateValue<Datum>
): CoordinateAccessor<Datum> {
    return typeof value === 'function' ? value : () => Number(value);
}

export function line<Datum extends LinePoint>(
    lines: LineSegment<Datum>[],
    options: ProjectionParams<Datum>,
    accessors: CoordinateAccessors<Datum>,
    angles: RotationConfig
): LineSegment<Datum>[] {
    const getX = toAccessor(accessors.x);
    const getY = toAccessor(accessors.y);
    const getZ = toAccessor(accessors.z);

    for (let i = lines.length - 1; i >= 0; i -= 1) {
        const segment = lines[i];
        const p1 = segment[0];
        const p2 = segment[1];

        p1.rotated = rotateRzRyRx({ x: getX(p1), y: getY(p1), z: getZ(p1) }, angles);
        p2.rotated = rotateRzRyRx({ x: getX(p2), y: getY(p2), z: getZ(p2) }, angles);

        p1.projected = options.project(p1.rotated, options);
        p2.projected = options.project(p2.rotated, options);

        segment.centroid = centroid(segment);
    }

    return lines;
}

export function lines3D() {
    return generator3D<LineSegment<LinePoint>[], LinePoint, LineSegment<LinePoint>[]>(
        line,
        undefined
    );
}
*/
