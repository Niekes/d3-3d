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

        // Every cube carries its six faces and its centroid, so neither needs
        // a check before use.
        expect(result[0].faces.map((face) => face.face)).toEqual([
            'front',
            'back',
            'left',
            'right',
            'top',
            'bottom'
        ]);
        expect(result[0].centroid).toEqual({ x: 0.5, y: 0.5, z: 0.5 });
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

        expect(cubes.draw?.(result[0].faces[0])).toBe('M0,0L0,1L1,1L1,0Z');
    });

    test('keeps the fields of a cube array (#44)', () => {
        const corners: Point3D[] = [
            { x: 0, y: 0, z: 0 },
            { x: 0, y: 1, z: 0 },
            { x: 1, y: 1, z: 0 },
            { x: 1, y: 0, z: 0 },
            { x: 0, y: 0, z: 1 },
            { x: 0, y: 1, z: 1 },
            { x: 1, y: 1, z: 1 },
            { x: 1, y: 0, z: 1 }
        ];

        const [cube] = cubes3D().data([Object.assign(corners, { height: 42 })]);
        const height: number = cube.height;

        expect(height).toBe(42);
        expect(cube.faces).toHaveLength(6);
    });
});
