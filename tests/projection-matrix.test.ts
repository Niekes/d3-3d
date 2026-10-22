import { describe, test, expect } from 'vite-plus/test';
import { camera3D, points3D, projectPositions } from '../index';

describe('projectPositions', () => {
    test('projects like transform through the matrix of a renderer', () => {
        const data = [
            { x: 1, y: 2, z: 3 },
            { x: -4, y: 0.5, z: 2 },
            { x: 0, y: -3, z: -1 }
        ];
        const points = points3D()
            .scale(40)
            .origin({ x: 480, y: 250 })
            .rotateX(0.4)
            .rotateY(-1.1)
            .rotateZ(2.3)
            .rotationCenter({ x: 1, y: -2, z: 0.5 });

        const screen = projectPositions(
            data.flatMap((d) => [d.x, d.y, d.z]),
            points.matrix()
        );

        points.data(data).forEach((point, i) => {
            expect(screen[3 * i]).toBeCloseTo(point.projected.x, 3);
            expect(screen[3 * i + 1]).toBeCloseTo(point.projected.y, 3);
            expect(screen[3 * i + 2]).toBeCloseTo(point.rotated.z, 3);
        });
    });

    test('writes into the buffer it is given', () => {
        const out = new Float32Array(3);

        expect(projectPositions([1, 2, 3], points3D().scale(2).matrix(), out)).toBe(out);
        expect(Array.from(out)).toEqual([2, 4, 3]);
    });

    test('maps to clip space when it gets the size of the canvas', () => {
        const center = { x: 1, y: -2, z: 0.5 };
        const camera = camera3D()
            .scale(40)
            .origin({ x: 480, y: 250 })
            .rotateX(0.4)
            .rotateY(-1.1)
            .rotationCenter(center);
        const data = [
            { x: 1, y: 2, z: 3 },
            { x: -4, y: 0.5, z: 2 }
        ];
        const xyz = data.flatMap((d) => [d.x, d.y, d.z]);
        const clip = projectPositions(xyz, camera.matrix({ width: 960, height: 500, depth: 8 }));
        const flat = projectPositions(xyz, camera.matrix({ width: 960, height: 500 }));

        points3D()
            .camera(camera)
            .data(data)
            .forEach((point, i) => {
                expect(clip[3 * i]).toBeCloseTo((2 * point.projected.x) / 960 - 1, 5);
                expect(clip[3 * i + 1]).toBeCloseTo(1 - (2 * point.projected.y) / 500, 5);
                expect(clip[3 * i + 2]).toBeCloseTo(-(point.rotated.z - center.z) / 8, 5);
                expect(flat[3 * i + 2]).toBeCloseTo(0, 12);
            });
    });
});
