export function drawPolygon(d) {
    // Start the SVG path string from the last point
    const lastPoint = d[d.length - 1];
    let path = `M${lastPoint.projected.x},${lastPoint.projected.y}`;

    // Add line segments to the path for each point
    for (let i = d.length - 2; i >= 0; i--) {
        const p = d[i].projected;

        path += `L${p.x},${p.y}`;
    }

    // Close the path to form a polygon
    path += 'Z';

    return path;
}
