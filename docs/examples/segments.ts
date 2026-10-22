import type { BaseType, Selection } from 'd3';
import type { Line, Point } from '../../index';

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

/**
 * Puts every `<circle>` on the projected point from points3D.
 * Use it with `selection.call(placePoints)`.
 */
export function placePoints<Datum, Parent extends BaseType, ParentDatum>(
    circles: Selection<SVGCircleElement, Point<Datum>, Parent, ParentDatum>
): void {
    circles.attr('cx', (d) => d.projected.x).attr('cy', (d) => d.projected.y);
}
