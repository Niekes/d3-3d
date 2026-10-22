import { easeCubicInOut, hsl, rgb } from 'd3';
import type { RGBColor } from 'd3';
import { box, camera3D, normal, projectPositions } from '../../index';
import type { Point3D } from '../../index';
import { HEIGHT, WIDTH, canvasFigure, squareAt } from './canvasFigure';
import type { Draw } from './canvasFigure';
import './pixelSpace.css';

/*
 * The Starry Night as up to 160,000 points, one per pixel, that move between
 * four layouts: the painting on the floor, a relief of its lightness, the RGB
 * cube and the HSL cylinder. No pixel becomes an object or an element: every
 * layout is one packed `Float32Array`, a transition interpolates between two
 * of them, and `projectPositions` hands the result to a 2D canvas. The canvas
 * keeps the depth and the index of the point it shows at every screen pixel,
 * so the nearest point wins without a sort and the pointer finds the pixel
 * under it with one array read.
 */

const SCALE = 200;
const COUNTS = [10_000, 40_000, 160_000];
/** The floor leans towards the reader by this angle, in radians. */
const TILT = -0.6;
const BACKGROUND = '#121417';
const INK = '#e6e8e9';
/** The rise from black to white in the relief. */
const RELIEF = 0.6;
/** The side of the RGB cube. */
const SIDE = 1.4;
/** The height of the HSL cylinder; its radius is 1. */
const CYLINDER = 1.4;
/** The transition from one layout to the next, in milliseconds. */
const DURATION = 1800;
/** The share of the transition by which the last pixel sets off after the first. */
const STAGGER = 0.4;
/** How far a color may lie from the picked one, in an RGB cube of side 1. */
const BRUSH = 0.1;
/** How far the colors outside the brush fade into the background. */
const DIM = 0.8;
/** A press that wanders less than this, in pixels, picks a color. */
const CLICK_DISTANCE = 4;

const LAYOUTS = { image: 'image', relief: 'relief', rgb: 'RGB cube', hsl: 'HSL cylinder' };
type Layout = keyof typeof LAYOUTS;

/** The six faces of the cube as corners of `box`, in the order of `cubes3D`. */
const FACES = [
    [0, 1, 2, 3],
    [7, 6, 5, 4],
    [4, 5, 1, 0],
    [3, 2, 6, 7],
    [4, 0, 3, 7],
    [1, 5, 6, 2]
];
/** The segments of the hue ring around the HSL cylinder. */
const RING = 72;

/** What the controls set. */
interface View {
    layout: Layout;
    /** The turn of every hue, in degrees. */
    hue: number;
    /** The factor on the saturation of every pixel. */
    saturation: number;
    /** The factor on the lightness of every pixel. */
    lightness: number;
    /** The factor on the distance of every lightness from the middle gray. */
    contrast: number;
}

/** The painting on a grid of `w` × `h` pixels, row by row. */
interface Pixels {
    w: number;
    h: number;
    /** The hue, saturation and lightness of every pixel as painted. */
    base: Float32Array;
    /** The same after the sliders. */
    hsls: Float32Array;
    /** The red, green and blue of `hsls`, from 0 to 255. */
    rgbs: Float32Array;
}

/** Resamples the painting to about `count` pixels. */
function pixels(image: HTMLImageElement, count: number): Pixels {
    const w = Math.round(Math.sqrt((count * image.naturalWidth) / image.naturalHeight));
    const h = Math.round(count / w);
    const context = Object.assign(document.createElement('canvas'), { width: w, height: h })
        .getContext('2d')!;
    context.drawImage(image, 0, 0, w, h);
    const { data } = context.getImageData(0, 0, w, h);
    const base = new Float32Array(3 * w * h);

    for (let i = 0; i < w * h; i += 1) {
        const color = hsl(rgb(data[4 * i], data[4 * i + 1], data[4 * i + 2]));
        // Grays have no hue, black and white no saturation either.
        base[3 * i] = color.h || 0;
        base[3 * i + 1] = color.s || 0;
        base[3 * i + 2] = color.l;
    }

    return { w, h, base, hsls: new Float32Array(base), rgbs: new Float32Array(base.length) };
}

