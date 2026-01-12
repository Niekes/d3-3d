import { describe, test, expect } from 'vitest';
import { planes3D } from '../index';

describe('planes3D', () => {
    test('calculates centroid correctly', () => {
        const planes = planes3D()
            .x((d) => d.x)
            .y((d) => d.y)
            .z((d) => d.z);

        const data = [
            [
                { x: 1, y: 1, z: 0 },
                { x: -1, y: 1, z: 0 },
                { x: 1, y: -1, z: 1 },
                { x: -1, y: -1, z: 1 }
            ]
        ];

        expect(planes(data)[0].centroid).toEqual({ x: 0, y: 0, z: 0.5 });
    });

    test('draw function draws correctly', () => {
        const planes = planes3D();

        const data = [
            [
                { x: 5, y: 0, z: 2 },
                { x: 6, y: 4, z: 1 },
                { x: 4, y: 5, z: 8 },
                { x: 1, y: 5, z: 9 }
            ]
        ];

        const result = planes(data)[0];

        expect(planes.draw?.(result as any)).toBe('M5,0L6,4L4,5L1,5Z');
    });

    test('detects counter-clockwise drawing', () => {
        const data = [
            [
                [-1, 0, 0],
                [1, 0, 0],
                [1, 1, 0],
                [-1, 1, 0]
            ]
        ];

        const planes = planes3D();

        expect(planes(data as any)[0].ccw).toBe(false);
    });
});
