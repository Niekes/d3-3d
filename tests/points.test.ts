import { describe, test, expect } from 'vitest';
import { points3D } from '../index';

describe('points3D', () => {
    test("doesn't have draw function", () => {
        const points = points3D();
        expect(points.draw).toBeUndefined();
    });

    test('is exported correctly', () => {
        expect(points3D).toBeTypeOf('function');
    });

    test('has expected defaults', () => {
        const points = points3D();

        expect(points.origin()).toEqual({ x: 0, y: 0 });
        expect(points.scale()).toBe(1);
        expect(points.rotateX()).toBe(0);
        expect(points.rotateY()).toBe(0);
        expect(points.rotateZ()).toBe(0);
        expect(points.rotationCenter()).toEqual({ x: 0, y: 0, z: 0 });
        expect(points.draw).toBeUndefined();
        expect(points.sort).toBeTypeOf('function');
        expect(points.x).toBeTypeOf('function');
        expect(points.y).toBeTypeOf('function');
        expect(points.z).toBeTypeOf('function');
    });

    test('accesses point coords via array', () => {
        const data = [
            { x: 1, y: 2, z: 3 },
            { x: 4, y: 5, z: 6 }
        ];

        const points = points3D();
        const result = points(data);

        expect(result[0].rotated).toEqual({ x: 1, y: 2, z: 3 });
        expect(result[1].rotated).toEqual({ x: 4, y: 5, z: 6 });
    });

    test('accesses point coords via function', () => {
        const data = [
            { x: 1, y: 2, z: 3 },
            { x: 4, y: 5, z: 6 }
        ];

        const points = points3D()
            .x((d) => d.x)
            .y((d) => d.y)
            .z((d) => d.z);

        const result = points(data);

        expect(result[0].rotated).toEqual({ x: 1, y: 2, z: 3 });
        expect(result[1].rotated).toEqual({ x: 4, y: 5, z: 6 });
    });

    test('rotates zero point along x axis by 180°', () => {
        const data = [{ x: 0, y: 0, z: 0 }];

        const points = points3D()
            .rotateX(Math.PI)
            .x((d) => d.x)
            .y((d) => d.y)
            .z((d) => d.z);

        expect(points(data)[0].rotated).toEqual({ x: 0, y: 0, z: 0 });
    });

    test('rotates point 1|1|1 along x axis by 180°', () => {
        const data = [{ x: 1, y: 1, z: 1 }];

        const points = points3D()
            .rotateX(Math.PI)
            .x((d) => d.x)
            .y((d) => d.y)
            .z((d) => d.z);

        expect(points(data)[0].rotated).toEqual({
            x: 1,
            y: -1.0000000000000002,
            z: -0.9999999999999999
        });
    });

    test('projects point 1|1|1 onto screen', () => {
        const data = [{ x: 1, y: 1, z: 1 }];
        const points = points3D().scale(100);

        expect(points(data)[0].projected).toEqual({ x: 100, y: 100 });
    });
});
