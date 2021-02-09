import { ccw } from '../counter-clockwise';
import { centroid } from '../centroid';
import { rotateRzRyRx } from '../rotation';

// eslint-disable-next-line import/prefer-default-export
export function polygon(polygons, options, point, angles) {
    for (let i = polygons.length - 1; i >= 0; i -= 1) {
        const ploygon = polygons[i];

        for (let j = ploygon.length - 1; j >= 0; j -= 1) {
            const p = ploygon[j];
            p.rotated = rotateRzRyRx({ x: point.x(p), y: point.y(p), z: point.z(p) }, angles);
            p.projected = options.project(p.rotated, options);
        }

        ploygon.ccw = ccw(ploygon);
        ploygon.centroid = centroid(ploygon);
    }
    return polygons;
}
