import { describe, test, expect } from 'vitest';
import { triangles3D } from '../index';

describe('triangles3D', () => {
    test('is exported correctly', () => {
        expect(triangles3D).toBeTypeOf('function');
    });

    test('has expected defaults', () => {
        const triangles = triangles3D();

        expect(triangles.origin()).toEqual({ x: 0, y: 0 });
        expect(triangles.scale()).toBe(1);
        expect(triangles.rotateX()).toBe(0);
        expect(triangles.rotateY()).toBe(0);
        expect(triangles.rotateZ()).toBe(0);
        expect(triangles.rotationCenter()).toEqual({ x: 0, y: 0, z: 0 });
        expect(triangles.draw).toBeTypeOf('function');
        expect(triangles.sort).toBeTypeOf('function');
        expect(triangles.x).toBeTypeOf('function');
        expect(triangles.y).toBeTypeOf('function');
        expect(triangles.z).toBeTypeOf('function');
    });

    test('draws correctly', () => {
        const data = [
            [
                { x: 0, y: 0, z: 0 },
                { x: 0, y: 1, z: 0 },
                { x: 1, y: 0, z: 0 }
            ]
        ];

        const triangles = triangles3D()
            .x((d) => d.x)
            .y((d) => d.y)
            .z((d) => d.z);

        const result = triangles(data)[0];

        expect(triangles.draw?.(result as any)).toBe('M0,0L0,1L1,0Z');
    });

    test('accesses triangle coords via function', () => {
        const data = [
            [
                { x1: 1, y2: 2, z3: 3 },
                { x1: 4, y2: 5, z3: 6 },
                { x1: 7, y2: 8, z3: 9 }
            ]
        ];

        const triangles = triangles3D()
            // @ts-ignore
            .x((d) => d.x1)

            // @ts-ignore
            .y((d) => d.y2)

            // @ts-ignore
            .z((d) => d.z3);

        const result = triangles(data as any)[0];

        expect(result[0].rotated).toEqual({ x: 1, y: 2, z: 3 });
        expect(result[1].rotated).toEqual({ x: 4, y: 5, z: 6 });
        expect(result[2].rotated).toEqual({ x: 7, y: 8, z: 9 });
    });

    test('creates a closed path', () => {
        const triangles = triangles3D();

        const data = [
            [
                [0, 0, 0],
                [0, 1, 0],
                [1, 0, 0]
            ]
        ];

        const result = triangles(data as any)[0] as any;
        const path = triangles.draw?.(result) as any;
        const lastChar = path[path.length - 1];

        expect(lastChar).toBe('Z');
    });

    test('detects counter-clockwise drawing', () => {
        const triangles = triangles3D();

        const data1 = [
            [
                { x: 1, y: 0, z: 0 },
                { x: -1, y: 0, z: 0 },
                { x: 0, y: 1, z: 0 }
            ],
            [
                { x: 0, y: 1, z: 0 },
                { x: 1, y: 0, z: 0 },
                { x: -1, y: 0, z: 0 }
            ],
            [
                { x: -1, y: 0, z: 0 },
                { x: 0, y: 1, z: 0 },
                { x: 1, y: 0, z: 0 }
            ],
            [
                { x: 1, y: 0, z: 0 },
                { x: 0, y: 1, z: 0 },
                { x: -1, y: 0, z: 0 }
            ],
            [
                { x: -1, y: 0, z: 0 },
                { x: 1, y: 0, z: 0 },
                { x: 0, y: 1, z: 0 }
            ],
            [
                { x: 0, y: 1, z: 0 },
                { x: -1, y: 0, z: 0 },
                { x: 1, y: 0, z: 0 }
            ]
        ];

        const result = triangles(data1);

        expect(result[0].ccw).toBe(true);
        expect(result[1].ccw).toBe(true);
        expect(result[2].ccw).toBe(true);
        expect(result[3].ccw).toBe(false);
        expect(result[4].ccw).toBe(false);
        expect(result[5].ccw).toBe(false);
    });

    test('calculates centroid correctly', () => {
        const triangles = triangles3D();

        const data = [
            [
                { x: 5, y: 0, z: 0 },
                { x: 6, y: 4, z: 0 },
                { x: 4, y: 5, z: 0 }
            ],
            [
                { x: 2, y: 1, z: 0 },
                { x: 2, y: 2, z: 0 },
                { x: 1, y: 1, z: 0 }
            ],
            [
                { x: 1, y: 0, z: 0 },
                { x: 1, y: 2, z: 0 },
                { x: 2, y: 1, z: 0 }
            ],
            [
                { x: 1, y: 0, z: 1 },
                { x: 1, y: 2, z: 1 },
                { x: 2, y: 1, z: 1 }
            ],
            [
                { x: 1, y: 0, z: 2 },
                { x: 1, y: 2, z: 2 },
                { x: 2, y: 1, z: 2 }
            ]
        ];

        const result = triangles(data);

        expect(result[0].centroid).toEqual({ x: 5, y: 3, z: 0 });
        expect(result[1].centroid).toEqual({
            x: 1.6666666666666667,
            y: 1.3333333333333333,
            z: 0
        });
        expect(result[2].centroid).toEqual({ x: 1.3333333333333333, y: 1, z: 0 });
    });

    test('sets scale correctly', () => {
        const triangles1 = triangles3D();
        const triangles2 = triangles3D().scale(2);
        const triangles3 = triangles3D().scale(3);
        const triangles4 = triangles3D().scale(4);

        expect(triangles1.scale()).toBe(1);
        expect(triangles2.scale()).toBe(2);
        expect(triangles3.scale()).toBe(3);
        expect(triangles4.scale()).toBe(4);
    });
});
