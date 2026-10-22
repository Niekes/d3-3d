import { easeCubicInOut, randomLcg, range, shuffler, timer } from 'd3';
import type { Timer } from 'd3';
import { points3D, sort } from '../../index';
import type { Point, Point3D } from '../../index';
import { rotatingFigure, turnCamera } from './rotatingFigure';

/*
 * A particle text morph: 1500 particles drawn with points3D form a word and
 * fly into another word or a shape. A hidden canvas draws the text, and its
 * opaque pixels become points in the model. A morph interpolates the
 * positions in model space, and every frame projects them again, so a drag
 * during a flight turns the particles with the scene. The circles are joined
 * by the index of their particle: no particle ever enters or exits. The
 * styles ship with the module: the figure adds them to its host.
 */

const ORIGIN = { x: 480, y: 250 };
const SCALE = 220;
const COUNT = 1500;
/** A little turned at the start, so the words show their depth. */
const START = { yaw: -0.3, tilt: 0.2 };
/** The flight from one shape to the next, in milliseconds. */
const DURATION = 1400;
/** The share of the flight by which the rightmost particle sets off after the leftmost. */
const STAGGER = 0.3;
const MAX_LENGTH = 12;
const DOT = 2.2;
const TAU = Math.PI * 2;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

// The sampler: a canvas of 320 × 100 px on x from -1.6 to 1.6 and y from
// -0.5 to 0.5, so a pixel is 0.01 wide in the model. The canvas y grows
// downwards like the screen y, so the text stands upright.
const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 100;
const PIXEL = 0.01;
const MARGIN = 8;
const FONT_SIZE = 90;
const MIN_FONT_SIZE = 10;
/** Half the depth of a word: a turn shows a slab, not a sheet. */
const DEPTH = 0.06;
const SEED = 7;

const PRESETS = ['d3-3d', 'hello', 'sphere', 'torus', 'helix'];

/** A particle: its place in the model and its place on the color ramp, from 0 to 1. */
type Particle = Point3D & { id: number; tone: number };

/** A Fibonacci sphere: a spiral from pole to pole that turns by the golden angle. */
const SPHERE: Point3D[] = range(COUNT).map((i) => {
    const y = 1 - (2 * (i + 0.5)) / COUNT;
    const ring = Math.sqrt(1 - y * y);
    const angle = i * GOLDEN_ANGLE;
    return { x: 0.8 * ring * Math.cos(angle), y: 0.8 * y, z: 0.8 * ring * Math.sin(angle) };
});

/** A torus that faces the viewer: once around the hole, by the golden angle around the tube. */
const TORUS: Point3D[] = range(COUNT).map((i) => {
    const around = (i / COUNT) * TAU;
    const tube = i * GOLDEN_ANGLE;
    const ring = 0.7 + 0.25 * Math.cos(tube);
    return { x: ring * Math.cos(around), y: ring * Math.sin(around), z: 0.25 * Math.sin(tube) };
});

/** A helix of two turns along x, a band 0.15 wide. */
const HELIX: Point3D[] = range(COUNT).map((i) => {
    const angle = (i / COUNT) * 2 * TAU;
    const across = ((i * GOLDEN_ANGLE) / TAU) % 1;
    return {
        x: -1.4 + (2.8 * i) / COUNT + 0.15 * (across - 0.5),
        y: 0.45 * Math.cos(angle),
        z: 0.45 * Math.sin(angle)
    };
});

const SHAPES: Record<string, Point3D[]> = { sphere: SPHERE, torus: TORUS, helix: HELIX };

const font = (size: number) => `bold ${size}px system-ui, sans-serif`;

const fits = (box: TextMetrics) =>
    box.width <= CANVAS_WIDTH - 2 * MARGIN &&
    box.actualBoundingBoxAscent + box.actualBoundingBoxDescent <= CANVAS_HEIGHT - 2 * MARGIN;

/**
 * Picks 1500 of the opaque pixels by a seeded shuffle, so the same text
 * always gives the same particles. A text with fewer pixels repeats them,
 * each repeat jittered within its pixel, and every particle gets a depth
 * within the slab.
 */
function pick(pixels: Point3D[]): Point3D[] {
    const random = randomLcg(SEED);
    shuffler(random)(pixels);
    return range(COUNT).map((i) => {
        const pixel = pixels[i % pixels.length];
        const jitter = i < pixels.length ? 0 : PIXEL;
        return {
            x: pixel.x + (random() - 0.5) * jitter,
            y: pixel.y + (random() - 0.5) * jitter,
            z: (random() * 2 - 1) * DEPTH
        };
    });
}

/**
 * Draws `text` centered on the canvas, in a bold font that shrinks until the
 * text fits, and turns every pixel with an alpha above 127 into a point of
 * the model. Returns nothing when no pixel is opaque.
 */
