import type { BaseType, EnterElement, Selection } from 'd3';
import type { Point } from '../../index';

/*
 * The handles of the figures that edit points: a group on the projected
 * point, with a dot over a wider circle that nobody sees and that takes the
 * pointer, so a finger finds the dot.
 */

/** Appends a handle for every entering point. Use it in `selection.join`. */
export function enterHandles<Datum, Parent extends BaseType, ParentDatum>(
    enter: Selection<EnterElement, Point<Datum>, Parent, ParentDatum>
): Selection<SVGGElement, Point<Datum>, Parent, ParentDatum> {
    return enter
        .append('g')
        .call((g) => g.append('circle').attr('class', 'hit'))
        .call((g) => g.append('circle').attr('class', 'dot'));
}

/**
 * Puts every handle on its projected point and gives its dot and its hit
 * circle their radii, in the units of the view box. Use it with
 * `selection.call(placeHandles, dot, hit)`.
 */
export function placeHandles<Datum, Parent extends BaseType, ParentDatum>(
    handles: Selection<SVGGElement, Point<Datum>, Parent, ParentDatum>,
    dot: number,
    hit: number
): void {
    handles
        .attr('transform', (d) => `translate(${d.projected.x},${d.projected.y})`)
        .call((g) => g.select('.hit').attr('r', hit))
        .call((g) => g.select('.dot').attr('r', dot));
}
