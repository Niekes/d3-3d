import type { Point2D } from '../projection-orthographic';

export interface PolygonVertex {
    projected: Point2D;
}

export function drawPolygon(vertices: PolygonVertex[]): string {
    const lastPoint = vertices[vertices.length - 1];
    let path = `M${lastPoint.projected.x},${lastPoint.projected.y}`;

    for (let i = vertices.length - 2; i >= 0; i -= 1) {
        const projected = vertices[i].projected;
        path += `L${projected.x},${projected.y}`;
    }

    return `${path}Z`;
}
