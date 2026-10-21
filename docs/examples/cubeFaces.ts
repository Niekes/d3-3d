import type { BaseType, Selection } from 'd3';
import type { CubeFace } from '../../index';

/**
 * The eight corners of a cube in the order cubes3D expects, each built by
 * `vertex` from its side along x, y and z, -1 or 1. The screen y grows
 * downwards, so the top of a cube is its side at -1.
 */
export function cubeCorners<Vertex>(
    vertex: (dx: number, dy: number, dz: number) => Vertex
): Vertex[] {
    return [
        vertex(-1, -1, 1), // front top left
        vertex(-1, 1, 1), // front bottom left
        vertex(1, 1, 1), // front bottom right
        vertex(1, -1, 1), // front top right
        vertex(-1, -1, -1), // back top left
        vertex(-1, 1, -1), // back bottom left
        vertex(1, 1, -1), // back bottom right
        vertex(1, -1, -1) // back top right
    ];
}

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
