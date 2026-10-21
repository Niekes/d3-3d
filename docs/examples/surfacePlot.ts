import { extent, interpolateSpectral, randomUniform, rgb, scaleLinear } from 'd3';
import { gridPlanes3D, sort } from '../../index';
import { rotatingFigure } from './rotatingFigure';
import type { GridPlane, GridPlanes3DInstance, Point3D } from '../../index';

/*
 * A surface plot: gridPlanes3D cuts a sampled function into a grid of quads,
 * the drag rotates the scene, the spectral ramp shades the height of each
 * quad and the `sort` utility paints the quads back to front.
 */

const ORIGIN = { x: 480, y: 250 };
const GRID = 16;
const POINTS_PER_ROW = GRID * 2;
const START_ANGLE = Math.PI / 4;
const INTRO_DURATION = 750;

/** Samples a function over the field, from -GRID to GRID on both axes. */
function sample(f: (x: number, z: number) => number): Point3D[] {
    const points: Point3D[] = [];
    for (let z = -GRID; z < GRID; z += 1) {
        for (let x = -GRID; x < GRID; x += 1) {
            points.push({ x, y: f(x, z), z });
        }
    }
    return points;
}

/** A random radial wave: cos of the distance, with a random amplitude. */
function randomWave(): (x: number, z: number) => number {
    const amplitude = Math.floor(randomUniform(1, 12)());
    return (x, z) => Math.cos((Math.sqrt(x * x + z * z) / 5) * Math.PI) * amplitude;
}

/**
 * Mounts the figure into `host` and returns a function that removes it.
 */
export function mountSurfacePlot(host: HTMLElement): () => void {
    const surface: GridPlanes3DInstance<Point3D> = gridPlanes3D<Point3D>()
        .scale(10)
        .origin(ORIGIN)
        .rotateY(START_ANGLE)
        .rotateX(-START_ANGLE)
        .rows(POINTS_PER_ROW);

    const colorScale = scaleLinear<number, number>();

    let points: Point3D[] = [];

    const { group, button } = rotatingFigure(
        host,
        'surface',
        'A surface plot of a radial wave. Drag the figure to rotate it.',
        (yaw, pitch) => {
            surface.rotateY(yaw + START_ANGLE).rotateX(-pitch - START_ANGLE);
            draw(surface.data(points), 0);
        }
    );

    /**
     * One quad: the spectral ramp at its mean height, and a darker tint
     * when the quad is turned away from the camera.
     */
    function colorize(d: GridPlane<Point3D>): string {
        const height = (d[0].y + d[1].y + d[2].y + d[3].y) / 4;
        const base = interpolateSpectral(colorScale(height));
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

    /** Samples a function, scales the color ramp to its range and draws it. */
    function show(f: (x: number, z: number) => number): void {
        points = sample(f);
        colorScale.domain(extent(points, (d) => d.y) as [number, number]);
        draw(surface.data(points), INTRO_DURATION);
    }

    button.on('click', () => show(randomWave()));

    show(randomWave());

    return () => {
        host.innerHTML = '';
    };
}
