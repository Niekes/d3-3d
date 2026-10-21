import { interpolateCool, interpolatePiYG, randomInt } from 'd3';
import { sort, triangles3D } from '../../index';
import { rotatingFigure } from './rotatingFigure';
import type { Point3D, Triangle, Triangles3DInstance } from '../../index';

/*
 * A sphere: the surface is cut into bands of quads, every quad into two
 * triangles, triangles3D projects them, the drag rotates the scene and the
 * `sort` utility paints the triangles back to front.
 */

const ORIGIN = { x: 480, y: 250 };
const SEGMENTS = 25;
const START_ANGLE = Math.PI / 4;
const INTRO_DURATION = 750;

/** A projected triangle with the index it was built at, the key of the join. */
type Facet = Triangle<Point3D> & { id: number };

/** A sphere of `radius`: SEGMENTS bands from pole to pole, two triangles per quad. */
function sphere(radius: number): Point3D[][] {
    const vertex = (theta: number, phi: number): Point3D => ({
        x: radius * Math.cos(phi) * Math.sin(theta),
        y: radius * Math.cos(theta),
        z: radius * Math.sin(phi) * Math.sin(theta)
    });

    const triangles: Point3D[][] = [];
    for (let i = 0; i < SEGMENTS; i += 1) {
        const theta1 = (i / SEGMENTS) * Math.PI;
        const theta2 = ((i + 1) / SEGMENTS) * Math.PI;
        for (let j = 0; j < SEGMENTS; j += 1) {
            const phi1 = (j / SEGMENTS) * Math.PI * 2;
            const phi2 = ((j + 1) / SEGMENTS) * Math.PI * 2;
            triangles.push(
                [vertex(theta1, phi1), vertex(theta1, phi2), vertex(theta2, phi1)],
                [vertex(theta2, phi1), vertex(theta1, phi2), vertex(theta2, phi2)]
            );
        }
    }
    return triangles;
}

/**
 * One band, one color from pole to pole: the PiYG ramp on a light page, the
 * cool ramp on a dark one, whose middle glows instead of turning white.
 * `light-dark()` follows the color-scheme of the page, so a theme switch
 * recolors the sphere without a redraw.
 */
function colorize(d: Facet): string {
    const t = Math.floor(d.id / (2 * SEGMENTS)) / SEGMENTS;
    return `light-dark(${interpolatePiYG(t)}, ${interpolateCool(t)})`;
}

/**
 * Mounts the figure into `host` and returns a function that removes it.
 */
export function mountSphere(host: HTMLElement): () => void {
    const triangles: Triangles3DInstance<Point3D> = triangles3D<Point3D>()
        .scale(1)
        .origin(ORIGIN)
        .rotateY(START_ANGLE)
        .rotateX(-START_ANGLE);

    let mesh: Point3D[][] = [];

    const { group, button } = rotatingFigure(
        host,
        'sphere',
        'A sphere made of triangles. Drag the figure to rotate it.',
        (yaw, pitch) => {
            triangles.rotateY(yaw + START_ANGLE).rotateX(-pitch - START_ANGLE);
            draw(0);
        }
    );

    /** Joins the triangles, keyed by their index, and repaints them back to front. */
    function draw(duration: number): void {
        // The projected triangles are new arrays, so the key is stamped on
        // after the projection.
        const facets = triangles.data(mesh).map((d, i) => Object.assign(d, { id: i }));

        const paths = group.selectAll<SVGPathElement, Facet>('path').data(facets, (d) => d.id);

        paths
            .enter()
            .append('path')
            .attr('class', 'facet')
            .style('fill', colorize)
            .attr('fill-opacity', 0)
            .merge(paths)
            .transition()
            .duration(duration)
            .attr('fill-opacity', 0.75)
            .attr('d', triangles.draw);

        paths.exit().remove();

        group.selectAll<SVGPathElement, Facet>('path').sort(sort);
    }

    /** Builds a sphere with a random radius and morphs the figure into it. */
    function show(): void {
        mesh = sphere(randomInt(50, 225)());
        draw(INTRO_DURATION);
    }

    button.on('click', show);

    show();

    return () => {
        host.innerHTML = '';
    };
}
