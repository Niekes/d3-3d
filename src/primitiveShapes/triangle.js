import { ccw } from '../counter-clockwise.js';
import { centroid } from '../centroid.js';
import { rotateRzRyRx } from '../rotation.js';
import { orthographic } from '../projection-orthographic.js';
import { x as px, y as py, z as pz } from '../point.js';
import { sort } from '../sort.js';
import { drawTriangle } from '../draw/drawTriangle.js';

export function triangle(triangles, options, point, angles) {
    for (let i = triangles.length - 1; i >= 0; i--) {
        const tri = triangles[i];
        const p1 = tri[0];
        const p2 = tri[1];
        const p3 = tri[2];

        p1.rotated = rotateRzRyRx({ x: point.x(p1), y: point.y(p1), z: point.z(p1) }, angles);
        p2.rotated = rotateRzRyRx({ x: point.x(p2), y: point.y(p2), z: point.z(p2) }, angles);
        p3.rotated = rotateRzRyRx({ x: point.x(p3), y: point.y(p3), z: point.z(p3) }, angles);

        p1.projected = options.project(p1.rotated, options);
        p2.projected = options.project(p2.rotated, options);
        p3.projected = options.project(p3.rotated, options);

        tri.ccw = ccw(tri);
        tri.centroid = centroid(tri);
    }
    return triangles;
}

/**
 * Creates a 3D triangle renderer with customizable transformations.
 *
 * @returns {function} The 3D triangle rendering function.
 *
 * @param {object} data - The data representing the 3D triangle.
 * @param {object} options - Options for rendering, including scale, origin, and projection.
 * @param {object} coordinates - Coordinates of the 3D triangle.
 * @param {object} angles - Rotation angles for the 3D triangle.
 *
 * @typedef {function} triangles3D
 *
 * @property {function} origin - Getter/setter for the origin of the 3D triangle.
 * @property {function} scale - Getter/setter for the scale of the 3D triangle.
 * @property {function} rotateX - Getter/setter for the X-axis rotation angle.
 * @property {function} rotateY - Getter/setter for the Y-axis rotation angle.
 * @property {function} rotateZ - Getter/setter for the Z-axis rotation angle.
 * @property {function} rotateCenter - Getter/setter for the rotation center.
 * @property {function} x - Getter/setter for the X-coordinate of the 3D triangle.
 * @property {function} y - Getter/setter for the Y-coordinate of the 3D triangle.
 * @property {function} z - Getter/setter for the Z-coordinate of the 3D triangle.
 * @property {function} draw - Function to draw the 3D triangle.
 * @property {function} sort - Sorting function for the 3D triangle.
 */
export function triangles3D() {
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
        return triangle(
            data,
            { scale: scale, origin: origin, project: orthographic },
            { x: x, y: y, z: z },
            { x: angleX, y: angleY, z: angleZ, rotateCenter: rotateCenter }
        );
    }

    fn.origin = (o) => {
        return arguments.length ? ((origin = o), fn) : origin;
    };

    fn.scale = (s) => {
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

    fn.draw = drawTriangle;

    fn.sort = sort;

    return fn;
}
