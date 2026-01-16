import { describe, test, expect } from 'vitest';
import { polygons3D } from '../index';

describe('polygons3D', () => {
    test('draws correctly', () => {
        type TestDatum = { x: number; y: number; z: number };

        const myPolygon: TestDatum[][] = [
            [
                { x: 3, y: 5, z: 2 },
                { x: 2, y: 45, z: 2 },
                { x: 1, y: 1, z: 2 },
                { x: 0, y: 9, z: 3 },
                { x: -1, y: 3, z: 2 },
                { x: -2, y: 8, z: 4 },
                { x: -3, y: 0, z: 2 }
            ]
        ];

        const polygons = polygons3D().scale(30).origin({ x: 220, y: 340 });
        // .x((d) => d.x1)
        // .y((d) => d.y)
        // .z((d) => d.z);

        const result = polygons.data(myPolygon)[0];

        expect(polygons.draw?.(result)).toBe(
            'M130,340L160,580L190,430L220,610L250,370L280,1690L310,490Z'
        );
    });

    test('has expected defaults', () => {
        const polygons = polygons3D();

        expect(polygons.origin()).toEqual({ x: 0, y: 0 });
        expect(polygons.scale()).toBe(1);
        expect(polygons.rotateX()).toBe(0);
        expect(polygons.rotateY()).toBe(0);
        expect(polygons.rotateZ()).toBe(0);
        expect(polygons.rotationCenter()).toEqual({ x: 0, y: 0, z: 0 });
        expect(polygons.draw).toBeTypeOf('function');
        expect(polygons.x).toBeTypeOf('function');
        expect(polygons.y).toBeTypeOf('function');
        expect(polygons.z).toBeTypeOf('function');
    });
});