/**
 * Turns the hues, scales the saturation and the lightness, and spreads the
 * lightness away from the middle gray, as the sliders say.
 */
function recolor({ base, hsls, rgbs }: Pixels, view: View): void {
    for (let i = 0; i < base.length; i += 3) {
        const lightness = Math.min(1, base[i + 2] * view.lightness);
        hsls[i] = base[i] + view.hue;
        hsls[i + 1] = Math.min(1, base[i + 1] * view.saturation);
        hsls[i + 2] = Math.min(1, Math.max(0, 0.5 + (lightness - 0.5) * view.contrast));
        const { r, g, b } = hsl(hsls[i], hsls[i + 1], hsls[i + 2]).rgb();
        rgbs[i] = r;
        rgbs[i + 1] = g;
        rgbs[i + 2] = b;
    }
}

/** Where every pixel goes in `layout`, packed x, y, z; up is -y. */
function place(layout: Layout, { w, h, hsls, rgbs }: Pixels, out: Float32Array): void {
    const long = Math.max(w, h);

    for (let i = 0, at = 0; i < w * h; i += 1, at += 3) {
        if (layout === 'rgb') {
            out[at] = (rgbs[at] / 255 - 0.5) * SIDE;
            out[at + 1] = (0.5 - rgbs[at + 1] / 255) * SIDE;
            out[at + 2] = (rgbs[at + 2] / 255 - 0.5) * SIDE;
        } else if (layout === 'hsl') {
            const angle = (hsls[at] * Math.PI) / 180;
            out[at] = hsls[at + 1] * Math.cos(angle);
            out[at + 1] = (0.5 - hsls[at + 2]) * CYLINDER;
            out[at + 2] = hsls[at + 1] * Math.sin(angle);
        } else {
            // The painting lies on the floor, its top row at the back.
            const column = i % w;
            out[at] = (2 * column + 1 - w) / long;
            out[at + 1] = layout === 'relief' ? (0.5 - hsls[at + 2]) * RELIEF : 0;
            out[at + 2] = (2 * ((i - column) / w) + 1 - h) / long;
        }
    }
}

/**
 * The color of every pixel as one number of a `Uint32Array` over an
 * `ImageData`, little-endian ABGR. With a picked pixel, the colors away from
 * its color fade into the background. Returns how many stay.
 */
function paint({ rgbs }: Pixels, picked: number, ground: RGBColor, out: Uint32Array): number {
    const reach = (BRUSH * 255) ** 2;
    let close = 0;

    for (let i = 0, at = 0; i < out.length; i += 1, at += 3) {
        let r = rgbs[at];
        let g = rgbs[at + 1];
        let b = rgbs[at + 2];
        // ponytail: a distance in RGB, not as the eye sees it; d3 `lab` would match better.
        const near =
            picked < 0 ||
            (r - rgbs[3 * picked]) ** 2 +
                (g - rgbs[3 * picked + 1]) ** 2 +
                (b - rgbs[3 * picked + 2]) ** 2 <=
                reach;

        if (near) {
            close += 1;
        } else {
            r += (ground.r - r) * DIM;
            g += (ground.g - g) * DIM;
            b += (ground.b - b) * DIM;
        }
        out[i] = (255 << 24) | (Math.round(b) << 16) | (Math.round(g) << 8) | Math.round(r);
    }

    return close;
}

const hex = ({ rgbs }: Pixels, i: number): string =>
    rgb(rgbs[3 * i], rgbs[3 * i + 1], rgbs[3 * i + 2]).formatHex();

const dot = (a: Point3D, b: Point3D): number => a.x * b.x + a.y * b.y + a.z * b.z;

/**
 * Strokes the faces of the cube, projected into `corners`. A face looks at
 * the camera where its normal points along the view direction `v`: the back
 * faces go first, faint and dashed, the front ones over them.
 */
