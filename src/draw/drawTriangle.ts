import { TransformedPoint } from '../types';
import { drawVertex } from './drawVertex';

export function drawTriangle<T>(vertices: ReadonlyArray<TransformedPoint<T>>): string {
    return `M${drawVertex(vertices[0])}L${drawVertex(vertices[1])}L${drawVertex(vertices[2])}Z`;
}
