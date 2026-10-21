import type { TransformedPoint } from '../types';

/**
 * The projected vertex as an `x,y` pair of a path, rounded to three
 * decimals like `d3.pathRound()`: invisible on screen, but it keeps the path
 * strings the browser parses on every frame short.
 */
export function drawVertex<T>(vertex: TransformedPoint<T>): string {
    return `${round(vertex.projected.x)},${round(vertex.projected.y)}`;
}

function round(value: number): number {
    return Math.round(value * 1000) / 1000;
}
