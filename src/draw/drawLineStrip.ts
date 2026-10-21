import type { TransformedPoint } from '../types';
import { drawPolyline } from './drawPolyline';

export function drawLineStrip<T>(vertices: ReadonlyArray<TransformedPoint<T>>): string {
    return drawPolyline(vertices);
}
