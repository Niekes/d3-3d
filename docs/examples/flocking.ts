import {
    interpolatePlasma,
    quantize,
    randomLcg,
    range,
    scaleLinear,
    scaleSequential,
    select
} from 'd3';
import { axes3D, axisSpec, camera3D, lines3D, points3D, sort } from '../../index';
import type { AxesSpec, HasCentroid, Line, Point, Point3D } from '../../index';
import { playback, rotatingFigure, turnCamera } from './rotatingFigure';
import { placePoints, placeSegments } from './segments';

/*
 * A flock after Craig Reynolds' boids: every boid steers by three rules
 * that only look at its neighbors, and a flock appears. points3D draws the
 * boids, lines3D their tails and axes3D the back walls of the box. The
 * simulation lives in the box from -1 to 1, and every frame projects it
 * again. The figure sizes and fades every dot by its depth, which the
 * orthographic projection drops. The styles ship with the module: the
 * figure adds them to its host.
 */

const ORIGIN = { x: 480, y: 250 };
const SCALE = 125;
const TICKS = 4;
const START_YAW = Math.PI / 6;
const START_TILT = Math.PI / 8;

// The flock, in box units and seconds. The seeded source makes the same
// flock on every reset.
const SEED = 0.42;
const COUNTS = [50, 150, 300];
const BALL = 0.6;
const MIN_SPEED = 0.15;
const MAX_SPEED = 0.6;
// What a weight of 1 means for each rule, tuned so that the default
// weights make one flock that holds together and turns at the walls.
const GAIN = { separation: 0.016, alignment: 3, cohesion: 3 };
// A boid within MARGIN of a wall is pushed back inside, by up to WALL at the wall.
const MARGIN = 0.15;
const WALL = 12;
// Keeps the push of two boids on the same spot finite.
const EPSILON = 1e-4;

// A step never takes longer than this, so a long frame cannot carry a boid
// through a wall. Without motion the figure opens on the flock after STILL steps.
const MAX_STEP = 1 / 30;
const STILL = 240;
// The tail reaches back to where the boid was this many seconds ago.
const TAIL = 0.15;
const READOUT_MS = 250;

// The depth cues. The box reaches DEPTH from its middle, the rotation
// center, at its corners: no point in it lies deeper.
const DEPTH = Math.sqrt(3);
const EYE = 4;
const DOT = 3.5;
const sizeByDepth = scaleLinear([-DEPTH, DEPTH], [2.5, 5]);
const fadeByDepth = scaleLinear([-DEPTH, DEPTH], [0.45, 1]);

// The speed colors: the middle of plasma, the part that reads on the light
// and on the dark page.
const ramp = (t: number) => interpolatePlasma(0.3 + 0.4 * t);
const color = scaleSequential(ramp).domain([MIN_SPEED, MAX_SPEED]);

const AXES = ['x', 'y', 'z'] as const;
const RULES = ['separation', 'alignment', 'cohesion'] as const;

const axis = axisSpec(scaleLinear([-1, 1], [-1, 1]), TICKS);
const SPEC: AxesSpec = { x: axis, y: axis, z: axis };

/** A boid: a position, a velocity and an id that joins it to its dot and its tail. */
type Boid = Point3D & { id: number; velocity: Point3D };

/** The weights of the three rules and the radius a boid sees its neighbors in. */
type Rules = Record<(typeof RULES)[number] | 'radius', number>;

/** What a boid sees: the sums over its neighbors and the push away from the close ones. */
type View = { count: number; position: Point3D; velocity: Point3D; push: Point3D };

const zero = (): Point3D => ({ x: 0, y: 0, z: 0 });
const speed = (v: Point3D) => Math.hypot(v.x, v.y, v.z);

/** Adds `w` times `b` to `a`, in place. */
function addTo(a: Point3D, b: Point3D, w = 1): void {
    a.x += w * b.x;
    a.y += w * b.y;
    a.z += w * b.z;
}

/**
 * A flock of `count` boids from the seed: in a ball of radius BALL, every
 * one flying in a random direction at the middle speed.
 */
function seedFlock(count: number): Boid[] {
    const random = randomLcg(SEED);
    // An even height and an even angle around it cover the sphere evenly.
    const direction = (length: number): Point3D => {
        const z = 2 * random() - 1;
        const angle = 2 * Math.PI * random();
        const ring = length * Math.sqrt(1 - z * z);
        return { x: ring * Math.cos(angle), y: ring * Math.sin(angle), z: length * z };
    };
    return range(count).map((id) => ({
        id,
        // The cube root fills the ball evenly, not crowded at its middle.
        ...direction(BALL * Math.cbrt(random())),
        velocity: direction((MIN_SPEED + MAX_SPEED) / 2)
    }));
}