function strokeCube(
    context: CanvasRenderingContext2D,
    corners: Float32Array,
    normals: Point3D[],
    v: Point3D,
    alpha: number
): void {
    context.strokeStyle = INK;
    context.lineWidth = 1;
    for (const front of [false, true]) {
        context.setLineDash(front ? [] : [3, 4]);
        context.globalAlpha = alpha * (front ? 0.7 : 0.3);
        FACES.forEach((face, f) => {
            if (dot(normals[f], v) > 0 !== front) {
                return;
            }
            context.beginPath();
            for (const corner of face) {
                context.lineTo(corners[3 * corner], corners[3 * corner + 1]);
            }
            context.closePath();
            context.stroke();
        });
    }
    context.setLineDash([]);
}

/**
 * Strokes the hue ring of the HSL cylinder, projected into `points`, every
 * segment in its hue. The half of the ring on the side of the viewer is
 * drawn bright, the half behind the cloud faint.
 */
function strokeRing(
    context: CanvasRenderingContext2D,
    ring: Float32Array,
    points: Float32Array,
    v: Point3D,
    alpha: number
): void {
    context.lineWidth = 3;
    for (let j = 0; j < RING; j += 1) {
        const [a, b] = [3 * j, 3 * ((j + 1) % RING)];
        context.globalAlpha = alpha * (ring[a] * v.x + ring[a + 2] * v.z > 0 ? 0.9 : 0.3);
        context.strokeStyle = hsl((360 * j) / RING, 1, 0.55).formatHex();
        context.beginPath();
        context.moveTo(points[a], points[a + 1]);
        context.lineTo(points[b], points[b + 1]);
        context.stroke();
    }
}

/**
 * The 2D canvas: every point is a square of device pixels, written straight
 * into one `ImageData`. A depth buffer keeps the nearest point at every
 * screen pixel and an index buffer says which one it is, so the pointer
 * reads the pixel under it from the frame it sees.
 */
