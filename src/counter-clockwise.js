/**
 * Determines if a polygon is oriented in a counter-clockwise direction.
 *
 * @param {Array} polygon - An array of vertices representing the polygon.
 * @returns {boolean} True if the polygon is counter-clockwise, false otherwise.
 */
export function ccw(polygon) {
    /**
     * Calculate the signed area of the polygon.
     * Positive area indicates a counter-clockwise orientation.
     */
    const poly = [...polygon, polygon[0]];

    let sum = 0;

    for (let i = 0; i < polygon.length; i++) {
        const j = i + 1;
        const p1 = poly[i].rotated;
        const p2 = poly[j].rotated;

        // Update the sum with the cross product of consecutive vertices
        sum += (p2.x - p1.x) * (p2.y + p1.y);
    }

    // If the area is positive, the polygon is counter-clockwise
    // This is due to the flipped y-axis in the browser
    return sum > 0;
}
