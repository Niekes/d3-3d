import { describe, test, expect } from 'vite-plus/test';
import { gridPlanes3D } from '../index';

describe('gridPlanes3D', () => {
    test('calculates number of planes per row correctly for quadratic grid', () => {
        type TestDatum = { a: number; b: number; c: number };
        const j = 10;
        const points: TestDatum[] = [];

        for (let z = -j; z < j; z++) {
            for (let x = -j; x < j; x++) {
                points.push({ a: x, b: 1, c: z });
            }
        }

        const grid3d = gridPlanes3D<TestDatum>()
            .rows(j * 2)
            .x((d) => d.a)
            .y((d) => d.b)
            .z((d) => d.c)
            .data(points);

        const row = Math.sqrt(points.length) - 1;

        expect(grid3d.length).toBe(row * row);
    });

    test('calculates number of planes per row correctly for non-quadratic grid', () => {
        const points: { x: number; y: number; z: number }[] = [];
        const pointsPerRow = 5;

        for (let z = 0; z < 3; z++) {
            for (let x = 0; x < 5; x++) {
                points.push({ x: x, y: 1, z: z });
            }
        }

        const grid3d = gridPlanes3D()
            .rows(pointsPerRow)
            .x((d) => d.x)
            .y((d) => d.y)
            .z((d) => d.z)
            .data(points);

        expect(grid3d.length).toBe(8);
    });

    test('draw function draws correctly', () => {
        const points: { x: number; y: number; z: number }[] = [];
        const pointsPerRow = 5;

        for (let z = 0; z < 3; z++) {
            for (let x = 0; x < 5; x++) {
                points.push({ x: x, y: 1, z: z });
            }
        }

        const grid3d = gridPlanes3D()
            .rows(pointsPerRow)
            .x((d) => d.x)
            .y((d) => d.y)
            .z((d) => d.z);

        const result = grid3d.data(points);

        expect(grid3d.draw?.(result[0])).toBe('M4,1L4,1L3,1L3,1Z');
    });
});
