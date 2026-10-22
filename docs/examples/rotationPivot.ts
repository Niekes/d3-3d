import { drag, range, select } from 'd3';
import { box, camera3D, cubes3D, lineStrips3D, lines3D, points3D } from '../../index';
import type { CubeFace, Line, Point, Point3D } from '../../index';
import { joinFaces } from './cubeFaces';
import { FLOOR_MOVES, FLOOR_TURN, floorGrid } from './floorView';
import { enterHandles, placeHandles } from './handles';
import { playback, rotatingFigure, turnCamera } from './rotatingFigure';
import { placeSegments } from './segments';

/*
 * A rotation pivot: a box on a floor and the point the scene turns around.
 * A turn leaves its rotation center in place, so the pivot stands still
 * while the scene spins, and every corner of the box travels on a circle
 * around the vertical line through the pivot. A new pivot shifts the whole
 * picture, and the origin takes that shift back out, so only the next turn
 * shows the move. The styles ship with the module: the figure adds them to
 * its host.
 */

// The floor: x and z from -5 to 5. The pivot rises up to 4 above it; the
// screen y grows downwards, so heights are negative y.
const HALF = 5;
const TOP = 4;
const SCALE = 30;
// The pivot starts at the world origin, and the world origin lands on the
// origin. The origin is set so that the middle of the scene, 2 above the
// floor, lands in the middle of the 960 × 500 view box at the start tilt.
const START_ORIGIN = { x: 480, y: 250 + (TOP / 2) * SCALE * Math.cos(FLOOR_TURN.tilt) };
// A quarter turn per second, in radians per millisecond, and the turn of
// one click with reduced motion.
const SPIN = Math.PI / 2 / 1000;
const STEP_TURN = Math.PI / 6;
const KEY_STEP = 0.5;
const ORBIT_STEPS = 64;
// A corner closer than this to the axis does not move.
const EPSILON = 1e-6;
// The marks in CSS pixels: the drawn dots and the circle that takes the
// pointer, so a finger finds them.
const DOT = 5;
const PIVOT = 8;
const HIT = 12;

const ORIGIN: Point3D = { x: 0, y: 0, z: 0 };
// The normal of the horizontal plane a drag moves the pivot in.
const UP: Point3D = { x: 0, y: 1, z: 0 };

/** A corner of the box, with an id that joins it to its dot and its orbit. */
type Corner = Point3D & { id: number };

/** The box: 2 wide, 1 deep and 3 high, away from the middle of the floor. */
const CORNERS: Corner[] = box({ x: 2, y: 0, z: -1.5, width: 2, height: 3, depth: 1 }).map(
    (corner, id) => ({ ...corner, id })
);

/** Two top corners on opposite sides of the box, so the figure starts with two orbits. */
const START_ORBITS = [0, 7];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** The distance of a point from the vertical line through the pivot. */
const radiusOf = (point: Point3D, pivot: Point3D) =>
    Math.hypot(point.x - pivot.x, point.z - pivot.z);

/**
 * The orbit of a corner: a closed loop around the vertical line through the
 * pivot, through the corner and at its height.
 */
function orbitOf(corner: Point3D, pivot: Point3D): Point3D[] {
    const r = radiusOf(corner, pivot);
    return range(ORBIT_STEPS + 1).map((i) => {
        const angle = (2 * Math.PI * i) / ORBIT_STEPS;
        return { x: pivot.x + r * Math.cos(angle), y: corner.y, z: pivot.z + r * Math.sin(angle) };
    });
}

const describe = (point: Point3D) =>
    `x ${point.x.toFixed(2)}, height ${(-point.y).toFixed(2)}, z ${point.z.toFixed(2)}`;

/**
 * Mounts the figure into `host` and returns a function that removes it.
 */
