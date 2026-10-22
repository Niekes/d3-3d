import { interpolateRgbBasis, rgb } from 'd3';
import { camera3D, projectPositions } from '../../index';
import { HEIGHT, WIDTH, attribute, canvasFigure, linkProgram } from './canvasFigure';
import type { Draw } from './canvasFigure';

/*
 * A landscape of up to forty thousand bars: a 3D bar chart of a height map,
 * far too many for an SVG path per face. `.matrix()` projects it for both
 * renderers. WebGL draws every bar as one instance of a unit box, and its
 * depth buffer decides what is in front. A 2D canvas projects the corners
 * with `projectPositions`, walks the grid from the back to the front and
 * paints the three faces of each bar that can face the camera.
 */

const SCALE = 260;
const COUNTS = [2_500, 10_000, 40_000];
/** The camera looks down on the field from this angle, in radians. */
const TILT = 0.6;
/** The share of a cell that is left free between two bars. */
const GAP = 0.2;

/**
 * The faces of a bar, one per axis, as the corners of the face on the low
 * side. A corner is three bits, 1 for +x, 2 for the top and 4 for +z; the
 * face on the high side adds the bit of its axis.
 */
const FACES = [
    [0, 2, 6, 4],
    [0, 1, 5, 4],
    [0, 1, 3, 2]
];
const AXIS_BITS = [1, 2, 4];
/** The light on the faces along x, y and z: the tops and bottoms are the brightest. */
const SHADES = [0.8, 1, 0.64];

/** One blue for the height: towards the page color for the low bars. */
const RAMPS = {
    light: interpolateRgbBasis(['#cde2fb', '#86b6ef', '#3987e5', '#1c5cab', '#0d366b']),
    dark: interpolateRgbBasis(['#184f95', '#2a78d6', '#5598e7', '#86b6ef', '#cde2fb'])
};

const theme = (): keyof typeof RAMPS =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light';

/** What the bars on the GPU and the colors on the canvas were made for. */
const version = (count: number): string => `${count} ${theme()}`;

/** A square grid of bars over the floor from -1 to 1. */
interface Field {
    /** The bars along a side. */
    n: number;
    /** The side of the footprint of a bar. */
    width: number;
    /** The x, z and height of every bar, row by row along z. */
    bars: Float32Array<ArrayBuffer>;
    /** The eight corners of every bar, packed x, y, z. */
    corners: Float32Array<ArrayBuffer>;
}

/** The height of the land at x, z: three hills on a gentle swell. */
function landscape(x: number, z: number): number {
    const hill = (cx: number, cz: number, r: number, h: number): number =>
        h * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

    return (
        0.03 +
        0.025 * (1 + Math.sin(7 * x) * Math.cos(6 * z)) +
        hill(-0.35, -0.3, 0.4, 0.55) +
        hill(0.45, 0.35, 0.3, 0.4) +
        hill(0.4, -0.55, 0.2, 0.3)
    );
}

function field(count: number): Field {
    const n = Math.round(Math.sqrt(count));
    const cell = 2 / n;
    const width = cell * (1 - GAP);
    const bars = new Float32Array(3 * n * n);
    const corners = new Float32Array(24 * n * n);

    for (let bar = 0; bar < n * n; bar += 1) {
        const x = -1 + cell * ((bar % n) + 0.5);
        const z = -1 + cell * (Math.floor(bar / n) + 0.5);
        const h = landscape(x, z);

        bars[3 * bar] = x;
        bars[3 * bar + 1] = z;
        bars[3 * bar + 2] = h;
        for (let corner = 0; corner < 8; corner += 1) {
            const at = 24 * bar + 3 * corner;
            corners[at] = x + ((corner & 1) - 0.5) * width;
            // Up is -y, as on the screen.
            corners[at + 1] = corner & 2 ? -h : 0;
            corners[at + 2] = z + ((corner >> 2) - 0.5) * width;
        }
    }

    return { n, width, bars, corners };
}

/** The color of every bar by its height, r, g and b. */
function colors(field: Field): Uint8Array<ArrayBuffer> {
    const ramp = RAMPS[theme()];
    const out = new Uint8Array(field.bars.length);
    let highest = 0;
    for (let bar = 0; bar < field.n * field.n; bar += 1) {
        highest = Math.max(highest, field.bars[3 * bar + 2]);
    }

    for (let bar = 0; bar < field.n * field.n; bar += 1) {
        const { r, g, b } = rgb(ramp(field.bars[3 * bar + 2] / highest));
        out.set([r, g, b], 3 * bar);
    }
    return out;
}

/**
 * The 2D canvas: no sort. On a grid the painter's order is the loop order,
 * from the far end of x and of z to the near one, which the view direction
 * of the camera tells.
 */
