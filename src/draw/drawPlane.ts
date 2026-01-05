import type { Point2D } from '../projection-orthographic';

export interface ProjectedVertex {
    projected: Point2D;
}

export function drawPlane(vertices: ProjectedVertex[]): string {
    return `M${vertices[0].projected.x},${vertices[0].projected.y}L${vertices[1].projected.x},${vertices[1].projected.y}L${vertices[2].projected.x},${vertices[2].projected.y}L${vertices[3].projected.x},${vertices[3].projected.y}Z`;
}
