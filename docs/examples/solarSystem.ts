import { interpolateRgb, range } from 'd3';
import { lineStrips3D, sort, triangles3D } from '../../index';
import { playback, rotatingFigure } from './rotatingFigure';
import type { LineStrips3DInstance, Point3D, Triangle, Triangles3DInstance } from '../../index';

/*
 * The solar system: every body is a sphere of triangles, all of them go
 * through one triangles3D, the `sort` utility paints them back to front and
 * the sun lights the side of a planet that faces it. A d3 timer moves the
 * bodies along their orbits, the drag rotates the scene.
 */

const ORIGIN = { x: 480, y: 250 };
const SUN: Point3D = { x: 0, y: 0, z: 0 };
const TILT = Math.PI / 6;
const ORBIT_POINTS = 64;
const NIGHT = 0.3;
// Some seconds into the animation, so the planets do not start in a row.
const START = 40;

/**
 * Not to scale: `distance` is the radius of the orbit around the sun, or
 * around `around`, and `period` the seconds of one orbit.
 */
interface Body {
    name: string;
    radius: number;
    distance: number;
    period: number;
    color: string;
    segments: number;
    around?: string;
}

const BODIES: Body[] = [
    { name: 'Sun', radius: 34, distance: 0, period: 1, color: '#ffb52e', segments: 16 },
    { name: 'Mercury', radius: 3, distance: 52, period: 4, color: '#b5aca3', segments: 8 },
    { name: 'Venus', radius: 6, distance: 72, period: 6.5, color: '#e8c787', segments: 10 },
    { name: 'Earth', radius: 6.5, distance: 98, period: 10, color: '#3d8bfd', segments: 10 },
    { name: 'Moon', radius: 2, distance: 12, period: 2.5, color: '#d6d3d1', segments: 6, around: 'Earth' },
    { name: 'Mars', radius: 4.5, distance: 124, period: 14, color: '#e0553a', segments: 8 },
    { name: 'Jupiter', radius: 16, distance: 170, period: 23, color: '#d9a877', segments: 12 },
    { name: 'Saturn', radius: 13, distance: 222, period: 35, color: '#ecd193', segments: 12 },
    { name: 'Uranus', radius: 9, distance: 276, period: 48, color: '#8fdcf0', segments: 10 },
    { name: 'Neptune', radius: 9, distance: 326, period: 61, color: '#4c6ef5', segments: 10 }
];

/** A projected triangle with the index it was built at, the key of the join, and its shaded fill. */
type Facet = Triangle<Point3D> & { id: number; fill: string };

/** A sphere of `radius` around the origin: `segments` bands from pole to pole, two triangles per quad. */
function sphere(radius: number, segments: number): Point3D[][] {
    const vertex = (theta: number, phi: number): Point3D => ({
        x: radius * Math.cos(phi) * Math.sin(theta),
        y: radius * Math.cos(theta),
        z: radius * Math.sin(phi) * Math.sin(theta)
    });

    const triangles: Point3D[][] = [];
    for (let i = 0; i < segments; i += 1) {
        const theta1 = (i / segments) * Math.PI;
        const theta2 = ((i + 1) / segments) * Math.PI;
        for (let j = 0; j < segments; j += 1) {
            const phi1 = (j / segments) * Math.PI * 2;
            const phi2 = ((j + 1) / segments) * Math.PI * 2;
            triangles.push(
                [vertex(theta1, phi1), vertex(theta1, phi2), vertex(theta2, phi1)],
                [vertex(theta2, phi1), vertex(theta1, phi2), vertex(theta2, phi2)]
            );
        }
    }
    return triangles;
}

/** Where `body` is after `t` seconds: on a circle in the x-z plane around `center`. */
function orbit(body: Body, t: number, center: Point3D): Point3D {
    const angle = (t / body.period) * Math.PI * 2;
    return {
        x: center.x + body.distance * Math.cos(angle),
        y: center.y,
        z: center.z + body.distance * Math.sin(angle)
    };
}

