import type { TransformedPoint } from '../types';
import { drawPolyline } from './drawPolyline';

export function drawPolygon<T>(vertices: ReadonlyArray<TransformedPoint<T>>): string {
    return `${drawPolyline(vertices)}Z`;
}
