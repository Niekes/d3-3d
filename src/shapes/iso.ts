import { IsoBoxSpec, IsoFrame, IsoPlaneSpec, Point2D, Point3D, RotationAngles } from '../types';
import { ShapeInstance, ShapeRenderer } from './shape';
import { transform } from '../transform';
import { drawPolygon } from '../draw/drawPolygon';
import { drawPolyline } from '../draw/drawPolyline';
import { isoBoxOutline, isoFrame, isoPlaneMatrix } from '../iso';

/**
 * The affine frame of a face: the transform that carries the local
 * coordinates of the face onto the screen.
 */
export type IsoPlane = {
    matrix: string;
};

/**
 * A projected box: the two visible paths and the frames of its faces.
 */
export type IsoBox = {
    /** The rotated centre of the box, ready for `sort`. */
    centroid: Point3D;
    /** The path of the visible side of the box. */
    wall: string;
    /** The path of the top face. */
    top: string;
    topPlane: IsoPlane;
    frontPlane: IsoPlane;
    sidePlane: IsoPlane;
};

export interface Iso3DInstance extends ShapeInstance<Point3D> {
    data(data: IsoBoxSpec[]): IsoBox[];
    plane(spec: IsoPlaneSpec): IsoPlane;
    path(points: Point3D[]): string;
    project(points: Point3D[]): Point2D[];
    frame(points: Point3D[], margin?: number, aspect?: number): IsoFrame;
}

class Iso3DRenderer extends ShapeRenderer<Point3D> implements Iso3DInstance {
    data(data: IsoBoxSpec[]): IsoBox[] {
        return data.map((spec) => this.box(spec));
    }

    plane(spec: IsoPlaneSpec): IsoPlane {
        return {
            matrix: isoPlaneMatrix(
                spec.origin,
                spec.u,
                spec.v,
                this.angles(),
                this.scale(),
                this.origin()
            )
        };
    }

    path(points: Point3D[]): string {
        return drawPolyline(this.apply(points));
    }

    project(points: Point3D[]): Point2D[] {
        return this.apply(points).map((point) => point.projected);
    }

    frame(points: Point3D[], margin?: number, aspect?: number): IsoFrame {
        return isoFrame(
            this.apply(points).map((p) => p.projected),
            margin,
            aspect
        );
    }

    private box(spec: IsoBoxSpec): IsoBox {
        const box: IsoBoxSpec = {
            ...spec,
            x: this.x()(spec),
            y: this.y()(spec),
            z: this.z()(spec)
        };

        const view = this.viewDirection();
        const outline = isoBoxOutline(box, view);
        const top = box.z + box.h;
        // The faces on the side of the camera; straight down counts as +x, +y, like the wall.
        const sx = view.x >= 0 ? 1 : -1;
        const sy = view.y >= 0 ? 1 : -1;
        const near = { x: sx > 0 ? box.x + box.w : box.x, y: sy > 0 ? box.y + box.d : box.y };

        return {
            centroid: this.apply([centerOf(box)])[0].rotated,
            wall: drawPolygon(this.apply(outline.wall)),
            top: drawPolygon(this.apply(outline.top)),
            topPlane: this.plane({
                origin: { x: box.x, y: box.y, z: top },
                u: { x: 1, y: 0, z: 0 },
                v: { x: 0, y: 1, z: 0 }
            }),
            // u = normal × up, so that the local x axis reads left to right.
            frontPlane: this.plane({
                origin: { x: sy > 0 ? box.x : box.x + box.w, y: near.y, z: top },
                u: { x: sy, y: 0, z: 0 },
                v: { x: 0, y: 0, z: -1 }
            }),
            sidePlane: this.plane({
                origin: { x: near.x, y: sx > 0 ? box.y + box.d : box.y, z: top },
                u: { x: 0, y: -sx, z: 0 },
                v: { x: 0, y: 0, z: -1 }
            })
        };
    }

    private angles(): RotationAngles {
        return {
            x: this.rotateX(),
            y: this.rotateY(),
            z: this.rotateZ(),
            rotateCenter: this.rotationCenter()
        };
    }

    private apply(points: Point3D[]) {
        return transform(points, {
            ...this.transformOptions(),
            // An isometric view is orthographic, and so are the affine
            // frames of `plane`.
            perspective: Infinity,
            x: (point) => point.x,
            y: (point) => point.y,
            z: (point) => point.z
        });
    }
}

function centerOf(spec: IsoBoxSpec): Point3D {
    return {
        x: spec.x + spec.w / 2,
        y: spec.y + spec.d / 2,
        z: spec.z + spec.h / 2
    };
}

export function iso3D(): Iso3DInstance {
    return new Iso3DRenderer();
}
