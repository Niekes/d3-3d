import { rgb } from 'd3';
import type { Selection } from 'd3';
import { gridPlanes3D, sort } from '../../index';
import { rotatingFigure } from './rotatingFigure';
import type { GridPlane, GridPlanes3DInstance, Point3D } from '../../index';

/*
 * The scaffold the surface plot and the terrain plot share: gridPlanes3D cuts
 * a sampled field into a grid of quads, the drag rotates the scene, a color
 * function shades the height of each quad and the `sort` utility paints the
 * quads back to front.
 */

const ORIGIN = { x: 480, y: 250 };
const GRID = 16;
const POINTS_PER_ROW = GRID * 2;
const START_ANGLE = Math.PI / 4;
const INTRO_DURATION = 750;

/** Samples a function over the field, from -GRID to GRID on both axes. */
export function sample(f: (x: number, z: number) => number): Point3D[] {
    const points: Point3D[] = [];
    for (let z = -GRID; z < GRID; z += 1) {
        for (let x = -GRID; x < GRID; x += 1) {
            points.push({ x, y: f(x, z), z });
        }
    }
    return points;
}

/**
 * Renders the rotating figure into `host`, see `rotatingFigure`, and returns
 * the group, the button and `show`, which draws a sampled field. `color`
 * maps the mean height of a quad to its fill.
 */
export function surfaceFigure(
    host: HTMLElement,
    prefix: string,
    label: string,
    color: (height: number) => string
): {
    group: Selection<SVGGElement, unknown, null, undefined>;
    button: Selection<HTMLButtonElement, unknown, null, undefined>;
    show: (field: Point3D[], duration?: number) => void;
} {
    const surface: GridPlanes3DInstance<Point3D> = gridPlanes3D<Point3D>()
        .scale(10)
        .origin(ORIGIN)
        .rotateY(START_ANGLE)
        .rotateX(-START_ANGLE)
        .rows(POINTS_PER_ROW);

    let points: Point3D[] = [];

    const { group, button } = rotatingFigure(host, prefix, label, (yaw, pitch) => {
        surface.rotateY(yaw + START_ANGLE).rotateX(-pitch - START_ANGLE);
        draw(surface.data(points), 0);
    });

    /**
     * One quad: `color` at its mean height, and a darker tint when the quad
     * is turned away from the camera.
     */
    function colorize(d: GridPlane<Point3D>): string {
        const height = (d[0].y + d[1].y + d[2].y + d[3].y) / 4;
        const base = color(height);
        return d.ccw ? base : rgb(base).darker(2.5).formatHex();
    }

    /** Joins the quads, keyed by their plane, and repaints them back to front. */
    function draw(planes: GridPlane<Point3D>[], duration: number): void {
        const quads = group
            .selectAll<SVGPathElement, GridPlane<Point3D>>('path')
            .data(planes, (d) => d.plane);

        quads
            .enter()
            .append('path')
            .attr('class', 'quad')
            .attr('fill', colorize)
            .attr('opacity', 0)
            .merge(quads)
            .transition()
            .duration(duration)
            .attr('opacity', 1)
            .attr('fill', colorize)
            .attr('d', surface.draw);

        quads.exit().remove();

        group.selectAll<SVGPathElement, GridPlane<Point3D>>('path').sort(sort);
    }

    /**
     * Draws a sampled field, by default through the intro transition: the
     * first field fades in, every later one morphs the surface into it.
     */
    function show(field: Point3D[], duration: number = INTRO_DURATION): void {
        points = field;
        draw(surface.data(points), duration);
    }

    return { group, button, show };
}
