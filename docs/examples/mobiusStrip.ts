import { interpolateLab, range, select } from 'd3';
import {
    camera3D,
    lineStrips3D,
    lines3D,
    normal,
    points3D,
    sort,
    strips,
    triangles3D
} from '../../index';
import type { HasCentroid, Line, Point, Point3D } from '../../index';
import { joinFacets } from './facets';
import { playback, rotatingFigure, turnCamera } from './rotatingFigure';
import { placeSegments } from './segments';

/*
 * A Möbius strip: a band of triangles drawn with triangles3D, lit by a
 * headlight at the camera. A face takes the absolute cosine between its
 * normal and the view direction, so a surface with one side is lit alike
 * from both. A walker on the centre line carries the normal as an arrow and
 * comes back from one lap upside down, and the edge drawn with lineStrips3D
 * is a single loop. The styles ship with the module: the figure adds them
 * to its host.
 */

const TAU = Math.PI * 2;
const ORIGIN = { x: 480, y: 250 };
const SCALE = 170;
const START = { yaw: -Math.PI / 6, tilt: Math.PI / 5 };
// The strip: the radius of its centre line and its half-width, in model
// units, and the steps of the mesh around and across.
const RADIUS = 1;
const HALF_WIDTH = 0.35;
const AROUND = 96;
const ACROSS = 4;
const MAX_TWISTS = 5;
// The samples of the edge per lap, and per piece of the painter's list.
const EDGE_SAMPLES = 192;
const EDGE_PIECE = 6;
// A face seen edge-on still gets this much light.
const AMBIENT = 0.25;
// The walker: the length of its arrow and the lift of its dot in model
// units, the side of the tiny triangle its arrow comes from, the time of
// one lap and the key steps per lap.
const ARROW = 0.3;
const LIFT = 0.02;
const EPSILON = 0.001;
const LAP = 8000;
const KEY_STEPS = 48;
const DOT = 7;

// From a face seen edge-on to one seen head-on. With the winding shown, the
// faces wound counter-clockwise on the screen take blue, the others orange.
// All three read on either page color.
const STRIP = interpolateLab('#0b3b36', '#7ad3c3');
const FRONT = interpolateLab('#0d366b', '#86b6ef');
const BACK = interpolateLab('#5a2207', '#f4a261');

/**
 * The point of the strip with `k` half-twists at the angle `u` around and
 * `v` across. For an odd `k`, the point at `u + 2π` and `v` is the point at
 * `u` and `-v`: the strip has one side.
 */
function surface(k: number, u: number, v: number): Point3D {
    const r = RADIUS + v * Math.cos((k * u) / 2);
    return { x: r * Math.cos(u), y: v * Math.sin((k * u) / 2), z: r * Math.sin(u) };
}

/**
 * The strip as triangles, two per quad of the parameter grid, each wound in
 * the order of its parameters: from (i, j) along u, then along v.
 */
function mesh(k: number): Point3D[][] {
    const grid = range(AROUND + 1).map((i) =>
        range(ACROSS + 1).map((j) =>
            surface(k, (i / AROUND) * TAU, HALF_WIDTH * ((2 * j) / ACROSS - 1))
        )
    );
    return range(AROUND).flatMap((i) =>
        range(ACROSS).flatMap((j) => {
            const [a, b, c, d] = [grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]];
            return [
                [a, b, c],
                [a, c, d]
            ];
        })
    );
}

/**
 * The boundary of the strip, cut into pieces that sort on their own depth:
 * for an odd `k` one loop at `v = w` over two laps, for an even one a loop
 * at each side over one lap.
 */
function edge(k: number): Point3D[][] {
    const loop = (v: number, laps: number) =>
        range(EDGE_SAMPLES * laps + 1).map((i) => surface(k, (i / EDGE_SAMPLES) * TAU, v));
    const loops = k % 2 ? [loop(HALF_WIDTH, 2)] : [loop(HALF_WIDTH, 1), loop(-HALF_WIDTH, 1)];
    return loops.flatMap((points) => strips(points, EDGE_PIECE));
}

