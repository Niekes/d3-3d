// eslint-disable-next-line import/prefer-default-export
export function ccw(polygon) {
    const p = polygon.slice(0);

    let sum = 0;

    p.push(p[0]);

    for (let i = 0; i <= polygon.length - 1; i += 1) {
        const j = i + 1;
        const p1 = p[i].rotated;
        const p2 = p[j].rotated;

        sum += (p2.x - p1.x) * (p2.y + p1.y);
    }
    // if the area is positive
    // the curve is counter-clockwise
    // because of the flipped y-Axis in the browser
    return sum > 0;
}
