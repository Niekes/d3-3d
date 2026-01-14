import { Point2D, Point3D } from '../types';
import { HasCentroid } from '../sort';
import { x as px, y as py, z as pz } from '../point';

export interface ShapeInstance<Datum = Point3D> {
    scale(): number;
    scale(scale: number): this;

    origin(): Point2D;
    origin(origin: Point2D): this;

    rotateX(): number;
    rotateX(angle: number): this;

    rotateY(): number;
    rotateY(angle: number): this;

    rotateZ(): number;
    rotateZ(angle: number): this;

    x(): (point: Datum) => number;
    x(x: (point: Datum) => number): this;

    y(): (point: Datum) => number;
    y(y: (point: Datum) => number): this;

    z(): (point: Datum) => number;
    z(z: (point: Datum) => number): this;

    rotationCenter(): Point3D;
    rotationCenter(center: Point3D): this;
    rotationCenter(center?: Point3D): this | Point3D;
}

export class ShapeRenderer<Datum = Point3D> implements ShapeInstance<Datum> {
    private _scale: number = 1;
    private _origin: Point2D = { x: 0, y: 0 };
    private _rotateX: number = 0;
    private _rotateY: number = 0;
    private _rotateZ: number = 0;
    private _x: (point: Datum) => number = px as any;
    private _y: (point: Datum) => number = py as any;
    private _z: (point: Datum) => number = pz as any;
    private _rotationCenter: Point3D = { x: 0, y: 0, z: 0 };

    constructor() {}

    scale(): number;
    scale(scale: number): this;
    scale(scale?: number): this | number {
        return scale ? ((this._scale = scale), this) : this._scale;
    }

    origin(): Point2D;
    origin(origin: Point2D): this;
    origin(origin?: Point2D): this | Point2D {
        return origin ? ((this._origin = origin), this) : this._origin;
    }

    rotationCenter(): Point3D;
    rotationCenter(center: Point3D): this;
    rotationCenter(center?: Point3D): this | Point3D {
        return center ? ((this._rotationCenter = center), this) : this._rotationCenter;
    }

    rotateX(): number;
    rotateX(angle: number): this;
    rotateX(angle?: number): this | number {
        return angle ? ((this._rotateX = angle), this) : this._rotateX;
    }

    rotateY(): number;
    rotateY(angle: number): this;
    rotateY(angle?: number): this | number {
        return angle ? ((this._rotateY = angle), this) : this._rotateY;
    }

    rotateZ(): number;
    rotateZ(angle: number): this;
    rotateZ(angle?: number): this | number {
        return angle ? ((this._rotateZ = angle), this) : this._rotateZ;
    }

    x(): (point: Datum) => number;
    x(x: (point: Datum) => number): this;
    x(x?: (point: Datum) => number): this | ((point: Datum) => number) {
        return typeof x === 'function' ? ((this._x = x), this) : this._x;
    }

    y(): (point: Datum) => number;
    y(y: (point: Datum) => number): this;
    y(y?: (point: Datum) => number): this | ((point: Datum) => number) {
        return typeof y === 'function' ? ((this._y = y), this) : this._y;
    }

    z(): (point: Datum) => number;
    z(z: (point: Datum) => number): this;
    z(z?: (point: Datum) => number): this | ((point: Datum) => number) {
        return typeof z === 'function' ? ((this._z = z), this) : this._z;
    }
}
