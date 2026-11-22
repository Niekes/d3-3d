import type { TransformedPoint } from '../types';
import { drawPolyline } from './drawPolyline';

export function drawPolygon<T>(vertices: ReadonlyArray<TransformedPoint<T>>): string {
    return vertices.length === 0 ? '' : `${drawPolyline(vertices)}Z`;
}
