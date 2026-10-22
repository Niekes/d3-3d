import { drag, interpolateLab, piecewise, pointer, range, select, timer } from 'd3';
import type { Timer } from 'd3';
import { lineStrips3D } from '../../index';
import type { GridPlane, Point3D } from '../../index';
import { endDrags } from './rotatingFigure';
import { sample, surfaceFigure } from './surfaceFigure';
import './terrainSculptor.css';

/*
 * A terrain sculptor: the surface scaffold draws a field of 32 × 32 samples,
 * and a drag on it raises the ground under a soft round brush. The pointer
 * is unprojected onto the plane at the height of the quad under it, so the
 * brush lands on the hill the pointer is over. The drag on the terrain
 * stops before the drag of the figure sees it, so the terrain sculpts and
 * the background turns.
 */

// The field of the scaffold: samples from -16 to 15 along x and z.
const LOW = -16;
const HIGH = 15;
const SIDE = HIGH - LOW + 1;
// Heights stay within the amplitude of the surface plot. The screen y grows
// downwards, so the ground rises towards a negative y.
const LIMIT = 12;
const RING_POINTS = 48;
// One press of Enter sculpts as much as this long a drag in one place.
const KEY_STEP = 250;
const RESET_DURATION = 750;

/** Deep water, shallow water, sand, grass, rock and snow, from the lowest ground up. */
const TERRAIN = piecewise(interpolateLab, [
    '#1d4e89',
    '#4a90c2',
    '#d9c38c',
    '#5f9e4f',
    '#8a7a6a',
    '#f2f2f2'
]);

/** The starting landscape: two hills and a lake, a few units high or deep. */
const HILLS = (x: number, z: number) =>
    -8 * Math.exp(-((x - 6) ** 2 + (z + 5) ** 2) / 40) -
    5 * Math.exp(-((x + 7) ** 2 + (z - 6) ** 2) / 30) +
    6 * Math.exp(-((x + 3) ** 2 + (z + 8) ** 2) / 20);

/** How the arrow keys move the brush, as a step in x and z. */
const MOVES: Record<string, [number, number]> = {
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0]
};

/** Where the brush sits on the field, in world units. */
type Brush = { x: number; z: number };

/** A pointer position in client pixels. */
type ClientPoint = { clientX: number; clientY: number };

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** The index of the sample at x and z: `sample` walks z in the outer loop, x in the inner one. */
const indexOf = (x: number, z: number) => (z - LOW) * SIDE + (x - LOW);

/** The height of the field between the samples, interpolated from the four around it. */
function heightAt(points: Point3D[], x: number, z: number): number {
    const fx = clamp(x, LOW, HIGH);
    const fz = clamp(z, LOW, HIGH);
    const x0 = Math.min(Math.floor(fx), HIGH - 1);
    const z0 = Math.min(Math.floor(fz), HIGH - 1);
    const tx = fx - x0;
    const tz = fz - z0;
    const y = (i: number, j: number) => points[indexOf(i, j)].y;
    return (
        (1 - tz) * ((1 - tx) * y(x0, z0) + tx * y(x0 + 1, z0)) +
        tz * ((1 - tx) * y(x0, z0 + 1) + tx * y(x0 + 1, z0 + 1))
    );
}

/** The point of a mouse or touch event that the pointer helpers and hit tests read. */
function clientOf(event: MouseEvent | TouchEvent): ClientPoint {
    return 'changedTouches' in event ? event.changedTouches[0] : event;
}

/**
 * Mounts the figure into `host` and returns a function that removes it.
 */