/**
 * How much sunlight a triangle of a sphere at `center` gets: the cosine
 * between its normal and the way to the sun, never darker than NIGHT. The
 * sphere is built around the origin, so the centroid of the untranslated
 * triangle points along its normal.
 */
function sunlight(triangle: Point3D[], center: Point3D): number {
    const n = triangle.reduce((s, p) => ({ x: s.x + p.x, y: s.y + p.y, z: s.z + p.z }), SUN);
    const cos =
        -(n.x * center.x + n.y * center.y + n.z * center.z) /
        (Math.hypot(n.x, n.y, n.z) * Math.hypot(center.x, center.y, center.z));
    return Math.max(NIGHT, cos);
}

/**
 * Mounts the figure into `host` and returns a function that removes it.
 */
export function mountSolarSystem(host: HTMLElement): () => void {
    const triangles: Triangles3DInstance<Point3D> = triangles3D<Point3D>();
    const strips: LineStrips3DInstance<Point3D> = lineStrips3D<Point3D>();
    for (const shape of [triangles, strips]) shape.origin(ORIGIN).rotateX(-TILT);

    const meshes = BODIES.map((body) => sphere(body.radius, body.segments));
    const shades = BODIES.map((body) => interpolateRgb('#000', body.color));
    // The planets' orbits never move, the moon's travels with the earth.
    const orbits = BODIES.filter((body) => body.distance && !body.around).map((body) =>
        range(ORBIT_POINTS + 1).map((i) => orbit(body, (i / ORBIT_POINTS) * body.period, SUN))
    );

    let t = START;

    const { group, button } = rotatingFigure(
        host,
        'solar-system',
        'The sun, the planets and the moon, made of triangles. Drag the figure to rotate it.',
        (yaw, pitch) => {
            for (const shape of [triangles, strips]) shape.rotateY(yaw).rotateX(-pitch - TILT);
            draw();
        }
    );

    // ponytail: the orbits are always painted behind the bodies, so an orbit
    // passing in front of the sun is drawn under it. Sort them in if it shows.
    const orbitGroup = group.append('g');
    const bodyGroup = group.append('g');

    /** Places every body at `t`, joins all triangles in one go and repaints them back to front. */
    function draw(): void {
        const centers = new Map<string, Point3D>();
        const mesh: Point3D[][] = [];
        const fills: string[] = [];

        BODIES.forEach((body, k) => {
            const center = orbit(body, t, centers.get(body.around ?? '') ?? SUN);
            centers.set(body.name, center);
            for (const triangle of meshes[k]) {
                mesh.push(triangle.map((p) => ({ x: p.x + center.x, y: p.y + center.y, z: p.z + center.z })));
                // The sun shines by itself.
                fills.push(shades[k](body.distance ? sunlight(triangle, center) : 1));
            }
        });

        // The projected triangles are new arrays, so the key and the fill are
        // stamped on after the projection.
        const facets = triangles.data(mesh).map((d, i) => Object.assign(d, { id: i, fill: fills[i] }));

        const paths = bodyGroup.selectAll<SVGPathElement, Facet>('path').data(facets, (d) => d.id);

        paths
            .enter()
            .append('path')
            .attr('class', 'facet')
            .merge(paths)
            .style('fill', (d) => d.fill)
            .attr('d', triangles.draw);

        paths.exit().remove();

        bodyGroup.selectAll<SVGPathElement, Facet>('path').sort(sort);

        orbitGroup.selectAll('path').data(strips.data(orbits)).join('path').attr('class', 'orbit').attr('d', strips.draw);
    }

    // One frame of the animation: the clock moves on by the time since the last one.
    const play = playback(button, (elapsed) => {
        t += elapsed / 1000;
        draw();
    });

    draw();
    play(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    return () => {
        play(false);
        host.innerHTML = '';
    };
}
