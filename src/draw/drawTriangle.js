/**
 * Draws a triangle based on projected coordinates.
 *
 * @param {Array} d - An array of points representing the triangle with projected coordinates.
 * @returns {string} The SVG path data for the drawn triangle.
 */
export const drawTriangle = (d) =>
    `M${d[0].projected.x},${d[0].projected.y}L${d[1].projected.x},${d[1].projected.y}L${d[2].projected.x},${d[2].projected.y}Z`;
