import { describe, test, expect } from 'vite-plus/test';
import { ccw, normal, planes3D, Point3D, TransformedPoint } from '../index';

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

    test('tells a face that only the perspective shows', () => {
        // A face on x = 1, seen edge-on without perspective. The eye at
        // (0, 0, 3) sees its side towards -x.
        const face = [
            { x: 1, y: -0.5, z: 0.5 },
            { x: 1, y: 0.5, z: 0.5 },
            { x: 1, y: 0.5, z: -0.5 },
            { x: 1, y: -0.5, z: -0.5 }
        ];
        const eye = { x: 0, y: 0, z: 3 };

        for (const winding of [face, [...face].reverse()]) {
            const n = normal(winding);
            const facesEye =
                n.x * (eye.x - winding[0].x) +
                    n.y * (eye.y - winding[0].y) +
                    n.z * (eye.z - winding[0].z) >
                0;

            expect(planes3D().perspective(3).data([winding])[0].ccw).toBe(facesEye);
            expect(planes3D().data([winding])[0].ccw).toBe(false);
        }
    });
});
