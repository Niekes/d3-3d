import { extent, format, interpolateObject, range, scaleLinear } from 'd3';
import { axes3D, axisSpec, camera3D, lineStrips3D, points3D, sort, strips } from '../../index';
import type { AxesSpec, HasCentroid, Point, Point3D, ShapeInstance } from '../../index';
import { playback, rotatingFigure, turnCamera } from './rotatingFigure';
import './trajectoryExplorer.css';

/*
 * A trajectory explorer: three paths through the Lorenz attractor whose
 * starts differ by 0.01 and by 0.00001. lineStrips3D draws the fading
 * trails, points3D the markers that run along the paths and axes3D
 * the back walls of the box. One playhead drives every renderer, so the
 * markers, the trails and the readout always show the same moment.
 */

const ORIGIN = { x: 480, y: 250 };
const SCALE = 160;
const TICKS = 5;
const START_YAW = Math.PI / 6;
const START_TILT = Math.PI / 12;
const MARKER_RADIUS = 5;
const LABEL_GAP = 13;

// The Lorenz system, integrated in small Euler steps of which every tenth is kept.
const SIGMA = 10;
const RHO = 28;
const BETA = 8 / 3;
const DT = 0.002;
const SUBSTEPS = 10;
const SAMPLES = 1500;

// The playback: 0.06 samples per millisecond play the 1500 samples in 25 seconds.
const RATE = 0.06;
// The trail spans the last 120 samples, cut into strips of 6.
const TRAIL = 120;
const CHUNK = 6;
// Without motion the figure opens paused on a moment after the paths have split.
const STILL = 900;

/** A sample of a path: a position, the path it belongs to and its index on the playhead. */
type Sample = Point3D & { id: string; t: number };

type Trajectory = { id: string; color: string; samples: Sample[] };

/**
 * Integrates the Lorenz system from `start`. Euler steps are good enough
 * for a picture; a path that is read as data wants a Runge-Kutta step.
 */
function lorenz(id: string, start: Point3D): Sample[] {
    let { x, y, z } = start;
    return range(SAMPLES).map((t) => {
        for (let step = 0; step < SUBSTEPS; step += 1) {
            [x, y, z] = [
                x + DT * SIGMA * (y - x),
                y + DT * (x * (RHO - z) - y),
                z + DT * (x * y - BETA * z)
            ];
        }
        return { id, t, x, y, z };
    });
}

// Three starts near the attractor that differ only in z: B splits from A
// after about 4 seconds, C after about 10. The colors are CSS variables, so
// the dark mode steps them for its own surface.
const TRAJECTORIES: Trajectory[] = [
    { id: 'A', color: 'var(--te-a)', samples: lorenz('A', { x: 5, y: 5, z: 30 }) },
    { id: 'B', color: 'var(--te-b)', samples: lorenz('B', { x: 5, y: 5, z: 30.01 }) },
    { id: 'C', color: 'var(--te-c)', samples: lorenz('C', { x: 5, y: 5, z: 30.00001 }) }
];

/**
 * Mounts the figure into `host` and returns a function that removes it.
 */
