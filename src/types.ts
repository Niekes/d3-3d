export type Point2D = {
    x: number;
    y: number;
};

export type Point3D = {
    x: number;
    y: number;
    z: number;
};

export type ProjectedPoint = Point2D & {
    projected: Point2D;
};

export type RotatedPoint = Point2D & {
    rotated: Point3D;
};

export type TransformedPoint<T> = T & {
    rotated: Point3D;
    projected: Point2D;
};

export interface RotationAngles {
    x: number;
    y: number;
    z: number;
    rotateCenter: Point3D;
}

export interface TransformOptions<Datum> {
    origin: Point2D;
    rotateCenter: Point3D;
    rotateX: number;
    rotateY: number;
    rotateZ: number;
    scale: number;
    x: (point: Datum) => number;
    y: (point: Datum) => number;
    z: (point: Datum) => number;
}