function canvasRenderer(
    canvas: HTMLCanvasElement,
    dpr: number,
    image: HTMLImageElement,
    view: View,
    readout: HTMLOutputElement
): Draw {
    const { width, height } = canvas;
    const context = canvas.getContext('2d')!;
    const frame = context.createImageData(width, height);
    const colors = new Uint32Array(frame.data.buffer);
    const depths = new Float32Array(width * height);
    const ids = new Int32Array(width * height);
    const ground = rgb(BACKGROUND);
    const sky = (255 << 24) | (ground.b << 16) | (ground.g << 8) | ground.r;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // The frame of the RGB cube: its faces never move, so neither do their normals.
    const corners = box({ x: 0, y: SIDE / 2, z: 0, width: SIDE, height: SIDE, depth: SIDE });
    const cube = new Float32Array(corners.flatMap(({ x, y, z }) => [x, y, z]));
    const cubeScreen = new Float32Array(cube.length);
    const normals = FACES.map((face) => normal(face.map((corner) => corners[corner])));
    // The hue ring of the HSL cylinder, at half the lightness and full saturation.
    const ring = new Float32Array(3 * RING);
    for (let j = 0; j < RING; j += 1) {
        ring[3 * j] = Math.cos((2 * Math.PI * j) / RING);
        ring[3 * j + 2] = Math.sin((2 * Math.PI * j) / RING);
    }
    const ringScreen = new Float32Array(ring.length);

    let grid: Pixels | undefined;
    let size = 1;
    let from = new Float32Array(0);
    let current = from;
    let targets = from;
    let shown = from;
    let screen = from;
    let painted = new Uint32Array(0);
    let close = 0;
    let layout = view.layout;
    let previous = layout;
    let start = -Infinity;
    let key = '';
    let tint = '';
    let brush = '';
    let text = '';

    // The screen pixel under the pointer and the pixel of the painting picked by a click.
    let pointer = -1;
    let picked = -1;
    const at = (event: MouseEvent): number => {
        const bounds = canvas.getBoundingClientRect();
        const x = Math.floor(((event.clientX - bounds.left) * width) / bounds.width);
        const y = Math.floor(((event.clientY - bounds.top) * height) / bounds.height);
        return x >= 0 && y >= 0 && x < width && y < height ? y * width + x : -1;
    };
    canvas.addEventListener('pointermove', (event) => {
        pointer = event.buttons ? -1 : at(event);
    });
    canvas.addEventListener('pointerleave', () => {
        pointer = -1;
    });
    // A press that wanders is a drag, not a pick; a click on the background
    // lets go of the color.
    let pressed = { x: 0, y: 0 };
    canvas.addEventListener('pointerdown', (event) => {
        pressed = { x: event.clientX, y: event.clientY };
    });
    canvas.addEventListener('click', (event) => {
        if (Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) > CLICK_DISTANCE) {
            return;
        }
        const p = at(event);
        picked = p < 0 ? -1 : ids[p];
    });

    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    return (count, camera) => {
        // The painting is still on its way.
        if (!image.naturalWidth) {
            return;
        }

        if (key !== String(count)) {
            key = String(count);
            grid = pixels(image, count);
            const n = grid.w * grid.h;
            [from, current, targets, screen] = [0, 0, 0, 0].map(() => new Float32Array(3 * n));
            shown = targets;
            painted = new Uint32Array(n);
            // A pixel of the painting covers its cell on the floor even when the floor is turned.
            size = Math.max(1, Math.ceil((1.42 * 2 * SCALE * dpr) / Math.max(grid.w, grid.h)));
            picked = -1;
            tint = '';
            start = -Infinity;
        }
        const pixelGrid = grid!;

        const sliders = `${key} ${view.hue} ${view.saturation} ${view.lightness} ${view.contrast}`;
        if (tint !== sliders) {
            tint = sliders;
            recolor(pixelGrid, view);
            place(layout, pixelGrid, targets);
        }
        if (layout !== view.layout) {
            from.set(shown);
            previous = layout;
            layout = view.layout;
            start = performance.now();
            place(layout, pixelGrid, targets);
        }
        if (brush !== `${tint} ${picked}`) {
            brush = `${tint} ${picked}`;
            close = paint(pixelGrid, picked, ground, painted);
        }

        // Every pixel sets off a little later than the one before it, row by row.
        const { w, h } = pixelGrid;
        const t = still ? 1 : (performance.now() - start) / DURATION;
        shown = targets;
        if (t < 1) {
            for (let i = 0; i < w * h; i += 1) {
                const column = i % w;
                const delay = ((column / w + (i - column) / w / h) / 2) * STAGGER;
                const e = easeCubicInOut(Math.min(1, Math.max(0, (t - delay) / (1 - STAGGER))));
                for (let k = 3 * i; k < 3 * i + 3; k += 1) {
                    current[k] = from[k] + (targets[k] - from[k]) * e;
                }
            }
            shown = current;
        }

        const matrix = camera.matrix();
        projectPositions(shown, matrix, screen);
        colors.fill(sky);
        depths.fill(-Infinity);
        ids.fill(-1);

        // The rotated z grows towards the viewer: the nearest point keeps the screen pixel.
        for (let i = 0; i < w * h; i += 1) {
            const corner = squareAt(screen, i, dpr, size, width, height);
            if (corner < 0) {
                continue;
            }

            const depth = screen[3 * i + 2];
            for (let dy = 0; dy < size; dy += 1) {
                for (let p = corner + dy * width, end = p + size; p < end; p += 1) {
                    if (depth > depths[p]) {
                        depths[p] = depth;
                        colors[p] = painted[i];
                        ids[p] = i;
                    }
                }
            }
        }
        context.putImageData(frame, 0, 0);

        // The frames of the color spaces fade in and out with their layouts.
        const k = Math.min(1, t);
        const reveal = (name: Layout): number =>
            layout === name ? k : previous === name ? 1 - k : 0;
        const v = camera.viewDirection();
        if (reveal('rgb') > 0) {
            strokeCube(context, projectPositions(cube, matrix, cubeScreen), normals, v, reveal('rgb'));
        }
        if (reveal('hsl') > 0) {
            strokeRing(context, ring, projectPositions(ring, matrix, ringScreen), v, reveal('hsl'));
        }
        context.globalAlpha = 1;

        const hovered = pointer < 0 ? -1 : ids[pointer];
        if (hovered >= 0) {
            context.beginPath();
            context.arc(
                screen[3 * hovered],
                screen[3 * hovered + 1],
                Math.max(5, size / dpr),
                0,
                2 * Math.PI
            );
            context.strokeStyle = INK;
            context.lineWidth = 1.5;
            context.stroke();
        }

        const next = [
            hovered >= 0
                ? `pixel ${hovered % w}, ${Math.floor(hovered / w)} · ${hex(pixelGrid, hovered)}`
                : '',
            picked >= 0
                ? `${close.toLocaleString('en')} pixels near ${hex(pixelGrid, picked)} (${((100 * close) / (w * h)).toFixed(1)}%)`
                : ''
        ]
            .filter(Boolean)
            .join(' — ');
        if (text !== next) {
            text = next;
            readout.value = next;
            canvas.classList.toggle('on-pixel', hovered >= 0);
        }
    };
}

