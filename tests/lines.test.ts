import { describe, test, expect } from 'vitest';
import { lines3D } from '../index';

describe('lines3D', () => {
    test("doesn't have a draw function", () => {
        const lines = lines3D();
        expect(lines.draw).toBeUndefined();
    });

    test('calculates centroid correctly', () => {
        const lines = lines3D()
            .x((d) => d.x)
            .y((d) => d.y)
            .z((d) => d.z);

        const data = [
            [
                { x: 0, y: 0, z: 0 },
                { x: 0, y: 0, z: 0 }
            ],
            [
                { x: 1, y: 2, z: 3 },
                { x: 3, y: 2, z: 1 }
            ],
            [
                { x: 10, y: 9.5, z: 8.6 },
                { x: 34.3, y: 11.2, z: 27.4 }
            ]
        ];

        const result = lines(data as any);

        expect(result[0].centroid).toEqual({ x: 0, y: 0, z: 0 });
        expect(result[1].centroid).toEqual({ x: 2, y: 2, z: 2 });
        expect(result[2].centroid).toEqual({ x: 22.15, y: 10.35, z: 18 });
    });
});