/** The push back inside along one axis, which grows with the depth into the margin. */
const wallPush = (p: number) =>
    (WALL / MARGIN) * (Math.max(0, MARGIN - 1 - p) - Math.max(0, p - 1 + MARGIN));

/**
 * Moves the flock on by `dt` seconds in two passes. The first sums what
 * every boid sees and the second steers and moves them all, so no boid
 * reacts to a neighbor that has already moved, whatever the order.
 */
function step(boids: Boid[], rules: Rules, dt: number): void {
    const near = rules.radius ** 2;
    const close = (rules.radius / 2) ** 2;
    const views: View[] = boids.map(() => ({
        count: 0,
        position: zero(),
        velocity: zero(),
        push: zero()
    }));

    // ponytail: every pair, 45,000 for 300 boids; a uniform grid of cells
    // one radius wide if the flock grows.
    for (let i = 0; i < boids.length; i += 1) {
        for (let j = i + 1; j < boids.length; j += 1) {
            const a = boids[i];
            const b = boids[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dz = b.z - a.z;
            const d2 = dx * dx + dy * dy + dz * dz;
            if (d2 >= near) {
                continue;
            }
            // Within the radius each one sees the other.
            const seenByA = views[i];
            const seenByB = views[j];
            seenByA.count += 1;
            seenByB.count += 1;
            addTo(seenByA.position, b);
            addTo(seenByA.velocity, b.velocity);
            addTo(seenByB.position, a);
            addTo(seenByB.velocity, a.velocity);
            // Within half of it they push apart, the harder the closer they are.
            if (d2 < close) {
                const push = 1 / (d2 + EPSILON);
                const ab = { x: dx, y: dy, z: dz };
                addTo(seenByA.push, ab, -push);
                addTo(seenByB.push, ab, push);
            }
        }
    }

    boids.forEach((boid, i) => {
        const { count, position, velocity, push } = views[i];
        const v = boid.velocity;
        for (const k of AXES) {
            let steer = rules.separation * GAIN.separation * push[k] + wallPush(boid[k]);
            if (count) {
                steer += rules.alignment * GAIN.alignment * (velocity[k] / count - v[k]);
                steer += rules.cohesion * GAIN.cohesion * (position[k] / count - boid[k]);
            }
            v[k] += steer * dt;
        }
        const s = speed(v);
        const limit = Math.max(MIN_SPEED, Math.min(MAX_SPEED, s)) / s;
        for (const k of AXES) {
            v[k] *= limit;
            boid[k] += v[k] * dt;
        }
    });
}

/** The length of the mean heading: 0 for boids flying every way, 1 for one direction. */
function polarization(boids: Boid[]): number {
    const sum = zero();
    for (const { velocity } of boids) {
        addTo(sum, velocity, 1 / speed(velocity));
    }
    return speed(sum) / boids.length;
}

/**
 * How much larger than at the rotation center, the middle of the box, a
 * rotated depth `z` is drawn from an eye `distance` away.
 */
const growth = (z: number, distance: number) => 1 / (1 - z / distance);

/**
 * The radius of a dot at a rotated depth. Orthographic, the figure maps
 * the depth onto a size of its own. In perspective the projection draws
 * the distances around the dot larger by its growth, and the figure grows
 * the dot by the same factor.
 */
const radius = (z: number, distance: number) =>
    distance === Infinity ? sizeByDepth(z) : DOT * growth(z, distance);

/** The tail of a boid: a segment back to where it was TAIL seconds ago. */
const tail = (boid: Boid): Boid[] => [
    boid,
    {
        ...boid,
        x: boid.x - boid.velocity.x * TAIL,
        y: boid.y - boid.velocity.y * TAIL,
        z: boid.z - boid.velocity.z * TAIL
    }
];

/**
 * Mounts the figure into `host` and returns a function that removes it.
 */
export function mountFlocking(host: HTMLElement): () => void {
    // The state: every input writes it, and `render` reads it.
    let count = COUNTS[1];
    let boids: Boid[] = [];
    const rules: Rules = { separation: 1, alignment: 1, cohesion: 1, radius: 0.25 };
    let yaw = 0;
    let pitch = 0;

    // The renderers hang on one camera, so turning it turns the whole scene.
    const camera = camera3D().scale(SCALE).origin(ORIGIN);
    const box3d = axes3D().camera(camera);
    const dots3d = points3D<Boid>().camera(camera);
    const tails3d = lines3D<Boid>().camera(camera);

    const { group, button } = rotatingFigure(
        host,
        'flock',
        'A flock of boids in a box, each colored by its speed. Drag the figure to rotate it. Or focus it, press Space to play and pause and the period key to step.',
        (dragYaw, dragPitch) => {
            yaw = dragYaw;
            pitch = dragPitch;
            render();
        }
    );

    const wallGroup = group.append('g').attr('class', 'flock-walls');
    const flockGroup = group.append('g').attr('class', 'flock-boids');

    const slider = (name: string, min: number, max: number, by: number, value: number) =>
        `<label>${name} <input name="${name}" type="range" min="${min}" max="${max}" step="${by}" value="${value}"><output>${value}</output></label>`;

    host.classList.add('flocking');
    host.insertAdjacentHTML(
        'beforeend',
        `<style>${STYLES}</style>
        <form class="flock-controls">
            ${RULES.map((name) => slider(name, 0, 2, 0.1, rules[name])).join('')}
            ${slider('radius', 0.1, 0.5, 0.05, rules.radius)}
            <label>boids <select name="count">${COUNTS.map(
                (n) => `<option${n === count ? ' selected' : ''}>${n}</option>`
            ).join('')}</select></label>
            <label><input name="perspective" type="checkbox"> perspective</label>
            <button type="button" name="reset">reset</button>
            <p class="flock-legend">speed <span>${MIN_SPEED}</span><span class="flock-ramp" style="background: linear-gradient(to right, ${quantize(ramp, 10).join(', ')})"></span><span>${MAX_SPEED} units/s</span></p>
            <p class="flock-readout">polarization <output></output> <span aria-live="polite"></span></p>
        </form>`
    );

    const svg = select(host).select<SVGSVGElement>('svg').attr('tabindex', 0);
    const form = host.querySelector('form')!;
    const order = host.querySelector('.flock-readout output')!;
    const status = host.querySelector('.flock-readout span')!;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /** Turns the camera by the drag and paints the walls, then the boids back to front. */
    function render(): void {
        turnCamera(camera, yaw, pitch, { yaw: START_YAW, tilt: START_TILT });

        wallGroup
            .selectAll('path')
            .data(box3d.data(SPEC).filter((wall) => !wall.ccw))
            .join('path')
            .attr('d', box3d.draw);

        // The centroid of a point is its rotated position, so its z is the depth.
        flockGroup
            .selectAll<SVGCircleElement, Point<Boid>>('circle')
            .data(dots3d.data(boids), (d) => d.id)
            .join('circle')
            .call(placePoints)
            .attr('r', (d) => radius(d.centroid.z, camera.perspective()))
            .attr('opacity', (d) => fadeByDepth(d.centroid.z))
            .style('fill', (d) => color(speed(d.velocity)));

        flockGroup
            .selectAll<SVGLineElement, Line<Boid>>('line')
            .data(tails3d.data(boids.map(tail)), (d) => d[0].id)
            .join('line')
            .call(placeSegments)
            .attr('opacity', (d) => fadeByDepth(d[0].rotated.z))
            .style('stroke', (d) => color(speed(d[0].velocity)));

        // One painter's list: a tail that points away lies under its dot.
        flockGroup.selectAll<SVGElement, HasCentroid>('circle, line').sort(sort);
    }

    const showOrder = () => {
        order.textContent = polarization(boids).toFixed(2);
    };

    /** Seeds the flock again; without motion it opens on the flock it has become. */
    function reset(): void {
        boids = seedFlock(count);
        for (let k = 0; reducedMotion && k < STILL; k += 1) {
            step(boids, rules, MAX_STEP);
        }
        render();
        showOrder();
    }

    // One frame of the playback: a step of the flock by the elapsed time,
    // and the readout four times a second, slow enough to read.
    let sinceReadout = 0;
    const play = playback(button, (elapsed) => {
        step(boids, rules, Math.min(elapsed / 1000, MAX_STEP));
        render();
        sinceReadout += elapsed;
        if (sinceReadout >= READOUT_MS) {
            sinceReadout = 0;
            showOrder();
        }
    });

    form.addEventListener('input', (event) => {
        const input = event.target as HTMLInputElement;
        if (input.name === 'count') {
            count = Number(input.value);
            reset();
        } else if (input.name === 'perspective') {
            camera.perspective(input.checked ? EYE : Infinity);
            render();
        } else {
            rules[input.name as keyof Rules] = input.valueAsNumber;
            input.nextElementSibling!.textContent = input.value;
        }
    });
    form.querySelector('[name=reset]')!.addEventListener('click', reset);

    // Space plays and pauses, and the period key steps the paused flock.
    // The button names what a click does next, so it tells the state.
    svg.on('keydown', (event: KeyboardEvent) => {
        // Cmd and Ctrl keep their browser shortcuts.
        if (event.metaKey || event.ctrlKey) {
            return;
        }
        if (event.key === ' ') {
            play(button.text() === 'play');
        } else if (event.key === '.') {
            play(false);
            step(boids, rules, MAX_STEP);
            render();
        } else {
            return;
        }
        event.preventDefault();
        showOrder();
        const playing = button.text() === 'pause';
        status.textContent = `${playing ? 'Playing' : 'Paused'}, polarization ${polarization(boids).toFixed(2)}.`;
    });

    reset();
    play(!reducedMotion);

    return () => {
        play(false);
        host.innerHTML = '';
        host.classList.remove('flocking');
    };
}

// The styles of the figure, scoped by the class of its host. VitePress puts
// the class `dark` on the root element in dark mode.
const STYLES = `
.flocking {
    --fl-ink: #1b1e21;
    --fl-muted: #5f6468;
    --fl-wall: #888888;
    --fl-button: #f0f1f1;
    --fl-line: #c4c7c9;
    --fl-bg: #ffffff;
    margin: 1.5rem 0;
    position: relative;
    overflow: hidden;
    border: 1px solid var(--fl-line);
    border-radius: 12px;
    background: var(--fl-bg);
    color: var(--fl-ink);
}

.dark .flocking {
    --fl-ink: #e6e8e9;
    --fl-muted: #9aa0a4;
    --fl-button: #17181a;
    --fl-line: #3d4144;
    --fl-bg: #0c0d0e;
}

.flocking .flock-svg {
    display: block;
    width: 100%;
    height: auto;
    cursor: grab;
    touch-action: none;
}

.flocking .flock-svg:active {
    cursor: grabbing;
}

/* The browser rings a focused SVG on every click: keep the ring for the keyboard. */
.flocking .flock-svg:focus {
    outline: none;
}

.flocking .flock-svg:focus-visible {
    outline: 2px solid var(--fl-ink);
    outline-offset: -4px;
}

.flocking .flock-walls path {
    fill: var(--fl-wall);
    fill-opacity: 0.06;
    stroke: var(--fl-wall);
    stroke-opacity: 0.4;
    stroke-width: 0.5;
}

/* A thin ring in the page color keeps a dot apart from the one behind it. */
.flocking .flock-boids circle {
    stroke: var(--fl-bg);
    stroke-width: 0.75;
}

.flocking .flock-boids line {
    stroke-width: 1.5;
    stroke-linecap: round;
}

.flocking .flock-button,
.flocking .flock-controls button {
    padding: 0.35rem 0.9rem;
    border: 1px solid var(--fl-line);
    border-radius: 8px;
    background: var(--fl-button);
    color: var(--fl-ink);
    font-size: 0.85rem;
    cursor: pointer;
}

.flocking .flock-button {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
}

.flocking .flock-button:hover,
.flocking .flock-controls button:hover {
    border-color: var(--fl-ink);
}

.flocking .flock-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 1.5rem;
    padding: 0.75rem;
    border-top: 1px solid var(--fl-line);
    font-size: 0.85rem;
}

.flocking label {
    display: flex;
    align-items: center;
    gap: 6px;
}

.flocking output {
    min-width: 2.5em;
    font-variant-numeric: tabular-nums;
}

.flocking .flock-legend,
.flocking .flock-readout {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    color: var(--fl-muted);
    font-variant-numeric: tabular-nums;
}

.flocking .flock-readout output,
.flocking .flock-readout span {
    color: var(--fl-ink);
}

.flocking .flock-ramp {
    width: 6rem;
    height: 0.6rem;
    border-radius: 3px;
}

/* On a phone every control takes its own row, and the sliders the width. */
@media (max-width: 640px) {
    .flocking .flock-controls > * {
        flex: 1 1 100%;
    }

    .flocking .flock-controls input[type='range'] {
        flex: 1;
    }
}
`;
