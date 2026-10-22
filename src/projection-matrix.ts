import { TransformOptions } from './types';
import { rotationMatrix } from './rotation';

/**
 * The projection of `transform` as a column-major 4×4 matrix, the layout
 * `gl.uniformMatrix4fv` expects. A world point maps to its screen x and y
 * and, as z, to its rotated z: the depth `sort` reads.
 *
 * The orthographic projection is affine: the screen point is
 * `origin + scale · (R · p + c − R · c)` for the rotation `R` around the
 * center `c`, and w is 1. In perspective, w is the distance from the eye
 * along the view axis over `perspective`, 1 in the plane of the center, and
 * x and y divided by w are the screen point.
 *
 * Given the `width` and `height` of the canvas in the same pixels, the
 * matrix maps to clip space instead, ready for `gl_Position`: x and y from
 * -1 to 1 with y up, and the depth within `depth` of the center from -1 at
 * the near side to 1 at the far side. Without a `depth`, z is 0. In
 * perspective, `depth` has to be less than `perspective`, so that the near
 * side lies in front of the eye.
 */
export function projectionMatrix(
    options: Omit<TransformOptions<unknown>, 'x' | 'y' | 'z'>,
    viewport?: { width: number; height: number; depth?: number }
): Float32Array {
    const { origin: o, rotateCenter: c, scale: s } = options;
    const m = rotationMatrix({
        x: options.rotateX,
        y: options.rotateY,
        z: options.rotateZ,
        rotateCenter: c
    });

    const tx = c.x - (m[0] * c.x + m[1] * c.y + m[2] * c.z);
    const ty = c.y - (m[3] * c.x + m[4] * c.y + m[5] * c.z);
    const tz = c.z - (m[6] * c.x + m[7] * c.y + m[8] * c.z);

    // prettier-ignore
    const matrix = [
        s * m[0], s * m[3], m[6], 0,
        s * m[1], s * m[4], m[7], 0,
        s * m[2], s * m[5], m[8], 0,
        o.x + s * tx, o.y + s * ty, tz, 1
    ];

    const d = options.perspective ?? Infinity;

    // Row by row on every column; the fourth row is 0 or 1 so far.
    for (let column = 0; column < 16; column += 4) {
        const one = matrix[column + 3];
        const z = matrix[column + 2];
        // w is `one` again for an eye infinitely far away.
        const w = one - (z - c.z * one) / d;
        matrix[column] += (o.x + s * c.x) * (w - one);
        matrix[column + 1] += (o.y + s * c.y) * (w - one);
        matrix[column + 3] = w;

        if (viewport) {
            const { width, height, depth } = viewport;
            matrix[column] = (2 * matrix[column]) / width - w;
            matrix[column + 1] = w - (2 * matrix[column + 1]) / height;
            // Near and far at `d ∓ depth` from the eye; the term over `d`
            // vanishes for an orthographic view.
            matrix[column + 2] = depth ? (c.z * one - z + (depth * depth * one) / d) / depth : 0;
        }
    }

    return new Float32Array(matrix);
}

/**
 * Projects packed x, y, z triples through `matrix` into `out`: screen x,
 * screen y and depth, three numbers per point. Pass the same `out` every
 * frame to project a large point cloud without allocating.
 *
 * x and y are divided by w, which is 1 unless the matrix is perspective.
 * The depth is not, so it stays the rotated z that `sort` reads.
 */
export function projectPositions(
    positions: ArrayLike<number>,
    matrix: ArrayLike<number>,
    out: Float32Array = new Float32Array(positions.length)
): Float32Array {
    for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];

        const w = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15];

        out[i] = (matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12]) / w;
        out[i + 1] = (matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13]) / w;
        out[i + 2] = matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14];
    }

    return out;
}
