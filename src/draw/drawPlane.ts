import type { TransformedPoint } from '../types';

export function drawPlane<T>(vertices: ReadonlyArray<TransformedPoint<T>>): string {
    return `M${vertices[0].projected.x},${vertices[0].projected.y}L${vertices[1].projected.x},${vertices[1].projected.y}L${vertices[2].projected.x},${vertices[2].projected.y}L${vertices[3].projected.x},${vertices[3].projected.y}Z`;
}
