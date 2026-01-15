import { TransformedPoint } from '../types';

export const drawTriangle = <T>(vertices: ReadonlyArray<TransformedPoint<T>>): string =>
    `M${vertices[0].projected.x},${vertices[0].projected.y}L${vertices[1].projected.x},${vertices[1].projected.y}L${vertices[2].projected.x},${vertices[2].projected.y}Z`;
