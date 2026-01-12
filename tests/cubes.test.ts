import { describe, test, expect } from 'vitest';
import { cubes3D } from '../index';

describe('cubes3D', () => {
    test('cube naming is correct', () => {
        const cubes = cubes3D()
            .x((d) => d.x)
            .y((d) => d.y)
            .z((d) => d.z);

        const data = [
            [
                { x: 0, y: 0, z: 0 },
                { x: 0, y: 1, z: 0 },
                { x: 1, y: 1, z: 0 },
                { x: 1, y: 0, z: 0 },
                { x: 0, y: 0, z: 1 },
                { x: 0, y: 1, z: 1 },
                { x: 1, y: 1, z: 1 },
                { x: 1, y: 0, z: 1 }
            ]
        ];

        const result = cubes(data);

        expect(result[0]).toBeDefined();

        // @ts-ignore
        expect(result[0]?.faces[0]?.face).toBe('front');

        // @ts-ignore
        expect(result[0]?.faces[1]?.face).toBe('back');

        // @ts-ignore
        expect(result[0]?.faces[2]?.face).toBe('left');

        // @ts-ignore
        expect(result[0]?.faces[3]?.face).toBe('right');

        // @ts-ignore
        expect(result[0]?.faces[4]?.face).toBe('top');

        // @ts-ignore
        expect(result[0]?.faces[5]?.face).toBe('bottom');
    });
});
