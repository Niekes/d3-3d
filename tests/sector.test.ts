import { describe, test, expect } from 'vite-plus/test';
import { cubes3D, normal, sector } from '../index';

const quarter = {
    x: 0,
    y: 0,
    z: 0,
    innerRadius: 1,
    outerRadius: 2,
    startAngle: 0,
    endAngle: Math.PI / 2,
    height: 3
};

function expectCorners(actual: { x: number; y: number; z: number }[], expected: number[][]) {
    expect(actual).toHaveLength(expected.length);
    expected.forEach(([x, y, z], i) => {
        expect(actual[i].x).toBeCloseTo(x, 12);
        expect(actual[i].y).toBeCloseTo(y, 12);
        expect(actual[i].z).toBeCloseTo(z, 12);
    });
}

describe('sector', () => {
    test('returns the eight corners of a step in the order cubes3D expects', () => {
        // 0 lies at the back (-z), a quarter turn clockwise seen from above at +x.
        const [step] = sector(quarter, 1);

        expectCorners(step, [
            [2, -3, 0], // outer top, end angle
            [2, 0, 0], // outer bottom, end angle
            [0, 0, -2], // outer bottom, start angle
            [0, -3, -2], // outer top, start angle
            [1, -3, 0], // inner top, end angle
            [1, 0, 0], // inner bottom, end angle
            [0, 0, -1], // inner bottom, start angle
            [0, -3, -1] // inner top, start angle
        ]);
    });

    test('gives cubes3D steps whose faces all point outwards', () => {
        const ring = { ...quarter, startAngle: 0.3, endAngle: 0.3 + 2 * Math.PI };

        for (const step of cubes3D().data(sector(ring, 7))) {
            for (const face of step.faces) {
                const n = normal(face);
                const out = {
                    x: face.centroid.x - step.centroid.x,
                    y: face.centroid.y - step.centroid.y,
                    z: face.centroid.z - step.centroid.z
                };

                expect(n.x * out.x + n.y * out.y + n.z * out.z, face.face).toBeGreaterThan(0);
            }
        }
    });

    test('cuts the sweep into whole steps', () => {
        expect(sector(quarter, 2.7)).toHaveLength(2);
        expect(sector(quarter, 0.5)).toEqual([]);
        expect(sector(quarter, 0)).toEqual([]);
        expect(sector(quarter, NaN)).toEqual([]);
    });

    test('is empty where the end angle is not above the start angle', () => {
        expect(sector({ ...quarter, endAngle: 0 }, 4)).toEqual([]);
        expect(sector({ ...quarter, startAngle: 1, endAngle: 0.5 }, 4)).toEqual([]);
    });

    test('closes a wedge at the axis: the inner wall has no area', () => {
        const [step] = sector({ ...quarter, x: 3, z: -1, innerRadius: 0 }, 1);

        expectCorners(step.slice(4), [
            [3, -3, -1],
            [3, 0, -1],
            [3, 0, -1],
            [3, -3, -1]
        ]);
    });
});
