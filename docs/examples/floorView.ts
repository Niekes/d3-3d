import { range } from 'd3';
import type { Selection } from 'd3';
import { lines3D, planes3D } from '../../index';
import type { Camera3DInstance, Line, Point3D } from '../../index';
import { turnCamera } from './rotatingFigure';
import { placeSegments } from './segments';

/*
 * The camera of the figures built on a floor, and the floor. The scene turns
 * around a pivot in the space above the floor; a turn leaves its pivot in
 * place, so the origin moves the pivot to the middle of the 960 × 500 view
 * box. The camera stays between 10 and 85 degrees above the floor, so the
 * floor is behind everything that stands on it.
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

/**
 * Puts a floor of `n` × `n` unit cells around the origin, at y = 0, behind
 * everything else in `svg`: one plane of the class `floor` and a grid line
 * along every cell edge, in a group of the class `<prefix>-floor`. Its
 * renderers hang on `camera`. Returns the function that draws it, which
 * the figure calls after every turn.
 */
export function floorGrid(
    svg: Selection<SVGSVGElement, unknown, null, undefined>,
    prefix: string,
    camera: Camera3DInstance,
    n: number
): () => void {
    const half = n / 2;
    const plane = planes3D().camera(camera);
    const lines = lines3D().camera(camera);
    const floor: Point3D[][] = [
        [
            { x: -half, y: 0, z: -half },
            { x: half, y: 0, z: -half },
            { x: half, y: 0, z: half },
            { x: -half, y: 0, z: half }
        ]
    ];
    const grid: Point3D[][] = range(n + 1).flatMap((i) => [
        [
            { x: i - half, y: 0, z: -half },
            { x: i - half, y: 0, z: half }
        ],
        [
            { x: -half, y: 0, z: i - half },
            { x: half, y: 0, z: i - half }
        ]
    ]);
    const group = svg.insert('g', 'g').attr('class', `${prefix}-floor`);

    return () => {
        group
            .selectAll('path')
            .data(plane.data(floor))
            .join('path')
            .attr('class', 'floor')
            .attr('d', plane.draw);

        group
            .selectAll<SVGLineElement, Line<Point3D>>('line')
            .data(lines.data(grid))
            .join('line')
            .call(placeSegments);
    };
}
