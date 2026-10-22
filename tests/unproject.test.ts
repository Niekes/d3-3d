import { describe, test, expect } from 'vite-plus/test';
import { points3D } from '../index';

describe('unproject', () => {
    test('should return the screen point on the plane z = 0 for an identity renderer', () => {
        const result = points3D().unproject({ x: 3, y: 4 }, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 });

        expect(result).toEqual({ x: 3, y: 4, z: 0 });
    });

    test('should invert the projection of a point on a tilted plane', () => {
        const renderer = points3D()
            .scale(40)
            .origin({ x: 480, y: 250 })
            .rotateX(-0.6)
            .rotateY(0.9)
            .rotateZ(0.2)
            .rotationCenter({ x: 1, y: -2, z: 0.5 });

        const planePoint = { x: 2, y: 1, z: -1 };
        const planeNormal = { x: 1, y: 2, z: 3 };
        // A point on the plane: planePoint plus a vector orthogonal to the normal.
        const world = { x: 2 + 3, y: 1, z: -1 - 1 };

        const projected = renderer.data([world])[0].projected;
        const result = renderer.unproject(projected, planePoint, planeNormal)!;

        expect(result.x).toBeCloseTo(world.x, 9);
        expect(result.y).toBeCloseTo(world.y, 9);
        expect(result.z).toBeCloseTo(world.z, 9);
    });

    test('should invert a perspective projection', () => {
        const renderer = points3D()
            .scale(40)
            .origin({ x: 480, y: 250 })
            .rotateX(-0.6)
            .rotateY(0.9)
            .rotationCenter({ x: 1, y: -2, z: 0.5 })
            .perspective(9);

        const planePoint = { x: 2, y: 1, z: -1 };
        const planeNormal = { x: 1, y: 2, z: 3 };
        const world = { x: 2 + 3, y: 1, z: -1 - 1 };

        const projected = renderer.data([world])[0].projected;
        const result = renderer.unproject(projected, planePoint, planeNormal)!;

        expect(result.x).toBeCloseTo(world.x, 9);
        expect(result.y).toBeCloseTo(world.y, 9);
        expect(result.z).toBeCloseTo(world.z, 9);
    });

    test('should return null for a plane that the ray meets only behind the eye', () => {
        const behind = { x: 0, y: 0, z: 6 };
        const normal = { x: 0, y: 0, z: 1 };

        expect(points3D().perspective(5).unproject({ x: 3, y: 4 }, behind, normal)).toBeNull();
        expect(points3D().unproject({ x: 3, y: 4 }, behind, normal)).toEqual({
            x: 3,
            y: 4,
            z: 6
        });
    });

    test('should return null for a plane seen edge-on', () => {
        const result = points3D().unproject({ x: 3, y: 4 }, { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 });

        expect(result).toBeNull();
    });
});
