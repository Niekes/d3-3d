export interface Point3D {
    x: number;
    y: number;
    z: number;
}

export function x(p: Point3D): number {
    return p.x;
}

export function y(p: Point3D): number {
    return p.y;
}

export function z(p: Point3D): number {
    return p.z;
}
