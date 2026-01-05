export interface Point3D {
    x: number;
    y: number;
    z: number;
}

export interface RotationAngles {
    x: number;
    y: number;
    z: number;
    rotateCenter: Point3D;
}

export function rotateRzRyRx(point: Point3D, angles: RotationAngles): Point3D {
    const rc = angles.rotateCenter;

    const translated: Point3D = {
        x: point.x - rc.x,
        y: point.y - rc.y,
        z: point.z - rc.z
    };

    const rz = rotateZ(translated, angles.z);
    const ry = rotateY(rz, angles.y);
    const rx = rotateX(ry, angles.x);

    return {
        x: rx.x + rc.x,
        y: rx.y + rc.y,
        z: rx.z + rc.z
    };
}

function rotateX(p: Point3D, angle: number): Point3D {
    const sinA = Math.sin(angle);
    const cosA = Math.cos(angle);

    return {
        x: p.x,
        y: p.y * cosA - p.z * sinA,
        z: p.y * sinA + p.z * cosA
    };
}

function rotateY(p: Point3D, angle: number): Point3D {
    const sinA = Math.sin(angle);
    const cosA = Math.cos(angle);

    return {
        x: p.z * sinA + p.x * cosA,
        y: p.y,
        z: p.z * cosA - p.x * sinA
    };
}

function rotateZ(p: Point3D, angle: number): Point3D {
    const sinA = Math.sin(angle);
    const cosA = Math.cos(angle);

    return {
        x: p.x * cosA - p.y * sinA,
        y: p.x * sinA + p.y * cosA,
        z: p.z
    };
}
