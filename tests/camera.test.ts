import { describe, test, expect } from 'vite-plus/test';
import { axes3D, camera3D, points3D, projectPositions } from '../index';

const data = [
    { x: 1, y: 2, z: 3 },
    { x: -2, y: 0.5, z: 1 },
    { x: 0, y: -3, z: -1 }
];
const center = { x: 1, y: -2, z: 0.5 };

describe('camera3D', () => {
    test('has the defaults of a shape and chains its setters', () => {
        const camera = camera3D();

        expect(camera.scale()).toBe(1);
        expect(camera.origin()).toEqual({ x: 0, y: 0 });
        expect(camera.rotateX()).toBe(0);
        expect(camera.rotateY()).toBe(0);
        expect(camera.rotateZ()).toBe(0);
        expect(camera.rotationCenter()).toEqual({ x: 0, y: 0, z: 0 });
        expect(camera.scale(2).rotateY(1)).toBe(camera);
    });

    test('a shape on the camera projects like a shape with the same settings', () => {
        const camera = camera3D()
            .scale(40)
            .origin({ x: 480, y: 250 })
            .rotateX(0.4)
            .rotateY(-1.1)
            .rotateZ(2.3)
            .rotationCenter(center);
        const alike = points3D()
            .scale(40)
            .origin({ x: 480, y: 250 })
            .rotateX(0.4)
            .rotateY(-1.1)
            .rotateZ(2.3)
            .rotationCenter(center);

        expect(points3D().camera(camera).data(data)).toEqual(alike.data(data));
    });

    test('cameras and shapes on one view turn together, either way round', () => {
        const camera = camera3D().scale(30);
        const points = points3D().camera(camera);
        const box = axes3D().camera(points);
        const other = camera3D().camera(camera);

        camera.rotateY(0.5);
        box.rotateX(0.25);

        for (const view of [camera, points, box, other]) {
            expect([view.scale(), view.rotateY(), view.rotateX()]).toEqual([30, 0.5, 0.25]);
        }
    });

    test('a shape gives up its own settings for those of the camera', () => {
        const points = points3D().scale(30).origin({ x: 5, y: 5 }).camera(camera3D());

        expect(points.scale()).toBe(1);
        expect(points.origin()).toEqual({ x: 0, y: 0 });
    });

    test('its matrix projects like the shapes on it', () => {
        const camera = camera3D()
            .scale(40)
            .origin({ x: 480, y: 250 })
            .rotateX(0.4)
            .rotateY(-1.1)
            .rotationCenter(center);
        const screen = projectPositions(
            data.flatMap((d) => [d.x, d.y, d.z]),
            camera.matrix()
        );

        points3D()
            .camera(camera)
            .data(data)
            .forEach((point, i) => {
                expect(screen[3 * i]).toBeCloseTo(point.projected.x, 3);
                expect(screen[3 * i + 1]).toBeCloseTo(point.projected.y, 3);
            });
    });

    test('unprojects what the shapes on it project', () => {
        const camera = camera3D().scale(40).origin({ x: 480, y: 250 }).rotateX(-0.5).rotateY(0.6);
        const [point] = points3D()
            .camera(camera)
            .data([{ x: 1, y: 0, z: 2 }]);
        const floor = camera.unproject(point.projected, { x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 });

        expect(floor?.x).toBeCloseTo(1, 9);
        expect(floor?.y).toBeCloseTo(0, 9);
        expect(floor?.z).toBeCloseTo(2, 9);
    });

    test('rejects anything but a camera or a shape', () => {
        // @ts-expect-error a plain object has none of the settings
        expect(() => points3D().camera({})).toThrow(TypeError);
    });
});

describe('viewDirection', () => {
    test('points along z towards the viewer without a rotation', () => {
        expect(camera3D().viewDirection()).toEqual({ x: 0, y: 0, z: 1 });
    });

    test('is the unit vector the rotated depth grows along', () => {
        const camera = camera3D().rotateX(0.4).rotateY(-1.1).rotateZ(2.3).rotationCenter(center);
        const v = camera.viewDirection();

        expect(Math.hypot(v.x, v.y, v.z)).toBeCloseTo(1, 12);
        for (const point of points3D().camera(camera).data(data)) {
            const depth =
                v.x * (point.x - center.x) +
                v.y * (point.y - center.y) +
                v.z * (point.z - center.z) +
                center.z;
            expect(depth).toBeCloseTo(point.rotated.z, 12);
        }
    });
});
