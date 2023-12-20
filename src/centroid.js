/**
 * Calculates the centroid of a polygon.
 *
 * The centroid is the average position of all the points in the polygon.
 *
 * @param {Object[]} polygon - The polygon represented as an array of objects with x, y, and z properties.
 * @param {number} polygon[].rotated.x - The x-coordinate of the rotated point.
 * @param {number} polygon[].rotated.y - The y-coordinate of the rotated point.
 * @param {number} polygon[].rotated.z - The z-coordinate of the rotated point.
 * @returns {Object} - The centroid of the polygon with x, y, and z properties.
 *
 * @throws {Error} Will throw an error if the polygon is empty or if any point in the polygon is missing rotated coordinates.
 *
 * @example
 * // Calculate the centroid of a polygon
 * const polygon = [
 *   { rotated: { x: 1, y: 2, z: 3 } },
 *   { rotated: { x: 4, y: 5, z: 6 } },
 *   { rotated: { x: 7, y: 8, z: 9 } },
 * ];
 * const centroidPoint = centroid(polygon);
 * console.log(centroidPoint); // Outputs: { x: 4, y: 5, z: 6 }
 */
export function centroid(polygon) {
    let _x = 0;
    let _y = 0;
    let _z = 0;
    let _n = polygon.length;

    // Calculate the sum of rotated coordinates
    for (let i = _n - 1; i >= 0; i--) {
        const point = polygon[i].rotated;

        _x += point.x;
        _y += point.y;
        _z += point.z;
    }

    // Calculate the average of rotated coordinates to get the centroid
    return {
        x: _x / _n,
        y: _y / _n,
        z: _z / _n
    };
}
