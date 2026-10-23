import { AxesSpec, AxisSpec, Point2D, Point3D, TransformedPoint } from '../types';
import { ShapeInstance, ShapeRenderer } from './shape';
import { area, ccw } from '../counter-clockwise';
import { centroid } from '../centroid';
import { transform } from '../transform';
import { drawPlane } from '../draw/drawPlane';
import { drawPolyline } from '../draw/drawPolyline';

/**
 * One wall of the chart box: its four corners, whether it faces the camera
 * and its gridlines, one segment per tick inside the box. `axis` is the axis
 * the wall stands across and `side` the end of its domain the wall sits at,
 * 0 at the first value and 1 at the last.
 */
export type AxisWall = TransformedPoint<Point3D>[] & {
    axis: keyof AxesSpec;
    side: 0 | 1;
    ccw: boolean;
    centroid: Point3D;
    grid: TransformedPoint<Point3D>[][];
};

/**
 * One edge of the chart box along an axis: its ticks, which keep their
 * value under the axis key, and the screen direction away from the box.
 * `sides` are the ends of the two other axes the edge runs at, in the order
 * of the walls they span, and `chosen` marks the edge `axes` puts the axis on.
 */
export type AxisEdge = TransformedPoint<Point3D>[] & {
    axis: keyof AxesSpec;
    normal: Point2D;
    sides: [0 | 1, 0 | 1];
    chosen: boolean;
};

export interface Axes3DInstance extends ShapeInstance<Point3D> {
    data(spec: AxesSpec): AxisWall[];
    draw(wall: AxisWall): string;
    axes(spec: AxesSpec): AxisEdge[];
    edges(spec: AxesSpec): AxisEdge[];
}

type Axis = keyof AxesSpec;

const AXES: Axis[] = ['x', 'y', 'z'];

// The two axes that span the wall across an axis, in cyclic order, so the
// walls on the same side of the box wind the same way.
const SPAN: Record<Axis, [Axis, Axis]> = { x: ['y', 'z'], y: ['z', 'x'], z: ['x', 'y'] };

// The four edges along an axis, by the ends of the two axes that span it.
const SIDES: [0 | 1, 0 | 1][] = [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1]
];

class Axes3DRenderer extends ShapeRenderer<Point3D> implements Axes3DInstance {
    /** The six walls, in the order x lo, x hi, y lo, y hi, z lo, z hi. */
    data(spec: AxesSpec): AxisWall[] {
        const mirrored = this.mirrored(spec);
        return AXES.flatMap((a) => [
            this.wall(spec, a, 0, mirrored),
            this.wall(spec, a, 1, mirrored)
        ]);
    }

    draw(wall: AxisWall): string {
        return drawPlane(wall) + wall.grid.map((segment) => drawPolyline(segment)).join('');
    }

    /**
     * Puts every axis on an edge of the outline, an edge between a wall that
     * faces the camera and one that does not, and prefers the edges below
     * the box, then the ones left of it.
     */
    axes(spec: AxesSpec): AxisEdge[] {
        return this.edges(spec).filter((edge) => edge.chosen);
    }

    /**
     * The four edges along every axis, in the order x, y, z, with the one
     * `axes` chooses marked, so that a chart can fade an axis from one edge
     * to the next.
     */
    edges(spec: AxesSpec): AxisEdge[] {
        const walls = this.data(spec);
        // A wall seen edge on faces neither way, or its sign would be noise.
        const flat = Math.max(...walls.map((wall) => Math.abs(area(wall)))) * 1e-9;
        const faces = (a: Axis, side: number) => area(walls[AXES.indexOf(a) * 2 + side]) > flat;
        const [centre] = this.apply([{ x: middle(spec.x), y: middle(spec.y), z: middle(spec.z) }]);

        return AXES.flatMap((a) => {
            const [b, c] = SPAN[a];
            const edges = SIDES.map((sides) => this.edge(spec, a, sides, centre.projected));
            const outline = edges.filter(({ sides: [sb, sc] }) => faces(b, sb) !== faces(c, sc));
            const best = (outline.length ? outline : edges).reduce((best, edge) =>
                score(edge) > score(best) ? edge : best
            );
            best.chosen = true;

            return edges;
        });
    }

