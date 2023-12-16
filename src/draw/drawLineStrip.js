/**
 * Draws a line strip based on projected coordinates.
 *
 * @param {Array<Point>} lineStrip - An array of points representing the line strip with projected coordinates.
 * @returns {string} The SVG path data for the drawn line strip.
 */
export function drawLineStrip(lineStrip) {
    const lastPoint = lineStrip[lineStrip.length - 1];

    let path = `M${lastPoint.projected.x},${lastPoint.projected.y}`;

    for (var i = lineStrip.length - 2; i >= 0; i--) {
        const p = lineStrip[i].projected;
        path += `L${p.x},${p.y}`;
    }

    return path;
}
