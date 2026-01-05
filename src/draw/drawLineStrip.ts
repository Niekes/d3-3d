import type { Point2D } from '../projection-orthographic.js';

export interface LineStripVertex {
    projected: Point2D;
}

export function drawLineStrip(lineStrip: LineStripVertex[]): string {
    const lastPoint = lineStrip[lineStrip.length - 1];
    let path = `M${lastPoint.projected.x},${lastPoint.projected.y}`;

    for (let i = lineStrip.length - 2; i >= 0; i -= 1) {
        const p = lineStrip[i].projected;
        path += `L${p.x},${p.y}`;
    }

    return path;
}
