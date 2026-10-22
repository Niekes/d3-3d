import { randomNormal, rgb } from 'd3';
import { camera3D, projectPositions } from '../../index';
import { HEIGHT, WIDTH, attribute, canvasFigure, linkProgram, squareAt } from './canvasFigure';
import type { Draw } from './canvasFigure';
import './pointCloud.css';

/*
 * A spiral galaxy of up to a million stars, far too many for an SVG element
 * per point. No star becomes an object: `.matrix()` hands the projection to
 * WebGL as a uniform, or to `projectPositions`, which projects the packed
 * coordinates into one reused buffer for a 2D canvas. Both renderers blend
 * the stars additively, so neither has to sort them by depth.
 */

const SCALE = 230;
const COUNTS = [10_000, 100_000, 1_000_000];
const ARMS = 3;
const TWIST = 5;
/** The camera looks down on the disk from this angle, in radians. */
const TILT = 0.6;
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
uniform float u_pointSize;
uniform vec3 u_palette[${PALETTE.length}];
attribute vec3 a_position;
attribute float a_ring;
varying vec3 v_color;

void main() {
    // The matrix projects to clip space.
    gl_Position = u_matrix * vec4(a_position, 1.0);
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
): Draw {
    const { width, height } = canvas;
    const context = canvas.getContext('2d')!;
    const image = context.createImageData(width, height);
    const pixels = image.data;
    const screen = new Float32Array(positions.length);
    const { r, g, b } = rgb(BACKGROUND);
    // One pixel as one number, little-endian like every browser platform.
    const sky = (255 << 24) | (b << 16) | (g << 8) | r;
    const colors = PALETTE.map((color) => rgb(color));

    return (count, camera) => {
        projectPositions(positions.subarray(0, 3 * count), camera.matrix(), screen);
        new Uint32Array(pixels.buffer).fill(sky);

        const a = alpha(count);
        // Whole numbers: a clamped array rounds every fraction it is handed, slowly.
        const light = Uint8Array.from(
            colors.flatMap((c) => [c.r, c.g, c.b]),
            (v) => v * a
        );

        for (let i = 0; i < count; i += 1) {
            const corner = squareAt(screen, i, dpr, size, width, height);
            if (corner < 0) {
                continue;
            }

            // The pixels clamp at 255, as the additive blending of WebGL does.
            const k = 3 * rings[i];
            for (let dy = 0; dy < size; dy += 1) {
                for (let j = 4 * (corner + dy * width), end = j + 4 * size; j < end; j += 4) {
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
    gl: WebGL2RenderingContext,
    positions: Float32Array<ArrayBuffer>,
    rings: Uint8Array<ArrayBuffer>,
    size: number
): Draw {
    const program = linkProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
    attribute(gl, program, 'a_position', 3, gl.FLOAT)(positions);
    attribute(gl, program, 'a_ring', 1, gl.UNSIGNED_BYTE)(rings);

    const uniform = (name: string) => gl.getUniformLocation(program, name);
    const palette = PALETTE.flatMap((color) => {
        const { r, g, b } = rgb(color);
        return [r / 255, g / 255, b / 255];
    });
    const background = rgb(BACKGROUND);
    const matrixLocation = uniform('u_matrix');
    const alphaLocation = uniform('u_alpha');

    gl.uniform3fv(uniform('u_palette'), palette);
    gl.uniform1f(uniform('u_pointSize'), size);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(background.r / 255, background.g / 255, background.b / 255, 1);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    return (count, camera) => {
        gl.uniformMatrix4fv(matrixLocation, false, camera.matrix({ width: WIDTH, height: HEIGHT }));
        gl.uniform1f(alphaLocation, alpha(count));
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.POINTS, 0, count);
    };
}

/**
 * Renders the galaxy into `host` and returns the function that stops it.
 */
export function mountPointCloud(host: HTMLElement): () => void {
    const { positions, rings } = galaxy(COUNTS[COUNTS.length - 1]);

    return canvasFigure(host, {
        unit: 'stars',
        label: 'A spiral galaxy',
        counts: COUNTS,
        count: COUNTS[1],
        tilt: TILT,
        camera: camera3D()
            .scale(SCALE)
            .origin({ x: WIDTH / 2, y: HEIGHT / 2 }),
        renderers(canvas, gl, dpr) {
            // A star in device pixels, the same square in both renderers.
            const size = Math.max(1, Math.round(POINT_SIZE * dpr));
            return {
                canvas: canvasRenderer(canvas, positions, rings, dpr, size),
                webgl: gl ? webglRenderer(gl, positions, rings, size) : undefined
            };
        }
    });
}
