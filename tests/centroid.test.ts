import { describe, test, expect } from 'vitest';
import { centroid, Point3D, TransformedPoint } from '../index';

function point(x: number, y: number, z: number): TransformedPoint<Point3D> {
    return {
        x,
        y,
        z,
        rotated: { x, y, z },
        projected: { x, y }
    };
}

describe('centroid', () => {
    test('averages the rotated coordinates of every point', () => {
        const polygon = [point(0, 0, 0), point(2, 4, 6), point(4, 2, 12)];

        expect(centroid(polygon)).toEqual({ x: 2, y: 2, z: 6 });
    });

    test('returns the point itself for a single point polygon', () => {
        expect(centroid([point(1, 2, 3)])).toEqual({ x: 1, y: 2, z: 3 });
    });

    test('does not mutate the input polygon', () => {
        const polygon = [point(0, 0, 0), point(2, 4, 6)];
        const snapshot = polygon.map((p) => ({ ...p.rotated }));

        centroid(polygon);

        expect(polygon.map((p) => p.rotated)).toEqual(snapshot);
    });
});