export function mountRotationPivot(host: HTMLElement): () => void {
    // The state: every input writes it, and `render` reads it.
    let pivot: Point3D = ORIGIN;
    const orbiting = new Set(START_ORBITS);
    let selected: number | undefined;
    let last = START_ORBITS[1];
    let dragYaw = 0;
    let dragPitch = 0;
    let spinYaw = 0;
    // The grab offset of a pivot drag, from the pointer to the pivot.
    let offset = { x: 0, z: 0 };

    // Every renderer hangs on one camera, and the camera holds the pivot.
    const camera = camera3D().scale(SCALE).origin(START_ORIGIN).rotationCenter(pivot);
    const lines = lines3D().camera(camera);
    const cubes = cubes3D<Corner>().camera(camera);
    const dots = points3D<Corner>().camera(camera);
    const marks = points3D().camera(camera);
    const strips = lineStrips3D().camera(camera);

    const { group, button } = rotatingFigure(
        host,
        'pivot',
        'A box on a floor and the orange pivot the scene turns around, with the orbits of two corners. Drag the pivot to move it across the floor, click a corner to show or hide its orbit and drag the background to rotate. Or focus it, move the pivot with the arrow keys and Page Up and Page Down, pick a corner with the bracket keys and press Enter to show or hide its orbit.',
        (yaw, pitch) => {
            dragYaw = yaw;
            dragPitch = pitch;
            render();
        }
    );

    host.classList.add('rotation-pivot');
    host.insertAdjacentHTML(
        'beforeend',
        `<style>${STYLES}</style>
        <div class="pivot-controls">
            <fieldset>
                <legend>pivot</legend>
                <label>x <input name="x" type="range" min="${-HALF}" max="${HALF}" step="0.25"><output></output></label>
                <label>height <input name="height" type="range" min="0" max="${TOP}" step="0.25"><output></output></label>
                <label>z <input name="z" type="range" min="${-HALF}" max="${HALF}" step="0.25"><output></output></label>
            </fieldset>
            <p class="pivot-readout"><span></span> <span></span> <span aria-live="polite"></span></p>
        </div>`
    );

    const svg = select(host).select<SVGSVGElement>('svg').attr('tabindex', 0);
    // Painted in this order, after the floor: the orbits, the axis and the
    // dots are guides, and a guide hidden behind the box teaches nothing.
    const drawFloor = floorGrid(svg, 'pivot', camera, 2 * HALF);
    const boxGroup = group.append('g').attr('class', 'pivot-box');
    const orbitGroup = group.append('g').attr('class', 'pivot-orbits');
    const axisGroup = group.append('g').attr('class', 'pivot-axis');
    const markGroup = group.append('g').attr('class', 'pivot-marks');
    const cornerGroup = markGroup.append('g');
    const pivotGroup = markGroup.append('g');
    const sliders = Array.from(host.querySelectorAll<HTMLInputElement>('.pivot-controls input'));
    const [position, orbit, status] = Array.from(
        host.querySelectorAll<HTMLElement>('.pivot-readout span')
    );

    const isFixed = (corner: Point3D) => radiusOf(corner, pivot) < EPSILON;

    /** The orbit of a corner in words: its radius, or that it stays put. */
    function orbitText(id: number): string {
        const r = radiusOf(CORNERS[id], pivot);
        return r < EPSILON ? 'on the axis, it stays put' : `radius ${r.toFixed(2)}`;
    }

    /** Turns the scene around the pivot and draws the floor, the box, the guides and the marks. */
    function render(): void {
        turnCamera(camera, dragYaw + spinYaw, dragPitch, FLOOR_TURN);
        camera.rotationCenter(pivot);
        drawFloor();

        const [cube] = cubes.data([CORNERS]);
        joinFaces(
            boxGroup
                .selectAll<SVGPathElement, CubeFace<Corner>>('path')
                .data(cube.faces, (d) => d.face),
            cubes.draw
        );

        // A corner on the axis does not move, so it has no orbit to draw.
        const circling = CORNERS.filter((corner) => orbiting.has(corner.id) && !isFixed(corner));
        orbitGroup
            .selectAll('path')
            .data(strips.data(circling.map((corner) => orbitOf(corner, pivot))))
            .join('path')
            .attr('d', strips.draw);

        axisGroup
            .selectAll<SVGLineElement, Line<Point3D>>('line')
            .data(
                lines.data([
                    [
                        { ...pivot, y: 0 },
                        { ...pivot, y: -TOP - 1 }
                    ]
                ])
            )
            .join('line')
            .call(placeSegments);

        // The view box shrinks with a narrow page; the marks keep their size
        // on the screen.
        const unit = 960 / (svg.node()!.getBoundingClientRect().width || 960);
        cornerGroup
            .selectAll<SVGGElement, Point<Corner>>('g')
            .data(dots.data(CORNERS), (d) => d.id)
            .join(enterHandles)
            .attr(
                'class',
                (d) =>
                    `corner${orbiting.has(d.id) ? ' has-orbit' : ''}${isFixed(d) ? ' is-fixed' : ''}${d.id === selected ? ' is-selected' : ''}`
            )
            .call(placeHandles, DOT * unit, HIT * unit);
        pivotGroup
            .selectAll<SVGGElement, Point<Point3D>>('g')
            .data(marks.data([pivot]))
            .join((enter) => enterHandles(enter).attr('class', 'pivot').call(dragPivot))
            .call(placeHandles, PIVOT * unit, HIT * unit);

        position.textContent = `pivot ${describe(pivot)}`;
        orbit.textContent = `· corner ${last + 1}, ${orbitText(last)}`;
        const values: Record<string, number> = { x: pivot.x, height: -pivot.y, z: pivot.z };
        for (const slider of sliders) {
            slider.valueAsNumber = values[slider.name];
            slider.nextElementSibling!.textContent = values[slider.name].toFixed(2);
        }
    }

    /**
     * Moves the pivot and keeps the picture where it is. A new rotation
     * center shifts every point on the screen by the same amount, so the
     * shift of one point, the world origin, is the shift of all of them, and
     * the origin of the camera takes it back out.
     */
    function movePivot(to: Point3D): void {
        const [before] = marks.data([ORIGIN]);
        pivot = {
            x: clamp(to.x, -HALF, HALF),
            y: clamp(to.y, -TOP, 0),
            z: clamp(to.z, -HALF, HALF)
        };
        camera.rotationCenter(pivot);
        const [after] = marks.data([ORIGIN]);
        const origin = camera.origin();
        camera.origin({
            x: origin.x - (after.projected.x - before.projected.x),
            y: origin.y - (after.projected.y - before.projected.y)
        });
        render();
    }

    /** Shows or hides the orbit of a corner and selects it. */
    function toggle(id: number): void {
        if (!orbiting.delete(id)) {
            orbiting.add(id);
        }
        selected = last = id;
        render();
    }

    // The drag on the pivot moves it across the floor at its height: the
    // plane through it with the normal up. d3.drag stops the press from
    // reaching the drag of the figure, so moving the pivot never turns the
    // scene. The subject is the pointer, so the events carry it in the units
    // of the view box, the units `unproject` expects.
    const dragPivot = drag<SVGGElement, Point<Point3D>>()
        .subject((event) => ({ x: event.x, y: event.y }))
        .on('start', (event) => {
            // The offset keeps the pivot where it was grabbed, not under the
            // middle of the pointer.
            const hit = marks.unproject({ x: event.x, y: event.y }, pivot, UP) ?? pivot;
            offset = { x: pivot.x - hit.x, z: pivot.z - hit.z };
        })
        .on('drag', (event) => {
            const hit = marks.unproject({ x: event.x, y: event.y }, pivot, UP);
            // A plane seen edge-on has no point under the pointer.
            if (hit) {
                movePivot({ x: hit.x + offset.x, y: pivot.y, z: hit.z + offset.z });
            }
        });

    // A click on a corner shows or hides its orbit. d3.drag swallows the
    // click that ends a turn of the scene, so turning never toggles one.
    svg.on('click', (event: MouseEvent) => {
        const hit = (event.target as Element).closest('.corner');
        if (hit) {
            toggle(select<Element, Point<Corner>>(hit).datum().id);
        }
    });

    // The arrows and the page keys move the pivot, Home puts it back, the
    // brackets pick a corner and Enter shows or hides its orbit.
    svg.on('keydown', (event: KeyboardEvent) => {
        // Cmd and Ctrl keep their browser shortcuts, such as Cmd+[ for back.
        // AltGr reports Ctrl too, and types the brackets on many layouts.
        if (event.metaKey || (event.ctrlKey && !event.getModifierState('AltGraph'))) {
            return;
        }
        const move = FLOOR_MOVES[event.key];
        if (move || event.key === 'Home') {
            movePivot(
                move
                    ? {
                          x: pivot.x + move[0] * KEY_STEP,
                          y: pivot.y + move[1] * KEY_STEP,
                          z: pivot.z + move[2] * KEY_STEP
                      }
                    : ORIGIN
            );
            status.textContent = `Pivot at ${describe(pivot)}.`;
        } else if (event.key === '[' || event.key === ']') {
            const step = event.key === ']' ? 1 : -1;
            const n = CORNERS.length;
            const id =
                selected === undefined && step < 0 ? n - 1 : ((selected ?? -1) + step + n) % n;
            selected = id;
            render();
            status.textContent = `Corner ${id + 1} of ${n}, ${orbitText(id)}.`;
        } else if (event.key === 'Enter' && selected !== undefined) {
            toggle(selected);
            status.textContent = `Orbit of corner ${selected + 1} ${orbiting.has(selected) ? 'shown' : 'hidden'}, ${orbitText(selected)}.`;
        } else {
            return;
        }
        event.preventDefault();
    });

    // A slider moves the pivot along its own axis only.
    host.querySelector('.pivot-controls')!.addEventListener('input', (event) => {
        const { name, valueAsNumber: value } = event.target as HTMLInputElement;
        movePivot({
            x: name === 'x' ? value : pivot.x,
            y: name === 'height' ? -value : pivot.y,
            z: name === 'z' ? value : pivot.z
        });
    });

    // The button spins the scene around the pivot. With reduced motion it
    // turns the scene by 30 degrees per click and runs no timer.
    const play = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? undefined
        : playback(button, (elapsed) => {
              spinYaw += elapsed * SPIN;
              render();
          });
    if (play) {
        play(false);
    } else {
        button.text('turn 30°').on('click', () => {
            spinYaw += STEP_TURN;
            render();
        });
    }

    render();

    return () => {
        play?.(false);
        host.innerHTML = '';
        host.classList.remove('rotation-pivot');
    };
}

