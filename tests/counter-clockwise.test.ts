import { describe, test, expect } from 'vitest';
import { ccw, Point3D, TransformedPoint } from '../index';

function point(x: number, y: number, z = 0): TransformedPoint<Point3D> {
    return {
        x,
        y,
        z,
        rotated: { x, y, z },
        projected: { x, y }
    };
}

describe('ccw', () => {
    test('detects a counter-clockwise polygon', () => {
        const polygon = [point(0, 0), point(0, 1), point(1, 1), point(1, 0)];

        expect(ccw(polygon)).toBe(true);
    });

    test('detects a clockwise polygon', () => {
        const polygon = [point(0, 0), point(1, 0), point(1, 1), point(0, 1)];

        expect(ccw(polygon)).toBe(false);
    });

    test('returns false for a degenerate polygon', () => {
        expect(ccw([point(0, 0), point(1, 0), point(2, 0)])).toBe(false);
    });
});
