/**
 * Rotates a point in 3D space around the X, Y, and Z axes.
 *
 * @param {Object} po - The 3D point to be rotated.
 * @param {Object} angles - The angles of rotation around the X, Y, and Z axes.
 * @param {number} angles.x - The angle of rotation around the X axis in radians.
 * @param {number} angles.y - The angle of rotation around the Y axis in radians.
 * @param {number} angles.z - The angle of rotation around the Z axis in radians.
 * @param {Array<number>} angles.rotateCenter - The center of rotation.
 * @returns {Object} The rotated 3D point.
 */
export function rotateRzRyRx(po, angles) {
    const rc = angles.rotateCenter;

    po.x -= rc.x;
    po.y -= rc.y;
    po.z -= rc.z;

    const rz = rotateZ(po, angles.z);
    const ry = rotateY(rz, angles.y);
    const rx = rotateX(ry, angles.x);

    rx.x += rc.x;
    rx.y += rc.y;
    rx.z += rc.z;

    return rx;
}

/**
 * Rotates a 3D point around the X axis.
 *
 * @param {Object} p - The 3D point to be rotated.
 * @param {number} a - The angle of rotation in radians.
 * @returns {Object} The rotated 3D point.
 */
function rotateX(p, a) {
    const sa = Math.sin(a);
    const ca = Math.cos(a);

    return {
        x: p.x,
        y: p.y * ca - p.z * sa,
        z: p.y * sa + p.z * ca
    };
}

/**
 * Rotates a 3D point around the Y axis.
 *
 * @param {Object} p - The 3D point to be rotated.
 * @param {number} a - The angle of rotation in radians.
 * @returns {Object} The rotated 3D point.
 */
function rotateY(p, a) {
    const sa = Math.sin(a);
    const ca = Math.cos(a);

    return {
        x: p.z * sa + p.x * ca,
        y: p.y,
        z: p.z * ca - p.x * sa
    };
}

/**
 * Rotates a 3D point around the Z axis.
 *
 * @param {Object} p - The 3D point to be rotated.
 * @param {number} a - The angle of rotation in radians.
 * @returns {Object} The rotated 3D point.
 */
function rotateZ(p, a) {
    const sa = Math.sin(a);
    const ca = Math.cos(a);

    return {
        x: p.x * ca - p.y * sa,
        y: p.x * sa + p.y * ca,
        z: p.z
    };
}