/**
 * The normal at the point `s` of the centre line: the normal of a tiny
 * triangle wound like the mesh. `s` runs on past 2π, so the arrow follows
 * the surface through the second lap without a jump.
 */
function arrowAt(k: number, s: number): Point3D {
    return normal([surface(k, s, 0), surface(k, s + EPSILON, 0), surface(k, s, EPSILON)]);
}

const dot = (a: Point3D, b: Point3D) => a.x * b.x + a.y * b.y + a.z * b.z;

/**
 * Mounts the figure into `host` and returns a function that removes it.
 */
export function mountMobiusStrip(host: HTMLElement): () => void {
    // The state: every input writes it, and `render` reads it. The walker
    // is at `s` on the centre line, from 0 to 4π.
    let twists = 1;
    let s = 0;
    let winding = false;
    let yaw = 0;
    let pitch = 0;
    // What follows from the twists, rebuilt only when they change.
    let triangles: Point3D[][] = [];
    let normals: Point3D[] = [];
    let boundary: Point3D[][] = [];

    // The strip, its edge and the walker hang on one camera, so one turn
    // moves them together.
    const camera = camera3D().scale(SCALE).origin(ORIGIN);
    const faces3d = triangles3D<Point3D>().camera(camera);
    const edge3d = lineStrips3D<Point3D>().camera(camera);
    const arrow3d = lines3D<Point3D>().camera(camera);
    const walker3d = points3D<Point3D>().camera(camera);

    const { group, button } = rotatingFigure(
        host,
        'mobius',
        `A Möbius strip of ${AROUND * ACROSS * 2} triangles with a walker on its centre line. Drag it to rotate it, or focus it, walk with the left and right arrow keys, play and pause with Space, change the half-twists with plus and minus and show the winding with W.`,
        (dragYaw, dragPitch) => {
            yaw = dragYaw;
            pitch = dragPitch;
            render();
        }
    );

    host.classList.add('mobius-strip');
    host.insertAdjacentHTML(
        'beforeend',
        `<style>${STYLES}</style>
        <div class="mobius-controls">
            <label>half-twists <input name="twists" type="range" min="0" max="${MAX_TWISTS}" step="1" value="${twists}"><output></output></label>
            <label><input type="checkbox" name="winding"> show winding</label>
            <p class="mobius-readout"><span></span> <span></span> <span aria-live="polite"></span></p>
        </div>`
    );

    const svg = select(host).select<SVGSVGElement>('svg').attr('tabindex', 0);
    svg.insert('defs', 'g').html(
        '<marker id="mobius-head" class="mobius-head" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0,0L10,5L0,10z"/></marker>'
    );
    const slider = host.querySelector('[name=twists]') as HTMLInputElement;
    const checkbox = host.querySelector('[name=winding]') as HTMLInputElement;
    const [sides, lap, status] = Array.from(
        host.querySelectorAll<HTMLElement>('.mobius-readout span')
    );

    /** Builds the triangles, their normals and the edge for the half-twists. */
    function build(): void {
        triangles = mesh(twists);
        // The normals never change in model space: they turn with the mesh.
        normals = triangles.map(normal);
        boundary = edge(twists);
        slider.value = String(twists);
        slider.nextElementSibling!.textContent = String(twists);
    }

    const describeTwists = () =>
        `${twists} half-${twists === 1 ? 'twist' : 'twists'}: ${twists % 2 ? 'one side, one edge' : 'two sides, two edges'}`;
    const isFlipped = () => dot(arrowAt(twists, s), arrowAt(twists, s % TAU)) < 0;
    const describeWalker = () =>
        `lap ${Math.floor(s / TAU) + 1}, ${isFlipped() ? 'upside down' : 'right side up'}`;

    /** Turns the scene, lights the faces and paints the strip, the edge and the walker back to front. */
    function render(): void {
        turnCamera(camera, yaw, pitch, START);
        // The headlight: the light comes from the viewer. The absolute value
        // lights a face alike from either side.
        const view = camera.viewDirection();

        // The projected triangles are new arrays, so the key and the fill are
        // stamped on after the projection.
        const facets = faces3d.data(triangles).map((d, i) => {
            const light = AMBIENT + (1 - AMBIENT) * Math.abs(dot(normals[i], view));
            const ramp = !winding ? STRIP : d.ccw ? FRONT : BACK;
            return Object.assign(d, { id: i, fill: ramp(light) });
        });

        // A strip with one side has no back to hide: every face is painted.
        joinFacets(group, facets, faces3d);

        group
            .selectAll('path.edge')
            .data(edge3d.data(boundary))
            .join((enter) => enter.append('path').attr('class', 'edge'))
            .attr('d', edge3d.draw);

        // The dot sits a little above the surface along the arrow, so it
        // sorts on its own side and hides while it walks underneath.
        const at = surface(twists, s, 0);
        const n = arrowAt(twists, s);
        const along = (t: number) => ({ x: at.x + t * n.x, y: at.y + t * n.y, z: at.z + t * n.z });

        group
            .selectAll<SVGLineElement, Line<Point3D>>('line.arrow')
            .data(arrow3d.data([[at, along(ARROW)]]))
            .join((enter) =>
                enter.append('line').attr('class', 'arrow').attr('marker-end', 'url(#mobius-head)')
            )
            .call(placeSegments);

        group
            .selectAll<SVGCircleElement, Point<Point3D>>('circle.walker')
            .data(walker3d.data([along(LIFT)]))
            .join((enter) => enter.append('circle').attr('class', 'walker').attr('r', DOT))
            .attr('cx', (d) => d.projected.x)
            .attr('cy', (d) => d.projected.y);

        // One painter's list for the faces, the edge pieces and the walker.
        group.selectAll<SVGElement, HasCentroid>('path, line, circle').sort(sort);

        sides.textContent = describeTwists();
        lap.textContent = `· walker on ${describeWalker()}`;
    }

    function setTwists(k: number): void {
        twists = Math.max(0, Math.min(MAX_TWISTS, k));
        build();
        render();
    }

    // One frame of the walk: a lap every LAP milliseconds, two laps home.
    const play = playback(button, (elapsed) => {
        s = (s + (elapsed / LAP) * TAU) % (2 * TAU);
        render();
    });

    // The arrows walk, Space plays and pauses, plus and minus change the
    // half-twists and W shows the winding.
    svg.on('keydown', (event: KeyboardEvent) => {
        // Cmd and Ctrl keep their browser shortcuts, such as Cmd+plus to zoom.
        // AltGr reports Ctrl too, and types plus and minus on some layouts.
        if (event.metaKey || (event.ctrlKey && !event.getModifierState('AltGraph'))) {
            return;
        }
        const key = event.key.toLowerCase();
        if (key === 'arrowleft' || key === 'arrowright') {
            // On the grid of key steps, so 48 presses make a lap exactly.
            const step = Math.round((s / TAU) * KEY_STEPS) + (key === 'arrowright' ? 1 : -1);
            s = ((step + 2 * KEY_STEPS) % (2 * KEY_STEPS)) * (TAU / KEY_STEPS);
            render();
            status.textContent = `Walker on ${describeWalker()}.`;
        } else if (key === ' ') {
            // The button names what a click does next.
            const on = button.text() === 'play';
            play(on);
            status.textContent = on ? 'Walking.' : `Paused on ${describeWalker()}.`;
        } else if (key === '+' || key === '=' || key === '-') {
            setTwists(twists + (key === '-' ? -1 : 1));
            status.textContent = `${describeTwists()}.`;
        } else if (key === 'w') {
            winding = checkbox.checked = !winding;
            render();
            status.textContent = winding ? 'Winding shown.' : 'Winding hidden.';
        } else {
            return;
        }
        event.preventDefault();
    });

    slider.addEventListener('input', () => setTwists(slider.valueAsNumber));
    checkbox.addEventListener('change', () => {
        winding = checkbox.checked;
        render();
    });

    // With reduced motion the walk starts paused after one lap, where the
    // walker on a Möbius strip has just come back upside down.
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    s = reducedMotion ? TAU : 0;
    setTwists(twists);
    play(!reducedMotion);

    return () => {
        play(false);
        host.innerHTML = '';
        host.classList.remove('mobius-strip');
    };
}

