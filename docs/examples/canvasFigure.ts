import { select, timer } from 'd3';
import type { Camera3DInstance } from '../../index';
import { dragRotate, turnCamera } from './rotatingFigure';
import './canvasFigure.css';

/*
 * The scaffold the canvas figures share: a 2D canvas and a WebGL canvas on
 * one stage, a picker for the size of the data, a toggle between the two
 * renderers and a frame counter. One loop turns the figure on drag and on
 * its own and hands the camera to the renderer that is shown.
 */

export const WIDTH = 960;
export const HEIGHT = 500;
/** The auto-rotation, in radians per millisecond. */
const SPIN = 0.00008;

/** Draws `count` items of the figure as `camera` sees them. */
export type Draw = (count: number, camera: Camera3DInstance) => void;

export interface CanvasFigure {
    /** What the picker counts, such as "stars". */
    unit: string;
    /** What the figure shows, for the accessible names of the canvases. */
    label: string;
    counts: number[];
    count: number;
    /** The angle above the figure the camera looks down from, in radians. */
    tilt: number;
    /** The camera that holds the scale and the origin of the figure. */
    camera: Camera3DInstance;
    /** False keeps the figure still until it is dragged. */
    spin?: boolean;
    /**
     * Turns the figure only while Space is held over it, so a plain drag
     * leaves the pointer to the figure. A touch drag turns it as ever.
     */
    orbitOnSpace?: boolean;
    /** Builds the renderers once the canvases are sized for `dpr`. */
    renderers(
        canvas: HTMLCanvasElement,
        gl: WebGL2RenderingContext | null,
        dpr: number
    ): { canvas: Draw; webgl?: Draw };
}

/**
 * Renders the figure into `host` and returns the function that stops it.
 */
export function canvasFigure(host: HTMLElement, figure: CanvasFigure): () => void {
    host.classList.add('canvas-figure');
    host.innerHTML = `
        <div class="canvas-figure-stage">
            <canvas data-renderer="canvas" role="img"
                aria-label="${figure.label} drawn on a 2D canvas"></canvas>
            <canvas data-renderer="webgl" role="img"
                aria-label="${figure.label} drawn with WebGL" hidden></canvas>
            <output class="canvas-figure-fps"></output>
        </div>
        <form class="canvas-figure-controls">
            <label>${figure.unit}
                <select name="count">${figure.counts
                    .map(
                        (count) => `<option value="${count}">${count.toLocaleString('en')}</option>`
                    )
                    .join('')}</select>
            </label>
            <fieldset>
                <legend>renderer</legend>
                <label><input type="radio" name="renderer" value="canvas" checked> canvas 2D</label>
                <label><input type="radio" name="renderer" value="webgl"> WebGL</label>
            </fieldset>
            ${figure.orbitOnSpace ? '<p class="canvas-figure-hint"><kbd>Space</kbd> + drag to orbit</p>' : ''}
        </form>`;

    const stage = select(host).select<HTMLDivElement>('.canvas-figure-stage');
    const canvases = stage.selectAll<HTMLCanvasElement, unknown>('canvas');
    const fps = stage.select('output');
    const form = host.querySelector('form')!;
    const dpr = window.devicePixelRatio || 1;

    canvases.attr('width', Math.round(WIDTH * dpr)).attr('height', Math.round(HEIGHT * dpr));

    const gl = canvases.filter('[data-renderer="webgl"]').node()!.getContext('webgl2');
    const draw = figure.renderers(canvases.filter('[data-renderer="canvas"]').node()!, gl, dpr);

    // A figure for the 2D canvas alone has nothing to toggle.
    if (!draw.webgl) {
        form.querySelector('fieldset')!.hidden = true;
    }

    let count = figure.count;
    let renderer: 'canvas' | 'webgl' = 'canvas';
    form.querySelector('select')!.value = String(count);

    form.addEventListener('change', () => {
        const data = new FormData(form);
        count = Number(data.get('count'));
        renderer = data.get('renderer') as 'canvas' | 'webgl';
        canvases.property('hidden', function () {
            return this.dataset.renderer !== renderer;
        });
    });

    let yaw = 0;
    let pitch = 0;
    const rotate = dragRotate<HTMLDivElement>((y, p) => {
        yaw = y;
        pitch = p;
    });

    // Space over the figure turns the next drag into an orbit; anywhere
    // else, and in a text field, it scrolls and types as ever.
    const hold = (event: KeyboardEvent): void => {
        if (event.code !== 'Space') {
            return;
        }
        if (event.type === 'keydown') {
            if (!stage.node()!.matches(':hover') || typing(event.target)) {
                return;
            }
            event.preventDefault();
        }
        host.classList.toggle('orbiting', event.type === 'keydown');
    };
    const release = (): void => {
        host.classList.remove('orbiting');
    };

    if (figure.orbitOnSpace) {
        const pressed = rotate.filter();
        rotate.filter(function (event, d) {
            return (
                (host.classList.contains('orbiting') || event.type === 'touchstart') &&
                pressed.call(this, event, d)
            );
        });
        host.classList.add('space-to-orbit');
        window.addEventListener('keydown', hold);
        window.addEventListener('keyup', hold);
        window.addEventListener('blur', release);
    }
    stage.call(rotate);

    const still =
        figure.spin === false || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let spin = 0;
    let previous = 0;
    let frames = 0;
    let since = 0;

    const loop = timer((elapsed) => {
        spin += still ? 0 : (elapsed - previous) * SPIN;
        previous = elapsed;

        frames += 1;
        if (elapsed - since >= 500) {
            fps.text(`${Math.round((frames * 1000) / (elapsed - since))} fps`);
            frames = 0;
            since = elapsed;
        }

        turnCamera(figure.camera, spin + yaw, pitch, { tilt: figure.tilt });
        (draw[renderer] ?? draw.canvas)(count, figure.camera);
    });

    return () => {
        loop.stop();
        gl?.getExtension('WEBGL_lose_context')?.loseContext();
        window.removeEventListener('keydown', hold);
        window.removeEventListener('keyup', hold);
        window.removeEventListener('blur', release);
        host.classList.remove('canvas-figure', 'space-to-orbit', 'orbiting');
        host.innerHTML = '';
    };
}