// The styles of the figure, scoped by the class of its host. VitePress puts
// the class `dark` on the root element in dark mode.
const STYLES = `
.rotation-pivot {
    --rp-ink: #1b1e21;
    --rp-muted: #5f6468;
    --rp-button: #f0f1f1;
    --rp-line: #c4c7c9;
    --rp-bg: #ffffff;
    --rp-floor: #eef0f1;
    --rp-grid: #b3b8bc;
    --rp-box: #9aabbd;
    --rp-corner: #5f6468;
    --rp-orbit: #2a78d6;
    --rp-pivot: #eb6834;
    margin: 1.5rem 0;
    position: relative;
    overflow: hidden;
    border: 1px solid var(--rp-line);
    border-radius: 12px;
    background: var(--rp-bg);
    color: var(--rp-ink);
}

.dark .rotation-pivot {
    --rp-ink: #e6e8e9;
    --rp-muted: #9aa0a4;
    --rp-button: #17181a;
    --rp-line: #3d4144;
    --rp-bg: #0c0d0e;
    --rp-floor: #1a1c1e;
    --rp-grid: #43484c;
    --rp-box: #5b6b7c;
    --rp-corner: #b4babe;
    --rp-orbit: #3987e5;
    --rp-pivot: #f07a48;
}

.rotation-pivot .pivot-svg {
    display: block;
    width: 100%;
    height: auto;
    cursor: grab;
    touch-action: none;
}

.rotation-pivot .pivot-svg:active {
    cursor: grabbing;
}

/* The browser rings a focused SVG on every click: keep the ring for the keyboard. */
.rotation-pivot .pivot-svg:focus {
    outline: none;
}

.rotation-pivot .pivot-svg:focus-visible {
    outline: 2px solid var(--rp-ink);
    outline-offset: -4px;
}

.rotation-pivot .floor {
    fill: var(--rp-floor);
}

.rotation-pivot .pivot-floor line {
    stroke: var(--rp-grid);
    stroke-width: 0.75;
}

.rotation-pivot .face {
    fill: var(--rp-box);
    stroke: color-mix(in srgb, var(--rp-box) 50%, black);
    stroke-width: 0.75;
    stroke-linejoin: round;
}

.rotation-pivot .face-front,
.rotation-pivot .face-back {
    fill: color-mix(in srgb, var(--rp-box) 82%, black);
}

.rotation-pivot .face-left,
.rotation-pivot .face-right {
    fill: color-mix(in srgb, var(--rp-box) 66%, black);
}

.rotation-pivot .pivot-orbits path {
    fill: none;
    stroke: var(--rp-orbit);
    stroke-width: 1.5;
    stroke-dasharray: 6 4;
}

.rotation-pivot .pivot-axis line {
    stroke: var(--rp-pivot);
    stroke-width: 1.5;
}

.rotation-pivot .pivot-orbits,
.rotation-pivot .pivot-axis {
    pointer-events: none;
}

.rotation-pivot .hit {
    fill: transparent;
}

.rotation-pivot .corner {
    cursor: pointer;
}

.rotation-pivot .corner .dot {
    fill: var(--rp-corner);
    stroke: var(--rp-bg);
    stroke-width: 2;
}

.rotation-pivot .corner.has-orbit .dot {
    fill: var(--rp-orbit);
}

/* A corner on the axis does not move: a ring in the color of the pivot. */
.rotation-pivot .corner.is-fixed .dot {
    fill: var(--rp-bg);
    stroke: var(--rp-pivot);
    stroke-width: 2.5;
}

.rotation-pivot .corner.is-selected .dot {
    stroke: var(--rp-ink);
    stroke-width: 3;
}

.rotation-pivot .pivot {
    cursor: move;
}

.rotation-pivot .pivot .dot {
    fill: var(--rp-pivot);
    stroke: var(--rp-bg);
    stroke-width: 2;
}

.rotation-pivot .pivot-button {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    padding: 0.35rem 0.9rem;
    border: 1px solid var(--rp-line);
    border-radius: 8px;
    background: var(--rp-button);
    color: var(--rp-ink);
    font-size: 0.85rem;
    cursor: pointer;
}

.rotation-pivot .pivot-button:hover {
    border-color: var(--rp-ink);
}

.rotation-pivot .pivot-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 1.5rem;
    padding: 0.75rem;
    border-top: 1px solid var(--rp-line);
    font-size: 0.85rem;
}

.rotation-pivot fieldset {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 1rem;
    margin: 0;
    padding: 0;
    border: 0;
}

.rotation-pivot legend {
    float: left;
    color: var(--rp-muted);
}

.rotation-pivot label {
    display: flex;
    align-items: center;
    gap: 6px;
}

.rotation-pivot output {
    min-width: 2.5em;
    font-variant-numeric: tabular-nums;
}

.rotation-pivot .pivot-readout {
    flex: 1 1 16rem;
    margin: 0;
    color: var(--rp-muted);
    font-variant-numeric: tabular-nums;
}

.rotation-pivot .pivot-readout span:first-child,
.rotation-pivot .pivot-readout span:last-child {
    color: var(--rp-ink);
}

/* On a phone the sliders stack, each as wide as the figure. */
@media (max-width: 640px) {
    .rotation-pivot fieldset,
    .rotation-pivot label {
        flex: 1 1 100%;
    }

    .rotation-pivot fieldset {
        flex-direction: column;
        align-items: stretch;
    }

    .rotation-pivot label input {
        flex: 1;
        min-width: 0;
    }
}
`;
