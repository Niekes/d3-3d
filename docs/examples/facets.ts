import type { Selection } from 'd3';
import type { Point3D, Triangle, Triangles3DInstance } from '../../index';

/** A projected triangle with the index it was built at, the key of the join, and its shaded fill. */
export type Facet = Triangle<Point3D> & { id: number; fill: string };

/**
 * Joins the `path.facet` elements of `group` to `facets`, keyed by their id,
 * and draws every triangle with its fill. Returns the joined paths, so a
 * figure can style them further.
 */
export function joinFacets(
    group: Selection<SVGGElement, unknown, null, undefined>,
    facets: Facet[],
    triangles: Triangles3DInstance<Point3D>
): Selection<SVGPathElement, Facet, SVGGElement, unknown> {
    return group
        .selectAll<SVGPathElement, Facet>('path.facet')
        .data(facets, (d) => d.id)
        .join((enter) => enter.append('path').attr('class', 'facet'))
        .style('fill', (d) => d.fill)
        .attr('d', triangles.draw);
}
