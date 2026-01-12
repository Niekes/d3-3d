import { describe, test, expect } from 'vitest';
import { lineStrips3D } from '../index';

describe('lineStrips3D', () => {
    test('draws correctly', () => {
        const data = [
            { x: 3, y: 5, z: 2 },
            { x: 2, y: 45, z: 2 },
            { x: 1, y: 1, z: 2 },
            { x: 0, y: 9, z: 3 },
            { x: -1, y: 3, z: 2 },
            { x: -2, y: 8, z: 4 },
            { x: -3, y: 0, z: 2 }
        ];

        const lineStrip = lineStrips3D().scale(30).origin({ x: 220, y: 340 });
        const result = lineStrip([data])[0];

        expect(lineStrip.draw?.(result as any)).toBe(
            'M130,340L160,580L190,430L220,610L250,370L280,1690L310,490'
        );
    });

    test('calculates centroid correctly', () => {
        const data1 = [
            { x: 3, y: 5, z: 2 },
            { x: 2, y: 45, z: 2 },
            { x: 1, y: 1, z: 2 },
            { x: 0, y: 9, z: 3 },
            { x: -1, y: 3, z: 2 },
            { x: -2, y: 8, z: 4 },
            { x: -3, y: 0, z: 2 }
        ];

        const data2 = [
            { x: 3, y: 5, z: 2 },
            { x: 2, y: 45, z: 2 },
            { x: 1, y: 1, z: 2 },
            { x: 0, y: 9, z: 3 },
            { x: -1, y: 3, z: 2 },
            { x: -2, y: 8, z: 4 }
        ];

        const lineStrip = lineStrips3D().scale(30).origin({ x: 220, y: 340 });

        expect(lineStrip([data1])[0].centroid).toEqual({ x: 0, y: 9, z: 3 });
        expect(lineStrip([data2])[0].centroid).toEqual({ x: 0.5, y: 5, z: 2.5 });
    });
});
