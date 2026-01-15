import { TransformedPoint } from './types';

export function ccw<T>(polygon: ReadonlyArray<TransformedPoint<T>>): boolean {
    const poly = [...polygon, polygon[0]];

    let sum = 0;

    for (let i = 0; i < polygon.length; i += 1) {
        const p1 = poly[i].rotated;
        const p2 = poly[i + 1].rotated;

        sum += (p2.x - p1.x) * (p2.y + p1.y);
    }

    return sum > 0;
}
