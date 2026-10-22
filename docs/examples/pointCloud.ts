import { randomNormal, rgb, select, timer } from 'd3';
import { points3D, projectPositions } from '../../index';
import { dragRotate } from './rotatingFigure';
import './pointCloud.css';

/*
 * A spiral galaxy of up to a million stars, far too many for an SVG element
 * per point. No star becomes an object: `.matrix()` hands the projection to
 * WebGL as a uniform, or to `projectPositions`, which projects the packed
 * coordinates into one reused buffer for a 2D canvas. Both renderers blend
 * the stars additively, so neither has to sort them by depth.
 */

const WIDTH = 960;
const HEIGHT = 500;
const SCALE = 230;
const COUNTS = [10_000, 100_000, 1_000_000];
const ARMS = 3;
const TWIST = 5;
/** The disk leans towards the reader by this angle, in radians. */
const TILT = -0.6;
/** The auto-rotation, in radians per millisecond. */
const SPIN = 0.00008;
const POINT_SIZE = 1.5;
const BACKGROUND = '#07090f';
/** From the core outwards: one color per ring of the disk. */
const PALETTE = ['#ffd58a', '#ff9e6d', '#b4a7ff', '#6fa8ff'];

/** A spiral galaxy: packed x, y, z per star, and the ring that colors it. */
function galaxy(n: number): {
    positions: Float32Array<ArrayBuffer>;
    rings: Uint8Array<ArrayBuffer>;
} {
    const positions = new Float32Array(3 * n);
    const rings = new Uint8Array(n);
    const normal = randomNormal();

    // The arms take turns, so the first `count` stars are a galaxy of their own.
    for (let i = 0; i < n; i += 1) {
        const r = Math.random() ** 1.5;
        const angle = (i % ARMS) * ((2 * Math.PI) / ARMS) + r * TWIST;
        const spread = 0.03 + 0.09 * (1 - r);

        positions[3 * i] = r * Math.cos(angle) + normal() * spread;
        positions[3 * i + 1] = normal() * (0.015 + 0.05 * (1 - r));
        positions[3 * i + 2] = r * Math.sin(angle) + normal() * spread;
        rings[i] = Math.min(PALETTE.length - 1, Math.floor(r * PALETTE.length));
    }

    return { positions, rings };
}

/** Fewer stars glow brighter, so every count fills the disk alike. */
function alpha(count: number): number {
    return Math.min(0.8, 40 / Math.sqrt(count));
}

const VERTEX_SHADER = `
uniform mat4 u_matrix;
uniform vec2 u_size;
uniform float u_pointSize;
uniform vec3 u_palette[${PALETTE.length}];
attribute vec3 a_position;
attribute float a_ring;
varying vec3 v_color;

void main() {
    // The matrix projects to CSS pixels, the y axis pointing down.
    vec4 p = u_matrix * vec4(a_position, 1.0);
    gl_Position = vec4(p.x / u_size.x * 2.0 - 1.0, 1.0 - p.y / u_size.y * 2.0, 0.0, 1.0);
    gl_PointSize = u_pointSize;
    v_color = u_palette[int(a_ring)];
}`;

const FRAGMENT_SHADER = `
precision mediump float;
uniform float u_alpha;
varying vec3 v_color;

void main() {
    gl_FragColor = vec4(v_color, u_alpha);
}`;

/**
 * The 2D canvas: projects the stars into `screen` and adds their light
 * straight into the pixels of one `ImageData`. A `fillRect` per star costs
 * about five times as much, which a million stars cannot afford.
 */
function canvasRenderer(
    canvas: HTMLCanvasElement,
    positions: Float32Array,
    rings: Uint8Array,
    dpr: number,
    size: number
): (count: number, matrix: Float32Array) => void {
    const { width, height } = canvas;
    const context = canvas.getContext('2d')!;
    const image = context.createImageData(width, height);
    const pixels = image.data;
    const screen = new Float32Array(positions.length);
    const { r, g, b } = rgb(BACKGROUND);
    // One pixel as one number, little-endian like every browser platform.
    const sky = (255 << 24) | (b << 16) | (g << 8) | r;
    const colors = PALETTE.map((color) => rgb(color));

    return (count, matrix) => {
        projectPositions(positions.subarray(0, 3 * count), matrix, screen);
        new Uint32Array(pixels.buffer).fill(sky);

        const a = alpha(count);
        // Whole numbers: a clamped array rounds every fraction it is handed, slowly.
        const light = Uint8Array.from(
            colors.flatMap((c) => [c.r, c.g, c.b]),
            (v) => v * a
        );

        for (let i = 0; i < count; i += 1) {
            const x = Math.round(screen[3 * i] * dpr - size / 2);
            const y = Math.round(screen[3 * i + 1] * dpr - size / 2);
            if (x < 0 || y < 0 || x + size > width || y + size > height) {
                continue;
            }

            // The pixels clamp at 255, as the additive blending of WebGL does.
            const k = 3 * rings[i];
            for (let dy = 0; dy < size; dy += 1) {
                for (let j = 4 * ((y + dy) * width + x), end = j + 4 * size; j < end; j += 4) {
                    pixels[j] += light[k];
                    pixels[j + 1] += light[k + 1];
                    pixels[j + 2] += light[k + 2];
                }
            }
        }

        context.putImageData(image, 0, 0);
    };
}

