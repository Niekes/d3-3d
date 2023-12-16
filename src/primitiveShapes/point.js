import { rotateRzRyRx } from '../rotation.js';
import { orthographic } from '../projection-orthographic.js';
import { x as px, y as py, z as pz } from '../point.js';
import { sort } from '../sort.js';

export function point(points, options, point, angles) {
    for (let i = points.length - 1; i >= 0; i--) {
        const p = points[i];

        p.rotated = rotateRzRyRx({ x: point.x(p), y: point.y(p), z: point.z(p) }, angles);
        p.centroid = p.rotated;
        p.projected = options.project(p.rotated, options);
    }
    return points;
}

/**
 * Creates a 3D point renderer with customizable transformations.
 *
 * @returns {function} The 3D point rendering function.
 *
 * @param {object} data - The data representing the 3D point.
 * @param {object} options - Options for rendering, including scale, origin, and projection.
 * @param {object} coordinates - Coordinates of the 3D point.
 * @param {object} angles - Rotation angles for the 3D point.
 *
 * @typedef {function} points3D
 *
 * @property {function} origin - Getter/setter for the origin of the 3D point.
 * @property {function} scale - Getter/setter for the scale of the 3D point.
 * @property {function} rotateX - Getter/setter for the X-axis rotation angle.
 * @property {function} rotateY - Getter/setter for the Y-axis rotation angle.
 * @property {function} rotateZ - Getter/setter for the Z-axis rotation angle.
 * @property {function} rotateCenter - Getter/setter for the rotation center.
 * @property {function} x - Getter/setter for the X-coordinate of the 3D point.
 * @property {function} y - Getter/setter for the Y-coordinate of the 3D point.
 * @property {function} z - Getter/setter for the Z-coordinate of the 3D point.
 * @property {function} sort - Sorting function for the 3D point.
 */
export function points3D() {
    let angleX = 0;
    let angleY = 0;
    let angleZ = 0;
    let origin = [0, 0];
    let rotateCenter = [0, 0, 0];
    let scale = 1;
    let x = px;
    let y = py;
    let z = pz;

    function fn(data) {
        return point(
            data,
            { scale: scale, origin: origin, project: orthographic },
            { x: x, y: y, z: z },
            { x: angleX, y: angleY, z: angleZ, rotateCenter: rotateCenter }
        );
    }

    fn.origin = function (o) {
        return arguments.length ? ((origin = o), fn) : origin;
    };

    fn.scale = function (s) {
        return arguments.length ? ((scale = s), fn) : scale;
    };

    fn.rotateX = function (ax) {
        return arguments.length ? ((angleX = ax), fn) : angleX;
    };

    fn.rotateY = function (ay) {
        return arguments.length ? ((angleY = ay), fn) : angleY;
    };

    fn.rotateZ = function (az) {
        return arguments.length ? ((angleZ = az), fn) : angleZ;
    };

    fn.rotateCenter = function (rc) {
        return arguments.length ? ((rotateCenter = rc), fn) : rotateCenter;
    };

    fn.x = function (px) {
        return arguments.length ? ((x = typeof px === 'function' ? px : +px), fn) : x;
    };

    fn.y = function (py) {
        return arguments.length ? ((y = typeof py === 'function' ? py : +py), fn) : y;
    };

    fn.z = function (pz) {
        return arguments.length ? ((z = typeof pz === 'function' ? pz : +pz), fn) : z;
    };

    fn.sort = sort;

    return fn;
}
