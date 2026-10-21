import type { TransformedPoint } from '../types';
import { drawVertex } from './drawVertex';

/**
 * The shared polyline path: starts at the last vertex and walks backwards
 * to the first one.
 *
 * Open shapes use it as is, closed shapes append the closing `Z`.
 */
export function drawPolyline<T>(vertices: ReadonlyArray<TransformedPoint<T>>): string {
    let path = `M${drawVertex(vertices[vertices.length - 1])}`;

    for (let i = vertices.length - 2; i >= 0; i -= 1) {
        path += `L${drawVertex(vertices[i])}`;
    }

    return path;
}
