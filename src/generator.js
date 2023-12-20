import { orthographic } from './projection-orthographic.js';
import { x as px, y as py, z as pz } from './point.js';
import { sort } from './sort.js';

/**
 * Generates 3D shapes based on specified parameters and transformations.
 *
 * @param {Function} transform - The transformation function for generating 3D shapes.
 * @param {Function|undefined} draw - The drawing function for rendering the generated 3D shapes.
 * @returns {Function} - A function that, when called with data, generates and returns an array of 3D shapes.
 */
export function generator3D(transform, draw) {
    let angleX = 0;
    let angleY = 0;
    let angleZ = 0;
    let origin = [0, 0];
    let rotateCenter = [0, 0, 0];
    let scale = 1;
    let x = px;
    let y = py;
    let z = pz;
    let rows = 0;

    /**
     * Generates 3D shapes based on specified parameters and transformations.
     *
     * @param {Object} data - The data representing the 3D shapes.
     * @returns {Object[]} - An array of 3D shapes generated with the specified parameters and transformations.
     *
     */
    function fn(data) {
        return transform(
            data,
            { scale: scale, origin: origin, project: orthographic, row: rows },
            { x: x, y: y, z: z },
            { x: angleX, y: angleY, z: angleZ, rotateCenter: rotateCenter }
        );
    }

    /**
     * Sets or retrieves the origin for rendering the 3D shapes.
     *
     * @param {number[]} [o] - The origin point for rendering the 3D shapes.
     * @returns {Function|number[]} - If no argument is provided, returns the current origin. Otherwise, sets the origin and returns the function.
     */
    fn.origin = function (o) {
        return arguments.length ? ((origin = o), fn) : origin;
    };

    /**
     * Sets or retrieves the scale factor for the 3D shapes.
     *
     * @param {number} [s] - The scale factor for the 3D shapes.
     * @returns {Function|number} - If no argument is provided, returns the current scale factor. Otherwise, sets the scale factor and returns the function.
     */
    fn.scale = function (s) {
        return arguments.length ? ((scale = s), fn) : scale;
    };

    /**
     * Sets or retrieves the rotation angle around the x-axis.
     *
     * @param {number} [ax] - The rotation angle around the x-axis.
     * @returns {Function|number} - If no argument is provided, returns the current rotation angle around the x-axis. Otherwise, sets the rotation angle and returns the function.
     */
    fn.rotateX = function (ax) {
        return arguments.length ? ((angleX = ax), fn) : angleX;
    };

    /**
     * Sets or retrieves the rotation angle around the y-axis.
     *
     * @param {number} [ay] - The rotation angle around the y-axis.
     * @returns {Function|number} - If no argument is provided, returns the current rotation angle around the y-axis. Otherwise, sets the rotation angle and returns the function.
     */
    fn.rotateY = function (ay) {
        return arguments.length ? ((angleY = ay), fn) : angleY;
    };

    /**
     * Sets or retrieves the rotation angle around the z-axis.
     *
     * @param {number} [az] - The rotation angle around the z-axis.
     * @returns {Function|number} - If no argument is provided, returns the current rotation angle around the z-axis. Otherwise, sets the rotation angle and returns the function.
     */
    fn.rotateZ = function (az) {
        return arguments.length ? ((angleZ = az), fn) : angleZ;
    };

    /**
     * Sets or retrieves the rotation center for the 3D shapes.
     *
     * @param {number[]} [rc] - The rotation center for the 3D shapes.
     * @returns {Function|number[]} - If no argument is provided, returns the current rotation center. Otherwise, sets the rotation center and returns the function.
     */
    fn.rotationCenter = function (rc) {
        return arguments.length ? ((rotateCenter = rc), fn) : rotateCenter;
    };

    /**
     * Sets or retrieves the x-coordinate for the 3D shapes.
     *
     * @param {number} [px] - The x-coordinate for the 3D shapes.
     * @returns {Function|number} - If no argument is provided, returns the current x-coordinate. Otherwise, sets the x-coordinate and returns the function.
     */
    fn.x = function (px) {
        return arguments.length ? ((x = typeof px === 'function' ? px : +px), fn) : x;
    };

    /**
     * Sets or retrieves the y-coordinate for the 3D shapes.
     *
     * @param {number} [py] - The y-coordinate for the 3D shapes.
     * @returns {Function|number} - If no argument is provided, returns the current y-coordinate. Otherwise, sets the y-coordinate and returns the function.
     */
    fn.y = function (py) {
        return arguments.length ? ((y = typeof py === 'function' ? py : +py), fn) : y;
    };

    /**
     * Sets or retrieves the z-coordinate for the 3D shapes.
     *
     * @param {number} [pz] - The z-coordinate for the 3D shapes.
     * @returns {Function|number} - If no argument is provided, returns the current z-coordinate. Otherwise, sets the z-coordinate and returns the function.
     */
    fn.z = function (pz) {
        return arguments.length ? ((z = typeof pz === 'function' ? pz : +pz), fn) : z;
    };

    /**
     * !IMPORT! ONLY FOR gridplanes
     * Sets or retrieves the rows for 3d gridplanes.
     *
     * @param {number} [pz] - The z-coordinate for the 3D shapes.
     * @returns {Function|number} - If no argument is provided, returns the current rowse. Otherwise, sets the rows and returns the function.
     */
    fn.rows = function (r) {
        return arguments.length ? ((rows = typeof r === 'function' ? r : +r), fn) : rows;
    };

    // Attach the draw function to the generator
    fn.draw = draw;

    // Attach the sort function to the generator
    fn.sort = sort;

    // Return the generator function
    return fn;
}
