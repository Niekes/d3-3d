import { describe, test, expect } from 'vite-plus/test';
import { box, cubes3D, normal } from '../index';

describe('box', () => {
    test('returns the eight corners in the order cubes3D expects', () => {
        expect(box({ x: 5, y: 1, z: -2, width: 2, height: 3, depth: 4 })).toEqual([
            { x: 4, y: -2, z: 0 }, // front top left
            { x: 4, y: 1, z: 0 }, // front bottom left
            { x: 6, y: 1, z: 0 }, // front bottom right
            { x: 6, y: -2, z: 0 }, // front top right
            { x: 4, y: -2, z: -4 }, // back top left
            { x: 4, y: 1, z: -4 }, // back bottom left
            { x: 6, y: 1, z: -4 }, // back bottom right
            { x: 6, y: -2, z: -4 } // back top right
        ]);
    });

    test('gives cubes3D a box whose faces are named after their sides', () => {
        const [cube] = cubes3D().data([box({ x: 0, y: 0, z: 0, width: 1, height: 1, depth: 1 })]);
        const top = cube.faces!.find((face) => face.face === 'top')!;
        const front = cube.faces!.find((face) => face.face === 'front')!;

        expect(normal(top).y).toBeCloseTo(-1, 12);
        expect(normal(front).z).toBeCloseTo(1, 12);
    });
});
