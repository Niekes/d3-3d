/**
 * Converts a point from 3D space to 2D space using orthographic projection.
 *
 * @param {Object} d - The 3D point to be projected.
 * @param {Object} options - Options for the projection.
 * @param {Array} options.origin - The origin point for the projection.
 * @param {number} options.scale - The scale factor for the projection.
 * @returns {Object} The projected point in 2D space.
 */
export function orthographic(d, options) {
    /**
     * @typedef {Object} Point2D
     * @property {number} x - The x-coordinate in 2D space.
     * @property {number} y - The y-coordinate in 2D space.
     */

    /**
     * @type {Point2D}
     */
    return {
        x: options.origin.x + options.scale * d.x,
        y: options.origin.y + options.scale * d.y
    };
}