/** Whether a Space typed into `target` belongs to the text there. */
function typing(target: EventTarget | null): boolean {
    return (
        target instanceof HTMLElement &&
        target.matches(
            'textarea, [contenteditable], input:not([type="radio"], [type="checkbox"], [type="range"])'
        )
    );
}

/**
 * The device pixel at the top left of the square of `size` device pixels
 * that point `i` of the projected `screen` covers, on a canvas of `width` ×
 * `height` device pixels; -1 where the square leaves the canvas.
 */
export function squareAt(
    screen: Float32Array,
    i: number,
    dpr: number,
    size: number,
    width: number,
    height: number
): number {
    const x = Math.round(screen[3 * i] * dpr - size / 2);
    const y = Math.round(screen[3 * i + 1] * dpr - size / 2);
    return x < 0 || y < 0 || x + size > width || y + size > height ? -1 : y * width + x;
}

/** Compiles the two shaders, links them and makes the program current. */
export function linkProgram(
    gl: WebGL2RenderingContext,
    vertexShader: string,
    fragmentShader: string
): WebGLProgram {
    const program = gl.createProgram();
    for (const [type, source] of [
        [gl.VERTEX_SHADER, vertexShader],
        [gl.FRAGMENT_SHADER, fragmentShader]
    ] as const) {
        const shader = gl.createShader(type)!;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) ?? 'the shaders do not link');
    }
    gl.useProgram(program);
    return program;
}

/**
 * Gives the attribute `name` a buffer of its own and returns the function
 * that fills it. A `divisor` of 1 steps the attribute once per instance.
 */
export function attribute(
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
    name: string,
    size: number,
    type: number,
    { normalized = false, divisor = 0 }: { normalized?: boolean; divisor?: number } = {}
): (data: BufferSource) => void {
    const location = gl.getAttribLocation(program, name);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, type, normalized, 0, 0);
    gl.vertexAttribDivisor(location, divisor);

    return (data) => {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    };
}
