import type { Point3D, ShapeInstance } from '../../index';

/*
 * The camera of the figures built on a floor. The scene turns around a pivot
 * in the space above the floor; a turn leaves its pivot in place, so the
 * origin moves the pivot to the middle of the 960 × 500 view box. The camera
 * stays between 10 and 85 degrees above the floor, so the floor is behind
 * everything that stands on it.
 */

const START_YAW = Math.PI / 5;
const START_TILT = 0.6;
const MIN_TILT = Math.PI / 18;
const MAX_TILT = (17 * Math.PI) / 36;

/** The tilt of the camera above the floor for the pitch of a drag. */
export function tiltOf(pitch: number): number {
    return Math.max(MIN_TILT, Math.min(MAX_TILT, pitch + START_TILT));
}

/**
 * Poses a renderer: every renderer of a figure shares the projection and the
 * turn. `view` holds the scale of the figure and the pivot of its scene.
 */
export function pose<Datum>(
    shape: ShapeInstance<Datum>,
    view: { scale: number; center: Point3D },
    yaw: number,
    tilt: number
): void {
    const { scale, center } = view;
    shape
        .scale(scale)
        .origin({ x: 480 - center.x * scale, y: 250 - center.y * scale })
        .rotationCenter(center)
        .rotateY(yaw + START_YAW)
        .rotateX(-tilt);
}
