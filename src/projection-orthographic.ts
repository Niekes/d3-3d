import { Point3D, Point2D } from './types';

export interface OrthographicOptions {
    origin: Point2D;
    scale: number;
}

export interface PerspectiveOptions {
    origin: Point2D;
    focalLength: number;
    cameraZ?: number;
}

export function orthographic(d: Point3D, options: OrthographicOptions): Point2D {
    return {
        x: options.origin.x + options.scale * d.x,
        y: options.origin.y + options.scale * d.y
    };
}

export function perspective(d: Point3D, options: PerspectiveOptions): Point2D {
    const { focalLength, cameraZ } = options;
    const cZ = cameraZ ?? 0;
    const depth = focalLength + d.z - cZ;
    const scale = focalLength / depth;

    return {
        x: options.origin.x + scale * d.x,
        y: options.origin.y + scale * d.y
    };
}
