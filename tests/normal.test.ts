import { describe, test, expect } from 'vite-plus/test';
import { camera3D, cubes3D, normal } from '../index';

// A cube in the vertex order cubes3D expects: front at +z, top at -y.
const cube = [
    { x: -1, y: -1, z: 1 },
    { x: -1, y: 1, z: 1 },
    { x: 1, y: 1, z: 1 },
    { x: 1, y: -1, z: 1 },
    { x: -1, y: -1, z: -1 },
    { x: -1, y: 1, z: -1 },
    { x: 1, y: 1, z: -1 },
    { x: 1, y: -1, z: -1 }
];

describe('normal', () => {
    test('points out of every face of a cube', () => {
        const outwards = {
            front: [0, 0, 1],
            back: [0, 0, -1],
            left: [-1, 0, 0],
            right: [1, 0, 0],
            top: [0, -1, 0],
            bottom: [0, 1, 0]
        };

        for (const face of cubes3D().data([cube])[0].faces!) {
            const n = normal(face);
            expect([n.x, n.y, n.z].map((v) => v + 0)).toEqual(outwards[face.face]);
        }
    });

    test('faces the camera exactly where ccw does', () => {
        const camera = camera3D().rotateX(0.7).rotateY(-2.1).rotateZ(0.4);
        const v = camera.viewDirection();

        for (const face of cubes3D().camera(camera).data([cube])[0].faces!) {
            const n = normal(face);
            expect(n.x * v.x + n.y * v.y + n.z * v.z > 0).toBe(face.ccw);
        }
    });

    test('is a unit vector for any polygon', () => {
        const n = normal([
            { x: 0, y: 0, z: 0 },
            { x: 3, y: 1, z: 2 },
            { x: 1, y: 4, z: -1 }
        ]);

        expect(Math.hypot(n.x, n.y, n.z)).toBeCloseTo(1, 12);
    });

    test('is zero for a polygon without an area', () => {
        const line = [
            { x: 0, y: 0, z: 0 },
            { x: 1, y: 1, z: 1 },
            { x: 2, y: 2, z: 2 }
        ];

        expect(normal(line)).toEqual({ x: 0, y: 0, z: 0 });
    });
});
