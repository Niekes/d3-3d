import { TransformOptions } from './types';
import { rotationMatrix } from './rotation';

/**
 * The projection of `transform` as a column-major 4×4 matrix, the layout
 * `gl.uniformMatrix4fv` expects. A world point maps to its screen x and y
 * and, as z, to its rotated z: the depth `sort` reads.
 *
 * The projection is orthographic, so it is affine: the screen point is
 * `origin + scale · (R · p + c − R · c)` for the rotation `R` around the
 * center `c`, and one matrix carries all of it.
 */
export function projectionMatrix(
    options: Omit<TransformOptions<unknown>, 'x' | 'y' | 'z'>
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
    return new Float32Array([
        s * m[0], s * m[3], m[6], 0,
        s * m[1], s * m[4], m[7], 0,
        s * m[2], s * m[5], m[8], 0,
        o.x + s * tx, o.y + s * ty, tz, 1
    ]);
}

/**
 * Projects packed x, y, z triples through `matrix` into `out`: screen x,
 * screen y and depth, three numbers per point. Pass the same `out` every
 * frame to project a large point cloud without allocating.
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

        out[i] = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12];
        out[i + 1] = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13];
        out[i + 2] = matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14];
    }

    return out;
}