function canvasRenderer(canvas: HTMLCanvasElement, fields: Map<number, Field>, dpr: number): Draw {
    const context = canvas.getContext('2d')!;
    let key = '';
    let screen = new Float32Array(0);
    let styles: string[] = [];

    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    return (count, camera) => {
        const field = fields.get(count)!;
        if (key !== version(count)) {
            key = version(count);
            screen = new Float32Array(field.corners.length);
            const rgbs = colors(field);
            styles = Array.from({ length: field.bars.length }, (_, k) => {
                const at = 3 * Math.floor(k / 3);
                const shade = SHADES[k % 3];
                return `rgb(${rgbs[at] * shade} ${rgbs[at + 1] * shade} ${rgbs[at + 2] * shade})`;
            });
        }

        projectPositions(field.corners, camera.matrix(), screen);
        context.clearRect(0, 0, WIDTH, HEIGHT);

        // The view direction points towards the viewer: it tells which end
        // of every axis is near. The top is the high end of y, which points
        // to -y.
        const { n } = field;
        const v = camera.viewDirection();
        const near = [v.x > 0, v.y < 0, v.z > 0];
        const faces = FACES.map((quad, axis) =>
            quad.map((corner) => corner + (near[axis] ? AXIS_BITS[axis] : 0))
        );
        const [i0, di] = near[0] ? [0, 1] : [n - 1, -1];
        const [k0, dk] = near[2] ? [0, 1] : [n - 1, -1];

        for (let row = 0, k = k0; row < n; row += 1, k += dk) {
            for (let column = 0, i = i0; column < n; column += 1, i += di) {
                const bar = k * n + i;
                // The three faces of a box never overlap each other.
                for (let axis = 0; axis < 3; axis += 1) {
                    context.beginPath();
                    for (const corner of faces[axis]) {
                        const at = 24 * bar + 3 * corner;
                        context.lineTo(screen[at], screen[at + 1]);
                    }
                    context.fillStyle = styles[3 * bar + axis];
                    context.fill();
                }
            }
        }
    };
}

const VERTEX_SHADER = `#version 300 es
uniform mat4 u_matrix;
uniform float u_width;
in vec4 a_corner;
// The x, z and height of the bar.
in vec3 a_bar;
in vec3 a_color;
out vec3 v_color;

void main() {
    // The unit bar, stretched to the footprint and the height; up is -y.
    vec3 world = vec3(
        a_bar.x + a_corner.x * u_width,
        -a_corner.y * a_bar.z,
        a_bar.y + a_corner.z * u_width
    );
    gl_Position = u_matrix * vec4(world, 1.0);
    v_color = a_color * a_corner.w;
}`;

const FRAGMENT_SHADER = `#version 300 es
precision mediump float;
in vec3 v_color;
out vec4 color;

void main() {
    color = vec4(v_color, 1.0);
}`;

/**
 * A unit bar as twelve triangles, x and z from -0.5 to 0.5 and y from 0 to
 * 1, every corner with the shade of its face.
 */
function unitBar(): Float32Array<ArrayBuffer> {
    const vertices: number[] = [];
    FACES.forEach((quad, axis) => {
        for (const side of [0, AXIS_BITS[axis]]) {
            for (const k of [0, 1, 2, 0, 2, 3]) {
                const corner = quad[k] + side;
                vertices.push(
                    (corner & 1) - 0.5,
                    (corner >> 1) & 1,
                    (corner >> 2) - 0.5,
                    SHADES[axis]
                );
            }
        }
    });
    return new Float32Array(vertices);
}

/** WebGL: one unit bar, drawn once per bar; the depth buffer sorts. */
function webglRenderer(gl: WebGL2RenderingContext, fields: Map<number, Field>): Draw {
    const program = linkProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
    attribute(gl, program, 'a_corner', 4, gl.FLOAT)(unitBar());
    const setBars = attribute(gl, program, 'a_bar', 3, gl.FLOAT, { divisor: 1 });
    const setColors = attribute(gl, program, 'a_color', 3, gl.UNSIGNED_BYTE, {
        normalized: true,
        divisor: 1
    });

    const uniform = (name: string) => gl.getUniformLocation(program, name);
    const matrixLocation = uniform('u_matrix');
    const widthLocation = uniform('u_width');
    let key = '';

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.enable(gl.DEPTH_TEST);

    return (count, camera) => {
        const field = fields.get(count)!;
        if (key !== version(count)) {
            key = version(count);
            setBars(field.bars);
            setColors(colors(field));
            gl.uniform1f(widthLocation, field.width);
        }

        // The field fits in a ball of radius 2 around the rotation center.
        gl.uniformMatrix4fv(
            matrixLocation,
            false,
            camera.matrix({ width: WIDTH, height: HEIGHT, depth: 2 })
        );
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, field.n * field.n);
    };
}

/**
 * Renders the landscape into `host` and returns the function that stops it.
 */
export function mountBarField(host: HTMLElement): () => void {
    const fields = new Map(COUNTS.map((count) => [count, field(count)]));
    const camera = camera3D()
        .scale(SCALE)
        .origin({ x: WIDTH / 2, y: HEIGHT / 2 + 20 });

    return canvasFigure(host, {
        unit: 'bars',
        label: 'A landscape of bars',
        counts: COUNTS,
        count: COUNTS[1],
        tilt: TILT,
        camera,
        renderers: (canvas, gl, dpr) => ({
            canvas: canvasRenderer(canvas, fields, dpr),
            webgl: gl ? webglRenderer(gl, fields) : undefined
        })
    });
}
