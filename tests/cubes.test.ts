import { describe, test, expect } from 'vite-plus/test';
import { cubes3D, Point3D } from '../index';

describe('cubes3D', () => {
    test('cube naming is correct', () => {
        const cubes = cubes3D()
            .x((d) => d.x)
            .y((d) => d.y)
            .z((d) => d.z);

        const data: Point3D[][] = [
            [
                { x: 0, y: 0, z: 0 },
                { x: 0, y: 1, z: 0 },
                { x: 1, y: 1, z: 0 },
                { x: 1, y: 0, z: 0 },
                { x: 0, y: 0, z: 1 },
                { x: 0, y: 1, z: 1 },
                { x: 1, y: 1, z: 1 },
                { x: 1, y: 0, z: 1 }
            ]
        ];

        const result = cubes.data(data);

        expect(result[0]).toBeDefined();

        expect(result[0]?.faces?.[0]?.face).toBe('front');
        expect(result[0]?.faces?.[1]?.face).toBe('back');
        expect(result[0]?.faces?.[2]?.face).toBe('left');
        expect(result[0]?.faces?.[3]?.face).toBe('right');
        expect(result[0]?.faces?.[4]?.face).toBe('top');
        expect(result[0]?.faces?.[5]?.face).toBe('bottom');
    });

    test('cube rotation works correctly', () => {
        const cubes = cubes3D()
            .x((d) => d.x)
            .y((d) => d.y)
            .z((d) => d.z)
            .rotateX(Math.PI / 2)
            .rotateY(Math.PI);

        const data: Point3D[][] = [
            [
                { x: 1, y: 0, z: 0 },
                { x: 1, y: 1, z: 0 },
                { x: 2, y: 1, z: 0 },
                { x: 2, y: 0, z: 0 },
                { x: 1, y: 0, z: 1 },
                { x: 1, y: 1, z: 1 },
                { x: 2, y: 1, z: 1 },
                { x: 2, y: 0, z: 1 }
            ]
        ];

        const result = cubes.data(data);

        expect(result[0]?.[0]?.rotated.x).toBe(-1);
        expect(result[0]?.[0]?.rotated.y).toBe(1.2246467991473532e-16);
        expect(result[0]?.[0]?.rotated.z).toBe(-7.498798913309288e-33);
    });

    test('data gets passed through', () => {
        type CustomDatum = { x: number; y: number; z: number; id: string };

        const myFirstCube = [
            { x: 1, y: 0, z: 0, id: '0' },
            { x: 1, y: 1, z: 0, id: '1' },
            { x: 2, y: 1, z: 0, id: '2' },
            { x: 2, y: 0, z: 0, id: '3' },
            { x: 1, y: 0, z: 1, id: '4' },
            { x: 1, y: 1, z: 1, id: '5' },
            { x: 2, y: 1, z: 1, id: '6' },
            { x: 2, y: 0, z: 1, id: '7' }
        ];

        const cubes = cubes3D<CustomDatum>()
            .rotateX(Math.PI / 2)
            .rotateY(Math.PI);

        const data: CustomDatum[][] = [myFirstCube];

        const result = cubes.data(data);

        expect(result[0]?.[0]?.id).toBe('0');
    });

    test('draw function draws correctly', () => {
        const cubes = cubes3D()
            .x((d) => d.x)
            .y((d) => d.y)
            .z((d) => d.z);

        const data: Point3D[][] = [
            [
                { x: 0, y: 0, z: 0 },
                { x: 0, y: 1, z: 0 },
                { x: 1, y: 1, z: 0 },
                { x: 1, y: 0, z: 0 },
                { x: 0, y: 0, z: 1 },
                { x: 0, y: 1, z: 1 },
                { x: 1, y: 1, z: 1 },
                { x: 1, y: 0, z: 1 }
            ]
        ];

        const result = cubes.data(data);

        expect(cubes.draw?.(result[0].faces![0])).toBe('M0,0L0,1L1,1L1,0Z');
    });
});
