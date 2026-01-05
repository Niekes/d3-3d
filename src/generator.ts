import { orthographic, type Point2D } from './projection-orthographic';
import { x as px, y as py, z as pz } from './point';
import type { Point3D } from './point';
import { sort } from './sort';

export type CoordinateAccessor<Datum extends Point3D> = (datum: Datum) => number;
export type CoordinateValue<Datum extends Point3D> = number | CoordinateAccessor<Datum>;
export type RowsAccessor<Datum extends Point3D> = (datum: Datum) => number;
export type RowsValue<Datum extends Point3D> = number | RowsAccessor<Datum>;

export interface CoordinateAccessors<Datum extends Point3D> {
    x: CoordinateValue<Datum>;
    y: CoordinateValue<Datum>;
    z: CoordinateValue<Datum>;
}

export interface ProjectionParams<Datum extends Point3D> {
    scale: number;
    origin: Point2D;
    project: typeof orthographic;
    row: RowsValue<Datum>;
}

export interface RotationConfig {
    x: number;
    y: number;
    z: number;
    rotateCenter: Point3D;
}

export type TransformFn<Data, Datum extends Point3D, Result> = (
    data: Data,
    projection: ProjectionParams<Datum>,
    accessors: CoordinateAccessors<Datum>,
    rotation: RotationConfig
) => Result;

export type DrawFn<Shape, Output = unknown> = (shape: Shape) => Output;

export interface Generator3D<Data, Datum extends Point3D, Result, Shape = Result> {
    (data: Data): Result;
    origin(): Point2D;
    origin(value: Point2D): Generator3D<Data, Datum, Result, Shape>;
    scale(): number;
    scale(value: number): Generator3D<Data, Datum, Result, Shape>;
    rotateX(): number;
    rotateX(value: number): Generator3D<Data, Datum, Result, Shape>;
    rotateY(): number;
    rotateY(value: number): Generator3D<Data, Datum, Result, Shape>;
    rotateZ(): number;
    rotateZ(value: number): Generator3D<Data, Datum, Result, Shape>;
    rotationCenter(): Point3D;
    rotationCenter(value: Point3D): Generator3D<Data, Datum, Result, Shape>;
    x(): CoordinateValue<Datum>;
    x(value: CoordinateValue<Datum>): Generator3D<Data, Datum, Result, Shape>;
    y(): CoordinateValue<Datum>;
    y(value: CoordinateValue<Datum>): Generator3D<Data, Datum, Result, Shape>;
    z(): CoordinateValue<Datum>;
    z(value: CoordinateValue<Datum>): Generator3D<Data, Datum, Result, Shape>;
    rows(): RowsValue<Datum>;
    rows(value: RowsValue<Datum>): Generator3D<Data, Datum, Result, Shape>;
    draw?: DrawFn<Shape>;
    sort: typeof sort;
}

export function generator3D<
    Data,
    Datum extends Point3D = Point3D,
    Result = unknown,
    Shape = Result
>(
    transform: TransformFn<Data, Datum, Result>,
    draw?: DrawFn<Shape>
): Generator3D<Data, Datum, Result, Shape> {
    let angleX = 0;
    let angleY = 0;
    let angleZ = 0;
    let origin: Point2D = { x: 0, y: 0 };
    let rotateCenter: Point3D = { x: 0, y: 0, z: 0 };
    let scale = 1;
    let xAccessor: CoordinateValue<Datum> = px;
    let yAccessor: CoordinateValue<Datum> = py;
    let zAccessor: CoordinateValue<Datum> = pz;
    let rows: RowsValue<Datum> = 0;

    const fn = ((data: Data) =>
        transform(
            data,
            { scale, origin, project: orthographic, row: rows },
            { x: xAccessor, y: yAccessor, z: zAccessor },
            { x: angleX, y: angleY, z: angleZ, rotateCenter }
        )) as Generator3D<Data, Datum, Result, Shape>;

    fn.origin = ((value?: Point2D) => {
        if (value === undefined) {
            return origin;
        }
        origin = value;
        return fn;
    }) as Generator3D<Data, Datum, Result, Shape>['origin'];

    fn.scale = ((value?: number) => {
        if (value === undefined) {
            return scale;
        }
        scale = value;
        return fn;
    }) as Generator3D<Data, Datum, Result, Shape>['scale'];

    fn.rotateX = ((value?: number) => {
        if (value === undefined) {
            return angleX;
        }
        angleX = value;
        return fn;
    }) as Generator3D<Data, Datum, Result, Shape>['rotateX'];

    fn.rotateY = ((value?: number) => {
        if (value === undefined) {
            return angleY;
        }
        angleY = value;
        return fn;
    }) as Generator3D<Data, Datum, Result, Shape>['rotateY'];

    fn.rotateZ = ((value?: number) => {
        if (value === undefined) {
            return angleZ;
        }
        angleZ = value;
        return fn;
    }) as Generator3D<Data, Datum, Result, Shape>['rotateZ'];

    fn.rotationCenter = ((value?: Point3D) => {
        if (value === undefined) {
            return rotateCenter;
        }
        rotateCenter = value;
        return fn;
    }) as Generator3D<Data, Datum, Result, Shape>['rotationCenter'];

    fn.x = ((value?: CoordinateValue<Datum>) => {
        if (value === undefined) {
            return xAccessor;
        }
        xAccessor = typeof value === 'function' ? value : Number(value);
        return fn;
    }) as Generator3D<Data, Datum, Result, Shape>['x'];

    fn.y = ((value?: CoordinateValue<Datum>) => {
        if (value === undefined) {
            return yAccessor;
        }
        yAccessor = typeof value === 'function' ? value : Number(value);
        return fn;
    }) as Generator3D<Data, Datum, Result, Shape>['y'];

    fn.z = ((value?: CoordinateValue<Datum>) => {
        if (value === undefined) {
            return zAccessor;
        }
        zAccessor = typeof value === 'function' ? value : Number(value);
        return fn;
    }) as Generator3D<Data, Datum, Result, Shape>['z'];

    fn.rows = ((value?: RowsValue<Datum>) => {
        if (value === undefined) {
            return rows;
        }
        rows = typeof value === 'function' ? value : Number(value);
        return fn;
    }) as Generator3D<Data, Datum, Result, Shape>['rows'];

    fn.draw = draw;
    fn.sort = sort;

    return fn;
}
