import { describe, test, expect } from 'vite-plus/test';
import { camera3D, lathe, normal, triangles3D } from '../index';
import type { Point3D } from '../index';

const SEGMENTS = 8;

// A closed cylinder of radius 1 from y = 1 up to y = -1: the profile runs
// upwards, from the centre of the bottom out, up the side and in again.
const CYLINDER = [
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 1, y: -1 },
    { x: 0, y: -1 }
];

const mean = (t: Point3D[]): Point3D => ({
    x: (t[0].x + t[1].x + t[2].x) / 3,
    y: (t[0].y + t[1].y + t[2].y) / 3,
    z: (t[0].z + t[1].z + t[2].z) / 3
});

describe('lathe', () => {
    test('closes a ring of radius 0 with one triangle per segment', () => {
        const mesh = lathe(CYLINDER, SEGMENTS);

        // A fan for the bottom, two triangles per quad of the side, a fan for the top.
        expect(mesh).toHaveLength(4 * SEGMENTS);
        for (const triangle of mesh) {
            const n = normal(triangle);
            expect(Math.hypot(n.x, n.y, n.z)).toBeCloseTo(1, 12);
        }
    });

    test('points every normal outwards', () => {
        for (const triangle of lathe(CYLINDER, SEGMENTS)) {
            const n = normal(triangle);
            const c = mean(triangle);

            if (triangle.every((p) => p.y === 1)) {
                expect(n.y).toBeCloseTo(1, 12);
            } else if (triangle.every((p) => p.y === -1)) {
                expect(n.y).toBeCloseTo(-1, 12);
            } else {
                expect(n.x * c.x + n.z * c.z).toBeGreaterThan(0);
            }
        }
    });

    test('runs counter-clockwise on the screen where it faces the camera', () => {
        const camera = camera3D().rotateX(0.6).rotateY(-1.3).rotateZ(0.2);
        const v = camera.viewDirection();

        for (const triangle of triangles3D().camera(camera).data(lathe(CYLINDER, SEGMENTS))) {
            const n = normal(triangle);
            expect(n.x * v.x + n.y * v.y + n.z * v.z > 0).toBe(triangle.ccw);
        }
    });

    test('turns the surface inside out for a profile that runs downwards', () => {
        const [outside] = lathe(CYLINDER.slice(1, 3), SEGMENTS);
        const [inside] = lathe(CYLINDER.slice(1, 3).reverse(), SEGMENTS);
        const c = mean(outside);

        expect(normal(outside).x * c.x + normal(outside).z * c.z).toBeGreaterThan(0);
        expect(normal(inside).x * c.x + normal(inside).z * c.z).toBeLessThan(0);
    });

    test('leaves an open surface open', () => {
        expect(lathe([{ x: 1, y: 0 }], SEGMENTS)).toEqual([]);
        expect(lathe(CYLINDER.slice(1, 3), SEGMENTS)).toHaveLength(2 * SEGMENTS);
    });
});
