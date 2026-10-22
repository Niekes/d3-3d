import { Point2D, Point3D, TransformOptions } from '../types';
import { x as px, y as py, z as pz } from '../point';
import { unproject } from '../unproject';
import { projectionMatrix } from '../projection-matrix';
import { rotationMatrix } from '../rotation';

/**
 * The view of a scene: how it is turned, scaled and placed on the screen.
 * Every shape is a camera, and `camera3D()` is a camera without data.
 */
export interface Camera3DInstance {
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

    rotationCenter(): Point3D;
    rotationCenter(center: Point3D): this;
    rotationCenter(center?: Point3D): this | Point3D;

    camera(camera: Camera3DInstance): this;

    unproject(point: Point2D, planePoint: Point3D, planeNormal: Point3D): Point3D | null;

    matrix(): Float32Array;

    viewDirection(): Point3D;
}

export interface ShapeInstance<Datum = Point3D> extends Camera3DInstance {
    x(): (point: Datum) => number;
    x(x: (point: Datum) => number): this;

    y(): (point: Datum) => number;
    y(y: (point: Datum) => number): this;

    z(): (point: Datum) => number;
    z(z: (point: Datum) => number): this;
}

export class ShapeRenderer<Datum = Point3D> implements ShapeInstance<Datum> {
    // One object, so that `camera()` can share it between renderers.
    private view: Omit<TransformOptions<unknown>, 'x' | 'y' | 'z'> = {
        scale: 1,
        origin: { x: 0, y: 0 },
        rotateX: 0,
        rotateY: 0,
        rotateZ: 0,
        rotateCenter: { x: 0, y: 0, z: 0 }
    };
    private _x: (point: Datum) => number = px as any;
    private _y: (point: Datum) => number = py as any;
    private _z: (point: Datum) => number = pz as any;

    scale(): number;
    scale(scale: number): this;
    scale(scale?: number): this | number {
        return scale === undefined ? this.view.scale : ((this.view.scale = scale), this);
    }

    origin(): Point2D;
    origin(origin: Point2D): this;
    origin(origin?: Point2D): this | Point2D {
        return origin === undefined ? this.view.origin : ((this.view.origin = origin), this);
    }

    rotationCenter(): Point3D;
    rotationCenter(center: Point3D): this;
    rotationCenter(center?: Point3D): this | Point3D {
        return center === undefined
            ? this.view.rotateCenter
            : ((this.view.rotateCenter = center), this);
    }

    rotateX(): number;
    rotateX(angle: number): this;
    rotateX(angle?: number): this | number {
        return angle === undefined ? this.view.rotateX : ((this.view.rotateX = angle), this);
    }

    rotateY(): number;
    rotateY(angle: number): this;
    rotateY(angle?: number): this | number {
        return angle === undefined ? this.view.rotateY : ((this.view.rotateY = angle), this);
    }

    rotateZ(): number;
    rotateZ(angle: number): this;
    rotateZ(angle?: number): this | number {
        return angle === undefined ? this.view.rotateZ : ((this.view.rotateZ = angle), this);
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

    /**
     * Shares the view of `camera`, a `camera3D()` or another shape: from
     * then on, turning, scaling or moving either of them changes both. The
     * renderer gives up the view it had, so call `camera` before the other
     * setters, and hang all renderers of a scene on one camera.
     */
    camera(camera: Camera3DInstance): this {
        if (!(camera instanceof ShapeRenderer)) {
            throw new TypeError('camera() expects camera3D() or a shape');
        }
        this.view = camera.view;
        return this;
    }

    /**
     * The world point on the plane through `planePoint` with the normal
     * `planeNormal` that this renderer projects to the screen point `point`,
     * or `null` when the plane is seen edge-on.
     */
    unproject(point: Point2D, planePoint: Point3D, planeNormal: Point3D): Point3D | null {
        return unproject(point, planePoint, planeNormal, this.transformOptions());
    }

    /**
     * The projection of this renderer as a column-major 4×4 matrix, for a
     * WebGL uniform or for `projectPositions`.
     */
    matrix(): Float32Array {
        return projectionMatrix(this.transformOptions());
    }

    /**
     * The direction from the scene towards the viewer, a unit vector in
     * world coordinates: the rotated depth of a point `p` is
     * `dot(viewDirection, p − center) + center.z`. A face whose normal
     * points along it faces the camera.
     */
    viewDirection(): Point3D {
        const m = rotationMatrix({
            x: this.view.rotateX,
            y: this.view.rotateY,
            z: this.view.rotateZ,
            rotateCenter: this.view.rotateCenter
        });
        return { x: m[6], y: m[7], z: m[8] };
    }

    /**
     * The transform options described by the current renderer state.
     *
     * Every shape module transforms its input the same way, so the wiring
     * lives here instead of being repeated in each shape.
     */
    protected transformOptions(): TransformOptions<Datum> {
        return { ...this.view, x: this.x(), y: this.y(), z: this.z() };
    }
}

/**
 * A camera without data: one view for several shapes, for a canvas or for a
 * WebGL shader.
 */
export function camera3D(): Camera3DInstance {
    return new ShapeRenderer();
}
