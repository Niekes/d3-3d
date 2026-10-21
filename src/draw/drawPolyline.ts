import type { TransformedPoint } from '../types';

/**
 * The shared polyline path: starts at the last vertex and walks backwards
 * to the first one.
 *
 * Open shapes use it as is, closed shapes append the closing `Z`.
 */
export function drawPolyline<T>(vertices: ReadonlyArray<TransformedPoint<T>>): string {
    const lastPoint = vertices[vertices.length - 1];
    let path = `M${lastPoint.projected.x},${lastPoint.projected.y}`;

    for (let i = vertices.length - 2; i >= 0; i -= 1) {
        const p = vertices[i].projected;
        path += `L${p.x},${p.y}`;
    }

    return path;
}
