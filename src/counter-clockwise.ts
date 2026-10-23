import { TransformedPoint } from './types';

export function ccw<T>(polygon: ReadonlyArray<TransformedPoint<T>>): boolean {
    return area(polygon) > 0;
}

/** Twice the signed area of the projected polygon, positive where `ccw` is true. */
export function area<T>(polygon: ReadonlyArray<TransformedPoint<T>>): number {
    const poly = [...polygon, polygon[0]];

    let sum = 0;

    for (let i = 0; i < polygon.length; i += 1) {
        const p1 = poly[i].projected;
        const p2 = poly[i + 1].projected;

        sum += (p2.x - p1.x) * (p2.y + p1.y);
    }

    return sum;
}