function sampleText(context: CanvasRenderingContext2D, text: string): Point3D[] | undefined {
    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    let size = FONT_SIZE;
    context.font = font(size);
    while (!fits(context.measureText(text)) && size > MIN_FONT_SIZE) {
        size -= 2;
        context.font = font(size);
    }

    // The ink, not the baseline, sits in the middle of the canvas.
    const box = context.measureText(text);
    context.textAlign = 'center';
    context.fillText(
        text,
        CANVAS_WIDTH / 2,
        (CANVAS_HEIGHT + box.actualBoundingBoxAscent - box.actualBoundingBoxDescent) / 2
    );

    const { data } = context.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const pixels: Point3D[] = [];
    for (let i = 0; i < CANVAS_WIDTH * CANVAS_HEIGHT; i += 1) {
        if (data[4 * i + 3] > 127) {
            const column = i % CANVAS_WIDTH;
            const row = (i - column) / CANVAS_WIDTH;
            pixels.push({ x: (column + 0.5) * PIXEL - 1.6, y: (row + 0.5) * PIXEL - 0.5, z: 0 });
        }
    }
    return pixels.length ? pick(pixels) : undefined;
}

/**
 * The target of every particle: the point of `target` with the same rank in
 * x, so a particle flies to the same part of the new shape. The ids stay, so
 * only the targets move. The tone is the x of the target, from 0 at the left
 * to 1 at the right.
 * ponytail: the ranks in x ignore y and z, so paths cross where two shapes
 * differ in height or depth; an assignment by nearest neighbor untangles them.
 */
function pair(particles: Particle[], target: Point3D[]): Particle[] {
    const ranked = [...target].sort((a, b) => a.x - b.x);
    const left = ranked[0].x;
    const width = ranked[COUNT - 1].x - left || 1;
    const goals: Particle[] = [];
    range(COUNT)
        .sort((a, b) => particles[a].x - particles[b].x)
        .forEach((id, rank) => {
            const { x, y, z } = ranked[rank];
            goals[id] = { id, x, y, z, tone: (x - left) / width };
        });
    return goals;
}

/**
 * Mounts the figure into `host` and returns a function that removes it.
 */
export function mountParticleTextMorph(host: HTMLElement): () => void {
    // The state: every input writes it, and `render` reads it. The particles
    // start in the middle and fly into the first preset.
    let particles: Particle[] = range(COUNT).map((id) => ({ id, x: 0, y: 0, z: 0, tone: 0.5 }));
    let flight: Timer | undefined;
    let preset = 0;
    let yaw = 0;
    let pitch = 0;

    // One renderer is a camera of its own.
    const dots = points3D<Particle>().scale(SCALE).origin(ORIGIN);

    const { group, button } = rotatingFigure(
        host,
        'morph',
        'Particles that form a word or a shape and fly into the next one. Drag the figure to rotate it.',
        (dragYaw, dragPitch) => {
            yaw = dragYaw;
            pitch = dragPitch;
            // A flight draws the next frame with the new turn anyway.
            if (!flight) {
                render();
            }
        }
    );

    host.classList.add('particle-morph');
    host.insertAdjacentHTML(
        'beforeend',
        `<style>${STYLES}</style>
        <div class="morph-controls">
            <div class="morph-presets">${PRESETS.map((name) => `<button type="button" aria-pressed="false">${name}</button>`).join('')}</div>
            <form class="morph-form">
                <label>your text <input name="text" type="text" maxlength="${MAX_LENGTH}" autocomplete="off" spellcheck="false"></label>
                <button type="submit">morph</button>
            </form>
            <p class="morph-status" aria-live="polite"></p>
        </div>`
    );

    const svg = host.querySelector('svg')!;
    const presetButtons = Array.from(
        host.querySelectorAll<HTMLButtonElement>('.morph-presets button')
    );
    const form = host.querySelector('form')!;
    const field = form.elements.namedItem('text') as HTMLInputElement;
    const status = host.querySelector<HTMLElement>('.morph-status')!;

    // The sampler is never on the page, and the figure reads it back on
    // every text.
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const context = canvas.getContext('2d', { willReadFrequently: true })!;

    /** Turns the scene and draws one circle per particle, back to front. */
    function render(): void {
        turnCamera(dots, yaw, pitch, START);
        group
            .selectAll<SVGCircleElement, Point<Particle>>('circle')
            .data(dots.data(particles), (d) => d.id)
            .join((enter) => enter.append('circle').attr('r', DOT))
            .attr('cx', (d) => d.projected.x)
            .attr('cy', (d) => d.projected.y)
            .style(
                'fill',
                (d) =>
                    `color-mix(in oklab, var(--pm-end) ${Math.round(d.tone * 100)}%, var(--pm-start))`
            )
            .sort(sort);
    }

    /**
     * Flies the particles into `target`. The flight starts where the
     * particles are, so a morph during another one goes on without a jump.
     * Each particle sets off later the further right its target lies.
     */
    function morph(target: Point3D[]): void {
        flight?.stop();
        flight = undefined;
        // A frame makes new particles, so `from` keeps the old ones.
        const from = particles;
        const to = pair(particles, target);

        function frame(t: number): void {
            particles = to.map((goal, i) => {
                const start = from[i];
                const k = Math.min(1, Math.max(0, (t - goal.tone * STAGGER) / (1 - STAGGER)));
                const e = easeCubicInOut(k);
                return {
                    id: goal.id,
                    x: start.x + (goal.x - start.x) * e,
                    y: start.y + (goal.y - start.y) * e,
                    z: start.z + (goal.z - start.z) * e,
                    tone: start.tone + (goal.tone - start.tone) * e
                };
            });
            render();
        }

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            frame(1);
            return;
        }
        flight = timer((elapsed) => {
            // A figure that was taken off the page stops flying.
            if (!svg.isConnected) {
                flight?.stop();
                return;
            }
            frame(Math.min(1, elapsed / DURATION));
            if (elapsed >= DURATION) {
                flight?.stop();
                flight = undefined;
            }
        });
    }

    /** Presses the button of the preset `index`, or none for -1. */
    const press = (index: number) =>
        presetButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(i === index)));

    /** Morphs into the preset `index`. */
    function show(index: number): void {
        preset = index;
        const name = PRESETS[index];
        morph(SHAPES[name] ?? sampleText(context, name)!);
        press(index);
        status.textContent = SHAPES[name]
            ? `Morphing into the ${name}.`
            : `Morphing into “${name}”.`;
    }

    presetButtons.forEach((b, i) => b.addEventListener('click', () => show(i)));

    // The field is where the page takes text from outside: it is capped
    // here as well as by the field, drawn on the canvas and shown with
    // textContent, so it never becomes markup.
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const text = Array.from(field.value.trim()).slice(0, MAX_LENGTH).join('');
        const target = text ? sampleText(context, text) : undefined;
        if (!text) {
            status.textContent = 'Type at least one character.';
        } else if (!target) {
            status.textContent = 'Nothing to draw for that text.';
        } else {
            morph(target);
            press(-1);
            status.textContent = `Morphing into “${text}”.`;
        }
        field.focus();
    });

    button.text('next').on('click', () => show((preset + 1) % PRESETS.length));

    show(0);

    return () => {
        flight?.stop();
        host.innerHTML = '';
        host.classList.remove('particle-morph');
    };
}

