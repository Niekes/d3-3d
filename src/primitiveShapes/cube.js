import { ccw } from '../counter-clockwise';
import { centroid } from '../centroid';
import { point as pt } from './point';

// eslint-disable-next-line import/prefer-default-export
export function cube(cubes, options, point, angles) {
    for (let i = cubes.length - 1; i >= 0; i -= 1) {
        // eslint-disable-next-line no-shadow
        const cube = cubes[i];

        const vertices = pt([
            cube[0],
            cube[1],
            cube[2],
            cube[3],
            cube[4],
            cube[5],
            cube[6],
            cube[7],
        ], options, point, angles);

        const v1 = vertices[0];
        const v2 = vertices[1];
        const v3 = vertices[2];
        const v4 = vertices[3];
        const v5 = vertices[4];
        const v6 = vertices[5];
        const v7 = vertices[6];
        const v8 = vertices[7];

        const front = [v1, v2, v3, v4];
        const back = [v8, v7, v6, v5];
        const left = [v5, v6, v2, v1];
        const right = [v4, v3, v7, v8];
        const top = [v5, v1, v4, v8];
        const bottom = [v2, v6, v7, v3];

        front.centroid = centroid(front);
        back.centroid = centroid(back);
        left.centroid = centroid(left);
        right.centroid = centroid(right);
        top.centroid = centroid(top);
        bottom.centroid = centroid(bottom);

        front.ccw = ccw(front);
        back.ccw = ccw(back);
        left.ccw = ccw(left);
        right.ccw = ccw(right);
        top.ccw = ccw(top);
        bottom.ccw = ccw(bottom);

        front.face = 'front';
        back.face = 'back';
        left.face = 'left';
        right.face = 'right';
        top.face = 'top';
        bottom.face = 'bottom';

        const faces = [front, back, left, right, top, bottom];

        cube.faces = faces;

        cube.centroid = {
            x: (left.centroid.x + right.centroid.x) / 2,
            y: (top.centroid.y + bottom.centroid.y) / 2,
            z: (front.centroid.z + back.centroid.z / 2),
        };
    }
    return cubes;
}
