import { describe, test, expect } from 'vite-plus/test';
import { camera3D, normal, sphere, triangles3D } from '../index';
import type { Point3D } from '../index';

const SEGMENTS = 8;
const CENTER = { x: 5, y: -3, z: 1 };

const mean = (t: Point3D[]): Point3D => ({
    x: (t[0].x + t[1].x + t[2].x) / 3,
    y: (t[0].y + t[1].y + t[2].y) / 3,
    z: (t[0].z + t[1].z + t[2].z) / 3
});

describe('sphere', () => {
    test('closes each pole with a fan and splits every band between them into two triangles per quad', () => {
        // Four bands from pole to pole: a fan at each pole and two bands of quads.
        expect(sphere({ x: 0, y: 0, z: 0, radius: 1 }, SEGMENTS)).toHaveLength(6 * SEGMENTS);
        // Five segments make three bands: two fans and one band of quads.
        expect(sphere({ x: 0, y: 0, z: 0, radius: 1 }, 5)).toHaveLength(4 * 5);
    });

    test('puts every corner on the sphere around its center', () => {
        for (const triangle of sphere({ ...CENTER, radius: 2 }, SEGMENTS)) {
            for (const p of triangle) {
                const distance = Math.hypot(p.x - CENTER.x, p.y - CENTER.y, p.z - CENTER.z);
                expect(distance).toBeCloseTo(2, 12);
            }
        }
    });

    test('points every normal away from the center', () => {
        for (const triangle of sphere({ ...CENTER, radius: 2 }, SEGMENTS)) {
            const n = normal(triangle);
            const c = mean(triangle);
            const out = { x: c.x - CENTER.x, y: c.y - CENTER.y, z: c.z - CENTER.z };
            expect(n.x * out.x + n.y * out.y + n.z * out.z).toBeGreaterThan(0);
        }
    });

    test('lets triangles3D tell the half that faces the camera by ccw', () => {
        const camera = camera3D().rotateX(0.6).rotateY(-1.3).rotateZ(0.2);
        const v = camera.viewDirection();

        for (const triangle of triangles3D()
            .camera(camera)
            .data(sphere({ x: 0, y: 0, z: 0, radius: 1 }, SEGMENTS))) {
            const n = normal(triangle);
            expect(n.x * v.x + n.y * v.y + n.z * v.z > 0).toBe(triangle.ccw);
        }
    });
});
