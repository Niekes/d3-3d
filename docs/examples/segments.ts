import type { BaseType, Selection } from 'd3';
import type { Line } from '../../index';

/**
 * Puts every `<line>` on the projected ends of its segment from lines3D.
 * Use it with `selection.call(placeSegments)`.
 */
export function placeSegments<Datum, Parent extends BaseType, ParentDatum>(
    lines: Selection<SVGLineElement, Line<Datum>, Parent, ParentDatum>
): void {
    lines
        .attr('x1', (d) => d[0].projected.x)
        .attr('y1', (d) => d[0].projected.y)
        .attr('x2', (d) => d[1].projected.x)
        .attr('y2', (d) => d[1].projected.y);
}