/** WebGL: the stars go to the GPU once, every frame only sends the matrix. */
function webglRenderer(
    gl: WebGLRenderingContext,
    positions: Float32Array<ArrayBuffer>,
    rings: Uint8Array<ArrayBuffer>,
    size: number
): (count: number, matrix: Float32Array) => void {
    const program = gl.createProgram()!;
    for (const [type, source] of [
        [gl.VERTEX_SHADER, VERTEX_SHADER],
        [gl.FRAGMENT_SHADER, FRAGMENT_SHADER]
    ] as const) {
        const shader = gl.createShader(type)!;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) ?? 'the point cloud shaders do not link');
    }
    gl.useProgram(program);

    function attribute(name: string, data: BufferSource, size: number, type: number): void {
        const location = gl.getAttribLocation(program, name);
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, size, type, false, 0, 0);
    }
    attribute('a_position', positions, 3, gl.FLOAT);
    attribute('a_ring', rings, 1, gl.UNSIGNED_BYTE);

    const uniform = (name: string) => gl.getUniformLocation(program, name);
    const palette = PALETTE.flatMap((color) => {
        const { r, g, b } = rgb(color);
        return [r / 255, g / 255, b / 255];
    });
    const background = rgb(BACKGROUND);
    const matrixLocation = uniform('u_matrix');
    const alphaLocation = uniform('u_alpha');

    gl.uniform3fv(uniform('u_palette'), palette);
    gl.uniform2f(uniform('u_size'), WIDTH, HEIGHT);
    gl.uniform1f(uniform('u_pointSize'), size);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(background.r / 255, background.g / 255, background.b / 255, 1);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    return (count, matrix) => {
        gl.uniformMatrix4fv(matrixLocation, false, matrix);
        gl.uniform1f(alphaLocation, alpha(count));
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.POINTS, 0, count);
    };
}

/**
 * Renders the galaxy into `host` and returns the function that stops it.
 */
export function mountPointCloud(host: HTMLElement): () => void {
    host.innerHTML = `
        <div class="point-cloud-stage">
            <canvas class="point-cloud-canvas" data-renderer="canvas" role="img"
                aria-label="A spiral galaxy drawn on a 2D canvas"></canvas>
            <canvas class="point-cloud-canvas" data-renderer="webgl" role="img"
                aria-label="A spiral galaxy drawn with WebGL" hidden></canvas>
            <output class="point-cloud-fps"></output>
        </div>
        <form class="point-cloud-controls">
            <label>stars
                <select name="count">${COUNTS.map(
                    (count) => `<option value="${count}">${count.toLocaleString('en')}</option>`
                ).join('')}</select>
            </label>
            <fieldset>
                <legend>renderer</legend>
                <label><input type="radio" name="renderer" value="canvas" checked> canvas 2D</label>
                <label><input type="radio" name="renderer" value="webgl"> WebGL</label>
            </fieldset>
        </form>`;

    const stage = select(host).select<HTMLDivElement>('.point-cloud-stage');
    const canvases = stage.selectAll<HTMLCanvasElement, unknown>('canvas');
    const fps = stage.select('output');
    const form = host.querySelector('form')!;
    const dpr = window.devicePixelRatio || 1;
    // A star in device pixels, the same square in both renderers.
    const size = Math.max(1, Math.round(POINT_SIZE * dpr));

    canvases.attr('width', Math.round(WIDTH * dpr)).attr('height', Math.round(HEIGHT * dpr));

    const { positions, rings } = galaxy(COUNTS[COUNTS.length - 1]);
    const gl = stage
        .select<HTMLCanvasElement>('[data-renderer="webgl"]')
        .node()!
        .getContext('webgl');
    const draw = {
        canvas: canvasRenderer(
            stage.select<HTMLCanvasElement>('[data-renderer="canvas"]').node()!,
            positions,
            rings,
            dpr,
            size
        ),
        webgl: gl ? webglRenderer(gl, positions, rings, size) : undefined
    };

    if (!gl) {
        form.querySelector<HTMLInputElement>('[value="webgl"]')!.disabled = true;
    }

    let count = COUNTS[1];
    let renderer: 'canvas' | 'webgl' = 'canvas';
    form.querySelector('select')!.value = String(count);

    form.addEventListener('change', () => {
        count = Number(new FormData(form).get('count'));
        renderer = new FormData(form).get('renderer') as 'canvas' | 'webgl';
        canvases.property('hidden', function () {
            return this.dataset.renderer !== renderer;
        });
    });

    let yaw = 0;
    let pitch = 0;
    stage.call(
        dragRotate<HTMLDivElement>((y, p) => {
            yaw = y;
            pitch = p;
        })
    );

    const view = points3D()
        .scale(SCALE)
        .origin({ x: WIDTH / 2, y: HEIGHT / 2 });
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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

        // Turn the disk around its own axis first, then lean it.
        const matrix = view
            .rotateY(spin + yaw)
            .rotateX(TILT + pitch)
            .matrix();
        (draw[renderer] ?? draw.canvas)(count, matrix);
    });

    return () => {
        loop.stop();
        gl?.getExtension('WEBGL_lose_context')?.loseContext();
        host.innerHTML = '';
    };
}
