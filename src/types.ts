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

/**
 * An axis aligned box in world space.
 *
 * `x`, `y` and `z` are the corner of the box, `w`, `d` and `h` its extent
 * along the three axes and `r` the corner radius of its plan outline.
 */
export interface IsoBoxSpec {
    x: number;
    y: number;
    z: number;
    w: number;
    d: number;
    h: number;
    r?: number;
}

/**
 * A rectangle in world space, described by its corner and the two vectors
 * that span it.
 */
export interface IsoPlaneSpec {
    origin: Point3D;
    u: Point3D;
    v: Point3D;
}

/**
 * One axis of a chart box in data units: its extent, from the first to the
 * last value of `domain`, and the values of its ticks.
 */
export interface AxisSpec {
    domain: number[];
    ticks: number[];
}

/**
 * The three axes of a chart box.
 */
export interface AxesSpec {
    x: AxisSpec;
    y: AxisSpec;
    z: AxisSpec;
}

/**
 * The viewport that frames a projected scene.
 */
export interface IsoFrame {
    viewBox: string;
    width: number;
    height: number;
}