export function mountTerrainSculptor(host: HTMLElement): () => void {
    // The state: the samples, the brush, and the pointer while it rests over
    // the figure, so the brush follows the terrain through a glide.
    const start = sample(HILLS);
    const points = start.map((p) => ({ ...p }));
    let brush: Brush | undefined;
    let resting: ClientPoint | undefined;
    let sculpting: Timer | undefined;

    const { group, button, show, surface } = surfaceFigure(
        host,
        'sculpt',
        'A terrain of 32 by 32 samples. Drag the terrain to raise it under the brush and hold Alt to lower it, drag the background to rotate it, or focus it, move the brush with the arrow keys and raise with Enter or lower with Shift and Enter.',
        (height) => TERRAIN(clamp((LIMIT - height) / (2 * LIMIT), 0, 1)),
        () => {
            if (resting) {
                brush = brushAt(resting);
            }
            showBrush();
        }
    );

    host.classList.add('terrain-sculptor');
    host.insertAdjacentHTML(
        'beforeend',
        `<div class="sculpt-controls">
            <label>radius <input name="radius" type="range" min="2" max="8" step="0.5" value="4"><output></output></label>
            <label>strength <input name="strength" type="range" min="2" max="20" step="1" value="8"><output></output></label>
            <fieldset>
                <legend>brush</legend>
                <label><input type="radio" name="sculpt-mode" value="raise" checked> raise</label>
                <label><input type="radio" name="sculpt-mode" value="lower"> lower</label>
            </fieldset>
            <p class="sculpt-readout"><span></span> <span aria-live="polite"></span></p>
        </div>`
    );

    const svg = select(host).select<SVGSVGElement>('svg').attr('tabindex', 0);
    // The ring sits outside the group of the quads, which the scaffold joins
    // as a whole, and above it, so the brush always shows.
    const ring = svg.append('path').attr('class', 'sculpt-ring');
    // The ring shares the view of the surface, so it turns with the terrain.
    const ring3d = lineStrips3D().camera(surface);
    const radius = host.querySelector('[name=radius]') as HTMLInputElement;
    const strength = host.querySelector('[name=strength]') as HTMLInputElement;
    const lower = host.querySelector('[name=sculpt-mode][value=lower]') as HTMLInputElement;
    const [position, status] = Array.from(
        host.querySelectorAll<HTMLElement>('.sculpt-readout span')
    );

    /**
     * The brush under a pointer. The quad under it gives the height, and the
     * pointer is unprojected onto the plane at that height: the plane at
     * y = 0 would put the brush beside a hill, not on it.
     */
    function brushAt(at: ClientPoint): Brush | undefined {
        const hit = document.elementFromPoint(at.clientX, at.clientY);
        if (!hit || !hit.matches('.quad') || !host.contains(hit)) {
            return undefined;
        }
        const quad = select<Element, GridPlane<Point3D>>(hit).datum();
        const height = (quad[0].y + quad[1].y + quad[2].y + quad[3].y) / 4;
        const [x, y] = pointer(at, group.node());
        const point = surface.unproject({ x, y }, { x: 0, y: height, z: 0 }, { x: 0, y: 1, z: 0 });
        const inside =
            point && point.x >= LOW && point.x <= HIGH && point.z >= LOW && point.z <= HIGH;
        return inside ? { x: point.x, z: point.z } : undefined;
    }

    /** Draws the ring of the brush on the terrain and tells where it is. */
    function showBrush(): void {
        if (!brush) {
            ring.attr('d', null);
            position.textContent = '';
            return;
        }
        const { x, z } = brush;
        const r = radius.valueAsNumber;
        const loop = range(RING_POINTS + 1).map((i) => {
            const angle = (2 * Math.PI * i) / RING_POINTS;
            const px = x + r * Math.cos(angle);
            const pz = z + r * Math.sin(angle);
            return { x: px, y: heightAt(points, px, pz), z: pz };
        });
        ring.attr('d', ring3d.draw(ring3d.data([loop])[0]));
        position.textContent = `x ${x.toFixed(2)}, z ${z.toFixed(2)} · height ${(-heightAt(points, x, z)).toFixed(2)}`;
    }

    /**
     * Sculpts for `ms` milliseconds at the brush: every sample within the
     * radius moves by the strength, weighted by a Gaussian of its distance,
     * so the brush raises a soft hill and not a column.
     */
    function sculpt(ms: number, invert: boolean): void {
        if (!brush) {
            return;
        }
        const r = radius.valueAsNumber;
        const sigma = r / 2;
        // Raising lowers y, because the screen y grows downwards.
        const step = ((lower.checked !== invert ? 1 : -1) * strength.valueAsNumber * ms) / 1000;
        for (
            let z = Math.max(LOW, Math.ceil(brush.z - r));
            z <= Math.min(HIGH, brush.z + r);
            z += 1
        ) {
            for (
                let x = Math.max(LOW, Math.ceil(brush.x - r));
                x <= Math.min(HIGH, brush.x + r);
                x += 1
            ) {
                const d2 = (x - brush.x) ** 2 + (z - brush.z) ** 2;
                if (d2 <= r * r) {
                    const p = points[indexOf(x, z)];
                    p.y = clamp(p.y + step * Math.exp(-d2 / (2 * sigma * sigma)), -LIMIT, LIMIT);
                }
            }
        }
        // A zero duration redraws at once; the samples changed in place.
        show(points, 0);
        showBrush();
    }

    /** Tells the height under the brush, for the keyboard. */
    function announce(): void {
        status.textContent = brush
            ? `Brush at x ${brush.x.toFixed(0)}, z ${brush.z.toFixed(0)}: height ${(-heightAt(points, brush.x, brush.z)).toFixed(2)}.`
            : '';
    }

    // The drag on the quads sculpts. d3.drag stops the press from reaching
    // the drag of the figure, so the terrain never turns while it is shaped.
    // A timer sculpts every frame, so a pointer that rests keeps raising.
    group.call(
        drag<SVGGElement, unknown>()
            .on('start', (event) => {
                const invert = event.sourceEvent.altKey;
                let previous = 0;
                resting = undefined;
                brush = brushAt(clientOf(event.sourceEvent));
                sculpting?.stop();
                sculpting = timer((elapsed) => {
                    sculpt(elapsed - previous, invert);
                    previous = elapsed;
                });
            })
            .on('drag', (event) => {
                brush = brushAt(clientOf(event.sourceEvent));
            })
            .on('end', (event) => {
                sculpting?.stop();
                sculpting = undefined;
                resting = clientOf(event.sourceEvent);
                brush = brushAt(resting);
                showBrush();
            })
    );

    // The brush follows a pointer with no button down. A drag of the figure
    // hides it, and the release shows it again for the glide.
    function hover(event: PointerEvent): void {
        if (sculpting) {
            return;
        }
        resting = event.buttons ? undefined : event;
        brush = resting ? brushAt(resting) : undefined;
        showBrush();
    }

    svg.on('pointermove', hover).on('pointerup', hover);

    svg.on('pointerleave', () => {
        if (!sculpting) {
            resting = undefined;
            brush = undefined;
            showBrush();
        }
    });

    // The arrow keys walk the brush from sample to sample; Enter raises,
    // Shift with Enter lowers and the brackets change the radius.
    svg.on('keydown', (event: KeyboardEvent) => {
        const move = MOVES[event.key];
        if (move) {
            event.preventDefault();
            resting = undefined;
            brush = brush
                ? {
                      x: clamp(Math.round(brush.x) + move[0], LOW, HIGH),
                      z: clamp(Math.round(brush.z) + move[1], LOW, HIGH)
                  }
                : { x: 0, z: 0 };
            showBrush();
            announce();
        } else if (event.key === 'Enter' && brush) {
            event.preventDefault();
            sculpt(KEY_STEP, event.shiftKey);
            announce();
        } else if (event.key === '[' || event.key === ']') {
            event.key === '[' ? radius.stepDown() : radius.stepUp();
            radius.dispatchEvent(new Event('input'));
        } else if (event.key === 'Escape') {
            brush = undefined;
            showBrush();
            announce();
        }
    });

    for (const input of [radius, strength]) {
        const output = () => (input.nextElementSibling!.textContent = input.value);
        input.addEventListener('input', () => {
            output();
            showBrush();
        });
        output();
    }

    button.text('reset').on('click', () => {
        start.forEach((p, i) => (points[i].y = p.y));
        show(points, RESET_DURATION);
        showBrush();
        status.textContent = 'Back to the starting hills.';
    });

    show(points);

    return () => {
        endDrags();
        sculpting?.stop();
        host.innerHTML = '';
        host.classList.remove('terrain-sculptor');
    };
}