export function mountTrajectoryExplorer(host: HTMLElement): () => void {
    // Every axis spans the box from -1 to 1: the extent of the paths, made nice.
    const all = TRAJECTORIES.flatMap((d) => d.samples);
    const [scaleX, scaleY, scaleZ] = (['x', 'y', 'z'] as const).map((key) =>
        scaleLinear(extent(all, (p) => p[key]) as [number, number], [-1, 1]).nice(TICKS)
    );
    const spec: AxesSpec = {
        x: axisSpec(scaleX, TICKS),
        y: axisSpec(scaleY, TICKS),
        z: axisSpec(scaleZ, TICKS)
    };
    const fmt = format('.3~g');
    const fmtTime = format('.1f');

    const box3d = axes3D();
    const strips3d = lineStrips3D<Sample>();
    const markers3d = points3D<Sample>();

    // The renderers hang on one camera, so turning it turns the whole scene.
    // Lorenz z points up and Lorenz y into the depth, so the butterfly faces
    // the reader. The screen y grows downwards, so z is negated.
    const camera = camera3D().scale(SCALE).origin(ORIGIN);
    const renderers: ShapeInstance<any>[] = [box3d, strips3d, markers3d];
    for (const renderer of renderers) {
        renderer
            .camera(camera)
            .x((d: Point3D) => scaleX(d.x))
            .y((d: Point3D) => -scaleZ(d.z))
            .z((d: Point3D) => scaleY(d.y));
    }

    // The playhead: a fractional sample index that every renderer draws from.
    let t = 0;
    let selected = '';
    let dragYaw = 0;
    let dragPitch = 0;

    const { group, button } = rotatingFigure(
        host,
        'trajectory',
        'Three trajectories through the Lorenz attractor with moving markers. Drag the figure to rotate it.',
        (yaw, pitch) => {
            dragYaw = yaw;
            dragPitch = pitch;
            drawScene();
        }
    );

    const wallGroup = group.append('g').attr('class', 'trajectory-walls');
    const dataGroup = group.append('g').attr('class', 'trajectory-data');
    const labelGroup = group.append('g').attr('class', 'trajectory-labels');

    host.insertAdjacentHTML(
        'beforeend',
        `<div class="trajectory-controls">
            <label>time <input name="time" type="range" min="0" max="${SAMPLES - 1}" step="1"><output></output></label>
            <fieldset>
                <legend>trajectory</legend>
                <label><input type="radio" name="trajectory" value="" checked> all</label>
                ${TRAJECTORIES.map(
                    (d) =>
                        `<label><input type="radio" name="trajectory" value="${d.id}"><span class="swatch" style="background: ${d.color}"></span>${d.id}</label>`
                ).join('')}
            </fieldset>
            <output class="trajectory-readout" hidden></output>
        </div>`
    );

    const scrub = host.querySelector('[name=time]') as HTMLInputElement;
    const clock = scrub.nextElementSibling as HTMLOutputElement;
    const readout = host.querySelector('.trajectory-readout') as HTMLOutputElement;

    const color = (id: string) => TRAJECTORIES.find((d) => d.id === id)!.color;

    /** Whether two markers lie so close that their labels would overlap. */
    const near = (a: Point<Sample>, b: Point<Sample>) =>
        Math.hypot(a.projected.x - b.projected.x, a.projected.y - b.projected.y) < LABEL_GAP;

    /** Where a path is at the playhead, between its two nearest samples. */
    function head(samples: Sample[]): Sample {
        const i = Math.min(Math.floor(t), SAMPLES - 2);
        return interpolateObject(samples[i], samples[i + 1])(t - i);
    }

    /**
     * The trail behind the head of a path: its last TRAIL samples, cut from
     * the head backwards into short strips that share their end points.
     */
    function trail(samples: Sample[], tip: Sample): Sample[][] {
        const end = Math.floor(t);
        const points = [tip, ...samples.slice(Math.max(0, end - TRAIL), end + 1).reverse()];
        return strips(points, CHUNK);
    }

    /** Joins one path per datum into `parent`, drawn by `draw`. */
    function joinPaths<D>(parent: typeof group, data: D[], draw: (d: D) => string) {
        return parent.selectAll<SVGPathElement, D>('path').data(data).join('path').attr('d', draw);
    }

    /** Turns the camera by the drag and draws the scene at the playhead. */
    function drawScene(): void {
        turnCamera(camera, dragYaw, dragPitch, { yaw: START_YAW, tilt: START_TILT });

        // A selected trajectory is drawn alone.
        const shown = TRAJECTORIES.filter((d) => !selected || d.id === selected);
        const heads = shown.map((d) => head(d.samples));
        const markers = markers3d.data(heads);
        const walls = box3d.data(spec).filter((wall) => !wall.ccw);
        const trails = strips3d.data(shown.flatMap((d, k) => trail(d.samples, heads[k])));

        joinPaths(wallGroup, walls, (wall) => box3d.draw(wall));

        // Every strip of a trail fades with the age of its newest sample.
        joinPaths(dataGroup, trails, (strip) => strips3d.draw(strip))
            .style('stroke', (d) => color(d[0].id))
            .attr('stroke-opacity', (d) => 1 - (t - d[0].t) / TRAIL);

        dataGroup
            .selectAll<SVGCircleElement, Point<Sample>>('circle')
            .data(markers)
            .join('circle')
            .style('fill', (d) => color(d.id))
            .attr('cx', (d) => d.projected.x)
            .attr('cy', (d) => d.projected.y)
            .attr('r', MARKER_RADIUS);

        dataGroup.selectAll<SVGElement, HasCentroid>('path, circle').sort(sort);

        // A label steps down past the labels of the markers it overlaps, so the
        // labels stay apart while the paths overlap and sit on their markers after.
        labelGroup
            .selectAll<SVGTextElement, Point<Sample>>('text')
            .data(markers)
            .join('text')
            .attr('x', (d) => d.projected.x + MARKER_RADIUS + 5)
            .attr(
                'y',
                (d, k) =>
                    d.projected.y + LABEL_GAP * markers.slice(0, k).filter((e) => near(e, d)).length
            )
            .text((d) => d.id);

        scrub.valueAsNumber = t;
        clock.textContent = fmtTime(t * DT * SUBSTEPS);
        const current = heads.find((d) => d.id === selected);
        readout.hidden = !current;
        readout.textContent = current
            ? `x ${fmt(current.x)}  y ${fmt(current.y)}  z ${fmt(current.z)}`
            : '';
    }

    // One frame of the playback: the playhead moves on and wraps around at the end.
    const play = playback(button, (elapsed) => {
        // The playhead waits while the reader holds the scrubber.
        if (!scrub.matches(':active')) {
            t = (t + elapsed * RATE) % (SAMPLES - 1);
        }
        drawScene();
    });

    scrub.addEventListener('input', () => {
        t = scrub.valueAsNumber;
        drawScene();
    });
    host.querySelector('fieldset')!.addEventListener('change', (event) => {
        selected = (event.target as HTMLInputElement).value;
        drawScene();
    });

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    t = reducedMotion ? STILL : 0;
    drawScene();
    play(!reducedMotion);

    return () => {
        play(false);
        host.innerHTML = '';
    };
}
