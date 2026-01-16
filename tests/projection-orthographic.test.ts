import { describe, test, expect } from 'vitest';
import { orthographic } from '../src/projection-orthographic';

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
});