    private wall(spec: AxesSpec, a: Axis, side: 0 | 1, mirrored: boolean): AxisWall {
        const [b, c] = SPAN[a];
        const va = ends(spec[a])[side];
        const [b0, b1] = ends(spec[b]);
        const [c0, c1] = ends(spec[c]);
        const corners = [
            at(a, va, b, b0, c, c0),
            at(a, va, b, b1, c, c0),
            at(a, va, b, b1, c, c1),
            at(a, va, b, b0, c, c1)
        ];

        // Opposite walls wind oppositely, and a mirroring accessor turns
        // every winding around, so it is turned back here.
        const wall = this.apply(
            (side === 1) !== mirrored ? corners.reverse() : corners
        ) as AxisWall;

        wall.axis = a;
        wall.side = side;
        wall.ccw = ccw(wall);
        wall.centroid = centroid(wall);
        wall.grid = [
            ...inner(spec[b]).map((v) =>
                this.apply([at(a, va, b, v, c, c0), at(a, va, b, v, c, c1)])
            ),
            ...inner(spec[c]).map((v) =>
                this.apply([at(a, va, b, b0, c, v), at(a, va, b, b1, c, v)])
            )
        ];

        return wall;
    }

    private edge(spec: AxesSpec, a: Axis, sides: [0 | 1, 0 | 1], centre: Point2D): AxisEdge {
        const [b, c] = SPAN[a];
        const [sb, sc] = sides;
        const vb = ends(spec[b])[sb];
        const vc = ends(spec[c])[sc];
        const [start, end] = this.apply(ends(spec[a]).map((v) => at(a, v, b, vb, c, vc)));

        const edge = this.apply(spec[a].ticks.map((v) => at(a, v, b, vb, c, vc))) as AxisEdge;

        edge.axis = a;
        edge.normal = normal(start.projected, end.projected, centre);
        edge.sides = sides;
        edge.chosen = false;

        return edge;
    }

    /**
     * Whether the accessors mirror the box: the box spanned by the three
     * axes, as the accessors see it, is left-handed. A negated accessor or a
     * reversed domain each mirror it once.
     */
    private mirrored(spec: AxesSpec): boolean {
        const accessors = [this.x(), this.y(), this.z()];
        const read = (point: Point3D) => accessors.map((accessor) => accessor(point));
        const start = { x: ends(spec.x)[0], y: ends(spec.y)[0], z: ends(spec.z)[0] };
        const origin = read(start);
        const [u, v, w] = AXES.map((a) =>
            read({ ...start, [a]: ends(spec[a])[1] }).map((value, i) => value - origin[i])
        );
        const determinant =
            u[0] * (v[1] * w[2] - v[2] * w[1]) -
            u[1] * (v[0] * w[2] - v[2] * w[0]) +
            u[2] * (v[0] * w[1] - v[1] * w[0]);

        return determinant < 0;
    }

    private apply(points: Point3D[]): TransformedPoint<Point3D>[] {
        return transform(points, this.transformOptions());
    }
}

/** A point given by its values along three named axes. */
function at(a: Axis, va: number, b: Axis, vb: number, c: Axis, vc: number): Point3D {
    return { [a]: va, [b]: vb, [c]: vc } as Point3D;
}

function ends(axis: AxisSpec): [number, number] {
    return [axis.domain[0], axis.domain[axis.domain.length - 1]];
}

function middle(axis: AxisSpec): number {
    const [start, end] = ends(axis);
    return (start + end) / 2;
}

/** The ticks strictly inside the domain, the ends are the outline of the wall. */
function inner(axis: AxisSpec): number[] {
    const [start, end] = ends(axis);
    const lo = Math.min(start, end);
    const hi = Math.max(start, end);
    return axis.ticks.filter((v) => v > lo && v < hi);
}

/** The unit screen vector from the box centre to an edge, square to the edge. */
function normal(start: Point2D, end: Point2D, centre: Point2D): Point2D {
    const ex = end.x - start.x;
    const ey = end.y - start.y;
    const rx = (start.x + end.x) / 2 - centre.x;
    const ry = (start.y + end.y) / 2 - centre.y;
    const along = (rx * ex + ry * ey) / (ex * ex + ey * ey || 1);
    const nx = rx - along * ex;
    const ny = ry - along * ey;
    const length = Math.hypot(nx, ny) || 1;

    return { x: nx / length, y: ny / length };
}

/** Below the box first, then left of it. */
function score(edge: AxisEdge): number {
    return edge.normal.y - edge.normal.x / 2;
}

export function axes3D(): Axes3DInstance {
    return new Axes3DRenderer();
}
