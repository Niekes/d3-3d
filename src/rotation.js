function rotateX(p, a) {
    const sa = Math.sin(a);
    const ca = Math.cos(a);

    return {
        x: p.x,
        y: p.y * ca - p.z * sa,
        z: p.y * sa + p.z * ca,
    };
}

function rotateY(p, a) {
    const sa = Math.sin(a);
    const ca = Math.cos(a);

    return {
        x: p.z * sa + p.x * ca,
        y: p.y,
        z: p.z * ca - p.x * sa,
    };
}

function rotateZ(p, a) {
    const sa = Math.sin(a);
    const ca = Math.cos(a);

    return {
        x: p.x * ca - p.y * sa,
        y: p.x * sa + p.y * ca,
        z: p.z,
    };
}

// eslint-disable-next-line import/prefer-default-export
export function rotateRzRyRx(p, angles) {
    const po = p;
    const rc = angles.rotateCenter;

    po.x -= rc[0];
    po.y -= rc[1];
    po.z -= rc[2];

    const rz = rotateZ(po, angles.z);
    const ry = rotateY(rz, angles.y);
    const rx = rotateX(ry, angles.x);

    rx.x += rc[0];
    rx.y += rc[1];
    rx.z += rc[2];

    return rx;
}
