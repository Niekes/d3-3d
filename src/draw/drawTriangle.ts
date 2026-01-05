import type { Point2D } from '../projection-orthographic';

export interface TriangleVertex {
    projected: Point2D;
}

export const drawTriangle = (triangle: TriangleVertex[]): string =>
    `M${triangle[0].projected.x},${triangle[0].projected.y}L${triangle[1].projected.x},${triangle[1].projected.y}L${triangle[2].projected.x},${triangle[2].projected.y}Z`;
