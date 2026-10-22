import { describe, test, expect } from 'vite-plus/test';
import { lines3D } from '../index';

describe('lines3D', () => {
    test('draws a line from its projected ends', () => {
        const lines = lines3D().scale(10).origin({ x: 100, y: 50 });
        const [line] = lines.data([
            [
                { x: 0, y: 0, z: 0 },
                { x: 1, y: -2, z: 3 }
            ]
        ]);

        expect(lines.draw(line)).toBe('M110,30L100,50');
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

        const result = lines.data(data);

        expect(result[0].centroid).toEqual({ x: 0, y: 0, z: 0 });
        expect(result[1].centroid).toEqual({ x: 2, y: 2, z: 2 });
        expect(result[2].centroid).toEqual({ x: 22.15, y: 10.35, z: 18 });
    });
});
