import type { Camera3DInstance, Point3D } from '../../index';
import { turnCamera } from './rotatingFigure';

/*
 * The camera of the figures built on a floor. The scene turns around a pivot
 * in the space above the floor; a turn leaves its pivot in place, so the
 * origin moves the pivot to the middle of the 960 × 500 view box. The camera
 * stays between 10 and 85 degrees above the floor, so the floor is behind
 * everything that stands on it.
 */

const START = { yaw: Math.PI / 5, tilt: 0.6, minTilt: Math.PI / 18, maxTilt: (17 * Math.PI) / 36 };

/**
 * Poses the camera that every renderer of a figure hangs on: the projection
 * and the turn for the yaw and the pitch of a drag. `view` holds the scale
 * of the figure and the pivot of its scene. Returns the tilt of the camera
 * above the floor.
 */
export function pose(
    camera: Camera3DInstance,
    view: { scale: number; center: Point3D },
    yaw: number,
    pitch: number
): number {
    const { scale, center } = view;
    camera
        .scale(scale)
        .origin({ x: 480 - center.x * scale, y: 250 - center.y * scale })
        .rotationCenter(center);
    return turnCamera(camera, yaw, pitch, START);
}
