import type { TransformedPoint } from '../types';
import { drawVertex } from './drawVertex';

export function drawPlane<T>(vertices: ReadonlyArray<TransformedPoint<T>>): string {
    return `M${drawVertex(vertices[0])}L${drawVertex(vertices[1])}L${drawVertex(vertices[2])}L${drawVertex(vertices[3])}Z`;
}
