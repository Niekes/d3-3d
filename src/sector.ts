import { Point3D } from './types';

/**
 * The corners of each step of a ring sector, eight per step in the order
 * `cubes3D` expects: the outer wall is the front, the inner wall the back.
 *
 * The sector stands on the point (x, y, z), its axis upright through it, and
 * rises `height` from y upwards, towards -y as on the screen. Its angles are
 * those of d3-shape's `arc`: radians, 0 at the back (-z) and clockwise seen
 * from above, so the angles of `pie()` go in as they are; its `padAngle` is
 * not applied.
 *
 * `segments` equal steps run from `startAngle` to `endAngle`. Below one step,
 * for a count that is not finite, or where `endAngle` is not above
 * `startAngle`, the list is empty. An `innerRadius` of 0 is a wedge: the
 * inner wall of every step has no area.
 */
export function sector(
    spec: {
        x: number;
        y: number;
        z: number;
        innerRadius: number;
        outerRadius: number;
        startAngle: number;
        endAngle: number;
        height: number;
    },
    segments: number
): Point3D[][] {
    const { x, y, z, innerRadius, outerRadius, startAngle, endAngle } = spec;
    const steps = Math.floor(segments);

    if (!(steps >= 1 && steps < Infinity) || !(endAngle > startAngle)) return [];

    const top = y - spec.height;
    const span = (endAngle - startAngle) / steps;
    const corner = (r: number, a: number, cy: number): Point3D => ({
        x: x + r * Math.sin(a),
        y: cy,
        z: z - r * Math.cos(a)
    });

    return Array.from({ length: steps }, (_, i) => {
        const a0 = startAngle + i * span;
        const a1 = startAngle + (i + 1) * span;

        // Increasing angles run to the left of the outer wall seen from outside.
        return [
            corner(outerRadius, a1, top),
            corner(outerRadius, a1, y),
            corner(outerRadius, a0, y),
            corner(outerRadius, a0, top),
            corner(innerRadius, a1, top),
            corner(innerRadius, a1, y),
            corner(innerRadius, a0, y),
            corner(innerRadius, a0, top)
        ];
    });
}