// The styles of the figure, scoped by the class of its host. VitePress puts
// the class `dark` on the root element in dark mode.
const STYLES = `
.mobius-strip {
    --mo-ink: #1b1e21;
    --mo-muted: #5f6468;
    --mo-button: #f0f1f1;
    --mo-line: #c4c7c9;
    --mo-bg: #ffffff;
    --mo-edge: #c2255c;
    margin: 1.5rem 0;
    position: relative;
    overflow: hidden;
    border: 1px solid var(--mo-line);
    border-radius: 12px;
    background: var(--mo-bg);
    color: var(--mo-ink);
}

.dark .mobius-strip {
    --mo-ink: #e6e8e9;
    --mo-muted: #9aa0a4;
    --mo-button: #17181a;
    --mo-line: #3d4144;
    --mo-bg: #0c0d0e;
    --mo-edge: #f783ac;
}

.mobius-strip .mobius-svg {
    display: block;
    width: 100%;
    height: auto;
    cursor: grab;
    touch-action: none;
}

.mobius-strip .mobius-svg:active {
    cursor: grabbing;
}

/* The browser rings a focused SVG on every click: keep the ring for the keyboard. */
.mobius-strip .mobius-svg:focus {
    outline: none;
}

.mobius-strip .mobius-svg:focus-visible {
    outline: 2px solid var(--mo-ink);
    outline-offset: -4px;
}

.mobius-strip .facet {
    stroke: #000;
    stroke-opacity: 0.2;
    stroke-width: 0.5;
    stroke-linejoin: round;
}

.mobius-strip .edge {
    fill: none;
    stroke: var(--mo-edge);
    stroke-width: 3;
    stroke-linejoin: round;
    stroke-linecap: round;
}

.mobius-strip .arrow {
    stroke: var(--mo-ink);
    stroke-width: 2.5;
    stroke-linecap: round;
}

.mobius-strip .mobius-head {
    fill: var(--mo-ink);
}

.mobius-strip .walker {
    fill: var(--mo-ink);
    stroke: var(--mo-bg);
    stroke-width: 2;
}

.mobius-strip .mobius-button {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    padding: 0.35rem 0.9rem;
    border: 1px solid var(--mo-line);
    border-radius: 8px;
    background: var(--mo-button);
    color: var(--mo-ink);
    font-size: 0.85rem;
    cursor: pointer;
}

.mobius-strip .mobius-button:hover {
    border-color: var(--mo-ink);
}

.mobius-strip .mobius-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 1.5rem;
    padding: 0.75rem;
    border-top: 1px solid var(--mo-line);
    font-size: 0.85rem;
}

.mobius-strip label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.mobius-strip output {
    min-width: 1em;
    font-variant-numeric: tabular-nums;
}

.mobius-strip .mobius-readout {
    flex: 1 1 16rem;
    margin: 0;
    color: var(--mo-muted);
    font-variant-numeric: tabular-nums;
}

.mobius-strip .mobius-readout span:first-child,
.mobius-strip .mobius-readout span:last-child {
    color: var(--mo-ink);
}

/* On a phone the controls stack, one per line. */
@media (max-width: 480px) {
    .mobius-strip .mobius-controls {
        flex-direction: column;
        align-items: stretch;
    }

    .mobius-strip .mobius-readout {
        flex-basis: auto;
    }
}
`;
