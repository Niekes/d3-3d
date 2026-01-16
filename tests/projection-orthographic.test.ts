import { describe, test, expect } from 'vitest';
import { orthographic, perspective } from '../src/projection-orthographic';

describe('projection-orthographic', () => {
    describe('orthographic', () => {
        test('projects correctly with origin (0,0) and scale 1', () => {
            const point = { x: 10, y: 20, z: 30 };
            const options = { origin: { x: 0, y: 0 }, scale: 1 };
            const result = orthographic(point, options);
            expect(result).toEqual({ x: 10, y: 20 });
        });

        test('projects correctly with different origin and scale', () => {
            const point = { x: 10, y: 20, z: 30 };
            const options = { origin: { x: 100, y: 200 }, scale: 2 };
            const result = orthographic(point, options);
            expect(result).toEqual({ x: 120, y: 240 });
        });
    });

    describe('perspective', () => {
        test('projects correctly with default cameraZ', () => {
            const point = { x: 10, y: 20, z: 50 };
            const options = { origin: { x: 100, y: 100 }, focalLength: 100 };
            // depth = 100 + 50 - 0 = 150
            // scale = 100 / 150 = 2/3
            // x = 100 + (2/3) * 10 = 106.666...
            // y = 100 + (2/3) * 20 = 113.333...
            const result = perspective(point, options);
            expect(result.x).toBe(106.66666666666667);
            expect(result.y).toBe(113.33333333333333);
        });

        test('projects correctly with specific cameraZ', () => {
            const point = { x: 10, y: 20, z: 50 };
            const options = { origin: { x: 100, y: 100 }, focalLength: 100, cameraZ: 50 };
            // depth = 100 + 50 - 50 = 100
            // scale = 100 / 100 = 1
            // x = 100 + 1 * 10 = 110
            // y = 100 + 1 * 20 = 120
            const result = perspective(point, options);
            expect(result).toEqual({ x: 110, y: 120 });
        });
    });
});
