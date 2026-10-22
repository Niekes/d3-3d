import type { BaseType, Selection } from 'd3';
import type { CubeFace } from '../../index';

/**
 * Joins one path per face of a cube, keyed by the face name, and draws it.
 * A face that turns away keeps its element and is only hidden, so a drag
 * never adds or removes one.
 */
export function joinFaces<Datum, Parent extends BaseType, ParentDatum>(
    faces: Selection<SVGPathElement, CubeFace<Datum>, Parent, ParentDatum>,
    draw: (face: CubeFace<Datum>) => string
): void {
    faces
        .join((enter) => enter.append('path').attr('class', (d) => `face face-${d.face}`))
        .attr('visibility', (d) => (d.ccw ? null : 'hidden'))
        .attr('d', draw);
}
