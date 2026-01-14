import { Point3D, TransformedPoint } from './types';

export function centroid<T>(polygon: ReadonlyArray<TransformedPoint<T>>): Point3D {
    let sumX = 0;
    let sumY = 0;
    let sumZ = 0;

    for (let i = polygon.length - 1; i >= 0; i -= 1) {
        const point = polygon[i].rotated;

        if (point === undefined) {
            throw new Error(`centroid: polygon point at index ${i} is missing rotated coordinates`);
        }

        sumX += point.x;
        sumY += point.y;
        sumZ += point.z;
    }

    return {
        x: sumX / polygon.length,
        y: sumY / polygon.length,
        z: sumZ / polygon.length
    };
}