const SLIDERS = [
    { name: 'hue', max: 360, value: 0, unit: '°' },
    { name: 'saturation', max: 200, value: 100, unit: '%' },
    { name: 'lightness', max: 200, value: 100, unit: '%' },
    { name: 'contrast', max: 200, value: 100, unit: '%' }
];

/**
 * Renders the painting into `host` and returns the function that stops it.
 */
export function mountPixelSpace(host: HTMLElement): () => void {
    const image = new Image();
    image.src = new URL('./starry-night.jpg', import.meta.url).href;
    const view: View = { layout: 'image', hue: 0, saturation: 1, lightness: 1, contrast: 1 };
    const readout = document.createElement('output');
    readout.className = 'pixel-space-readout';

    const dispose = canvasFigure(host, {
        unit: 'pixels',
        label: 'The Starry Night by Vincent van Gogh, one point per pixel',
        counts: COUNTS,
        count: COUNTS[1],
        tilt: TILT,
        camera: camera3D()
            .scale(SCALE)
            .origin({ x: WIDTH / 2, y: HEIGHT / 2 }),
        spin: false,
        orbitOnSpace: true,
        renderers: (canvas, _gl, dpr) => ({
            canvas: canvasRenderer(canvas, dpr, image, view, readout)
        })
    });

    host.querySelector('.canvas-figure-stage')!.append(readout);
    const form = host.querySelector('form')!;
    form.insertAdjacentHTML(
        'beforeend',
        `<fieldset>
            <legend>layout</legend>
            ${Object.entries(LAYOUTS)
                .map(
                    ([value, text]) =>
                        `<label><input type="radio" name="layout" value="${value}"${
                            value === view.layout ? ' checked' : ''
                        }> ${text}</label>`
                )
                .join('')}
        </fieldset>
        ${SLIDERS.map(
            ({ name, max, value, unit }) =>
                `<label>${name} <input type="range" name="${name}" min="0" max="${max}"
                    value="${value}" data-unit="${unit}"><span>${value}${unit}</span></label>`
        ).join('')}`
    );

    form.addEventListener('input', () => {
        const data = new FormData(form);
        view.layout = data.get('layout') as Layout;
        view.hue = Number(data.get('hue'));
        view.saturation = Number(data.get('saturation')) / 100;
        view.lightness = Number(data.get('lightness')) / 100;
        view.contrast = Number(data.get('contrast')) / 100;
        form.querySelectorAll<HTMLInputElement>('input[type="range"]').forEach((input) => {
            input.nextElementSibling!.textContent = `${input.value}${input.dataset.unit}`;
        });
    });

    return dispose;
}
