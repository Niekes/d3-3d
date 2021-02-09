// eslint-disable-next-line import/prefer-default-export
export function centroid(polygon) {
    const n = polygon.length;

    let x = 0;
    let y = 0;
    let z = 0;

    for (let i = n - 1; i >= 0; i -= 1) {
        x += polygon[i].rotated.x;
        y += polygon[i].rotated.y;
        z += polygon[i].rotated.z;
    }

    return {
        x: x / n,
        y: y / n,
        z: z / n,
    };
}
