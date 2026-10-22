import { describe, test, expect } from 'vite-plus/test';
import { catmullRom } from '../index';

const KNOTS = [
    { x: 0, y: 0, z: 0 },
    { x: 1, y: 2, z: -1 },
    { x: 3, y: 1, z: 2 },
    { x: 4, y: -2, z: 1 }
];

describe('catmullRom', () => {
    test('samples every segment and ends on the last point', () => {
        expect(catmullRom(KNOTS, 5)).toHaveLength(3 * 5 + 1);
    });

    test('passes through every point', () => {
        const curve = catmullRom(KNOTS, 5);

        KNOTS.forEach((knot, i) => {
            expect(curve[i * 5].x).toBeCloseTo(knot.x, 12);
            expect(curve[i * 5].y).toBeCloseTo(knot.y, 12);
            expect(curve[i * 5].z).toBeCloseTo(knot.z, 12);
        });
    });

    test('keeps evenly spaced points on a line evenly spaced', () => {
        const line = [0, 1, 2, 3].map((t) => ({ x: t, y: 2 * t, z: -t }));
        const curve = catmullRom(line, 4);

        // The clamped ends ease in and out, the inner segment is linear.
        for (let s = 4; s <= 8; s += 1) {
            expect(curve[s].x).toBeCloseTo(s / 4, 12);
            expect(curve[s].y).toBeCloseTo(s / 2, 12);
            expect(curve[s].z).toBeCloseTo(-s / 4, 12);
        }
    });

    test('returns a copy of a single point and nothing for none', () => {
        const point = { x: 1, y: 2, z: 3 };

        expect(catmullRom([point], 4)).toEqual([point]);
        expect(catmullRom([point], 4)[0]).not.toBe(point);
        expect(catmullRom([], 4)).toEqual([]);
    });
});
