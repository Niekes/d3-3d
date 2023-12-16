/**
 * Draws a plane based on projected coordinates.
 *
 * @param {Array} d - An array of points representing the plane with projected coordinates.
 * @returns {string} The SVG path data for the drawn plane.
 */
export function drawPlane(d) {
    return `M${d[0].projected.x},${d[0].projected.y}L${d[1].projected.x},${d[1].projected.y}L${d[2].projected.x},${d[2].projected.y}L${d[3].projected.x},${d[3].projected.y}Z`;
}
