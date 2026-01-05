export interface Point2D {
    x: number;
    y: number;
}

export interface Point3D {
    x: number;
    y: number;
    z: number;
}

export interface OrthographicOptions {
    origin: Point2D;
    scale: number;
}

export function orthographic(d: Point3D, options: OrthographicOptions): Point2D {
    return {
        x: options.origin.x + options.scale * d.x,
        y: options.origin.y + options.scale * d.y
    };
}
