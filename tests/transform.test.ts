import { describe, test, expect } from 'vitest';
import { transform } from '../src/transform';
import { Point3D, TransformOptions } from '../src/types';

describe('transform', () => {
    const defaultOptions: TransformOptions<Point3D> = {
        origin: { x: 0, y: 0 },
        rotateCenter: { x: 0, y: 0, z: 0 },
        rotateX: 0,
        rotateY: 0,
        rotateZ: 0,
        scale: 1,
        x: (d) => d.x,
        y: (d) => d.y,
        z: (d) => d.z
    };

    test('should perform an identity transformation', () => {
        const data = [{ x: 1, y: 2, z: 3 }];
        const result = transform(data, defaultOptions);

        expect(result).toHaveLength(1);
        expect(result[0].x).toBe(1);
        expect(result[0].y).toBe(2);
        expect(result[0].z).toBe(3);
        expect(result[0].rotated).toEqual({ x: 1, y: 2, z: 3 });
        expect(result[0].projected).toEqual({ x: 1, y: 2 });
    });

    test('should be immutable', () => {
        const data = [{ x: 1, y: 2, z: 3 }];
        const result = transform(data, defaultOptions);

        expect(result).not.toBe(data);
        expect(result[0]).not.toBe(data[0]);
        // @ts-ignore
        expect(data[0].rotated).toBeUndefined();
    });

    test('should respect scale and origin in projection', () => {
        const data = [{ x: 1, y: 1, z: 1 }];
        const options: TransformOptions<Point3D> = {
            ...defaultOptions,
            scale: 100,
            origin: { x: 50, y: 50 }
        };
        const result = transform(data, options);

        expect(result[0].projected).toEqual({ x: 150, y: 150 });
    });

    test('should respect rotation', () => {
        const data = [{ x: 1, y: 0, z: 0 }];
        const options: TransformOptions<Point3D> = {
            ...defaultOptions,
            rotateZ: Math.PI / 2 // 90 degrees
        };
        const result = transform(data, options);

        // Rotating [1,0,0] 90 deg around Z should give ~[0,1,0]
        expect(result[0].rotated.x).toBe(6.123233995736766e-17);
        expect(result[0].rotated.y).toBe(1);
        expect(result[0].rotated.z).toBe(0);
    });

    test('should work with custom data types', () => {
        type Custom = { a: number; b: number; c: number; meta: string };
        const data: Custom[] = [{ a: 10, b: 20, c: 30, meta: 'test' }];
        const options: TransformOptions<Custom> = {
            ...defaultOptions,
            x: (d: Custom) => d.a,
            y: (d: Custom) => d.b,
            z: (d: Custom) => d.c
        };

        const result = transform(data, options);

        expect(result[0].a).toBe(10);
        expect(result[0].meta).toBe('test');
        expect(result[0].rotated).toEqual({ x: 10, y: 20, z: 30 });
    });
});
