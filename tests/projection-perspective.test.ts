import { describe, test, expect } from 'vite-plus/test';
import { orthographic, perspective } from '../index';

describe('perspective', () => {
    const options = {
        origin: { x: 100, y: 100 },
        scale: 10,
        rotateCenter: { x: 1, y: 2, z: 0 },
        distance: 10
    };

    test('keeps the orthographic scale in the plane of the rotation center', () => {
        expect(perspective({ x: 3, y: -1, z: 0 }, options)).toEqual({
            x: 130,
            y: 90
        });
    });

    test('draws nearer points larger and farther ones smaller, around the center', () => {
        // k = 10 / (10 - 5) = 2 and k = 10 / (10 + 10) = 0.5.
        expect(perspective({ x: 2, y: 3, z: 5 }, options)).toEqual({
            x: 130,
            y: 140
        });
        expect(perspective({ x: 3, y: 2, z: -10 }, options)).toEqual({
            x: 120,
            y: 120
        });
    });

    test('is orthographic for an infinite distance', () => {
        const point = { x: 0.3, y: -0.7, z: 4 };

        expect(perspective(point, { ...options, distance: Infinity })).toEqual(
            orthographic(point, options)
        );
    });
});
