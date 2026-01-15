import { TransformedPoint } from '../types';

export function drawPolygon<T>(vertices: ReadonlyArray<TransformedPoint<T>>): string {
    const lastPoint = vertices[vertices.length - 1];

    let path = `M${lastPoint.projected.x},${lastPoint.projected.y}`;

    for (let i = vertices.length - 2; i >= 0; i -= 1) {
        const projected = vertices[i].projected;
        path += `L${projected.x},${projected.y}`;
    }

    return `${path}Z`;
}
