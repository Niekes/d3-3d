// eslint-disable-next-line import/prefer-default-export
export function drawPolygon(d) {
    const lastPoint = d[d.length - 1];

    let path = `M${lastPoint.projected.x},${lastPoint.projected.y}`;

    for (let i = d.length - 2; i >= 0; i -= 1) {
        const p = d[i].projected;
        path += `L${p.x},${p.y}`;
    }

    path += 'Z';

    return path;
}
