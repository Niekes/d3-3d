import { Point3D, RotationAngles } from './types';

export function rotateRzRyRx(point: Point3D, angles: RotationAngles): Point3D {
    return rotate(rotationMatrix(angles), point, angles.rotateCenter);
}

/**
 * The rotation `R = Rx · Ry · Rz` as nine numbers, row by row: a point is
 * turned around z first, then around y, then around x.
 *
 * Building the matrix costs the six sines and cosines once, so a shape pays
 * for them once per `data()` call instead of once per point.
 */
export function rotationMatrix(angles: RotationAngles): number[] {
    const sx = Math.sin(angles.x);
    const cx = Math.cos(angles.x);
    const sy = Math.sin(angles.y);
    const cy = Math.cos(angles.y);
    const sz = Math.sin(angles.z);
    const cz = Math.cos(angles.z);

    return [
        cy * cz,
        -cy * sz,
        sy,
        sx * sy * cz + cx * sz,
        cx * cz - sx * sy * sz,
        -sx * cy,
        sx * sz - cx * sy * cz,
        cx * sy * sz + sx * cz,
        cx * cy
    ];
}

/** Applies the rotation `m` to `point` around `center`. */
export function rotate(m: number[], point: Point3D, center: Point3D): Point3D {
    const x = point.x - center.x;
    const y = point.y - center.y;
    const z = point.z - center.z;

    return {
        x: m[0] * x + m[1] * y + m[2] * z + center.x,
        y: m[3] * x + m[4] * y + m[5] * z + center.y,
        z: m[6] * x + m[7] * y + m[8] * z + center.z
    };
}