// The styles of the figure, scoped by the class of its host. VitePress puts
// the class `dark` on the root element in dark mode. The particles mix their
// fill between the two ends of the ramp.
const STYLES = `
.particle-morph {
    --pm-ink: #1b1e21;
    --pm-muted: #5f6468;
    --pm-button: #f0f1f1;
    --pm-line: #c4c7c9;
    --pm-bg: #ffffff;
    --pm-start: #3b2c9e;
    --pm-end: #0f9b8e;
    margin: 1.5rem 0;
    position: relative;
    overflow: hidden;
    border: 1px solid var(--pm-line);
    border-radius: 12px;
    background: var(--pm-bg);
    color: var(--pm-ink);
}

.dark .particle-morph {
    --pm-ink: #e6e8e9;
    --pm-muted: #9aa0a4;
    --pm-button: #17181a;
    --pm-line: #3d4144;
    --pm-bg: #0c0d0e;
    --pm-start: #a08cff;
    --pm-end: #5ce0c6;
}

.particle-morph .morph-svg {
    display: block;
    width: 100%;
    height: auto;
    cursor: grab;
    touch-action: none;
}

.particle-morph .morph-svg:active {
    cursor: grabbing;
}

.particle-morph button {
    padding: 0.35rem 0.9rem;
    border: 1px solid var(--pm-line);
    border-radius: 8px;
    background: var(--pm-button);
    color: var(--pm-ink);
    font-size: 0.85rem;
    cursor: pointer;
}

.particle-morph button:hover,
.particle-morph button[aria-pressed='true'] {
    border-color: var(--pm-ink);
}

.particle-morph .morph-button {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
}

.particle-morph .morph-controls,
.particle-morph .morph-presets,
.particle-morph .morph-form,
.particle-morph label {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
}

.particle-morph .morph-controls {
    column-gap: 1.5rem;
    padding: 0.75rem;
    border-top: 1px solid var(--pm-line);
    font-size: 0.85rem;
}

.particle-morph input {
    width: 9rem;
    padding: 0.3rem 0.5rem;
    border: 1px solid var(--pm-line);
    border-radius: 6px;
    background: var(--pm-bg);
    color: var(--pm-ink);
    font: inherit;
}

.particle-morph .morph-status {
    flex-basis: 100%;
    min-height: 1.5em;
    margin: 0;
    color: var(--pm-muted);
}
`;
