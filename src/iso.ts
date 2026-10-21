import { IsoBoxSpec, IsoFrame, Point2D, Point3D, RotationAngles } from './types';
import { rotateRzRyRx } from './rotation';

const ARC_SEGMENTS = 10;
const QUARTER = Math.PI / 2;

/**
 * A corner of the plan outline: the arc runs from the normal of one face
 * to the normal of the next.
 */
type PlanArc = {
    cx: number;
    cy: number;
    from: number;
    to: number;
};

/**
 * The transform of a plane: the affine map that carries the local
 * coordinates of the plane onto the screen.
 *
 * The plane is spanned by the corner `origin` and the two vectors `u` and
 * `v`. Under an orthographic projection the image of a plane stays affine,
 * so the whole plane is described by a single SVG matrix. That is what makes
 * an isometric scene cheap: the browser rasterises the transform, the
 * projection itself costs nothing.
 */
export function isoPlaneMatrix(
    origin: Point3D,
    u: Point3D,
    v: Point3D,
    angles: RotationAngles,
    scale: number,
    screenOrigin: Point2D
): string {
    const o = rotateRzRyRx(origin, angles);
    const du = rotateDirection(u, angles);
    const dv = rotateDirection(v, angles);

    const a = du.x * scale;
    const b = du.y * scale;
    const c = dv.x * scale;
    const d = dv.y * scale;
    const e = screenOrigin.x + o.x * scale;
    const f = screenOrigin.y + o.y * scale;

    return `matrix(${a} ${b} ${c} ${d} ${e} ${f})`;
}

/**
 * The direction from the scene towards the camera.
 *
 * The projection drops the third axis of the rotated frame, so the camera
 * looks along the third row of the rotation. The horizontal part of that
 * direction decides which sides of a box are visible.
 */
export function viewDirection(angles: RotationAngles): Point3D {
    const options = { ...angles, rotateCenter: { x: 0, y: 0, z: 0 } };
    const c1 = rotateRzRyRx({ x: 1, y: 0, z: 0 }, options);
    const c2 = rotateRzRyRx({ x: 0, y: 1, z: 0 }, options);
    const c3 = rotateRzRyRx({ x: 0, y: 0, z: 1 }, options);
    return { x: c1.z, y: c2.z, z: c3.z };
}

/**
 * The silhouette of a box and the outline of its top face, in world space.
 *
 * The wall is the visible side of the box, the top the face that points up.
 * Both are point lists; the shape module projects them.
 *
 * The visible part of the plan outline is the half of it that faces the
 * camera. The outline is parametrized by the direction of its outward
 * normal, so the visible part is the window of 180 degrees around the
 * direction of the camera.
 */
export function isoBoxOutline(spec: IsoBoxSpec, view: Point3D): { wall: Point3D[]; top: Point3D[] } {
    const r = Math.min(spec.r ?? 0, spec.w / 2, spec.d / 2);
    const z = spec.z;
    const z1 = z + spec.h;

    if (r <= 0) {
        return { wall: sharpWall(spec, view), top: sharpTop(spec) };
    }

    const visible = visiblePlanOutline(spec, r, view);
    const ring = planOutline(spec, r);

    const wall = [
        ...visible.map((p) => ({ x: p.x, y: p.y, z })),
        ...[...visible].reverse().map((p) => ({ x: p.x, y: p.y, z: z1 }))
    ];
    const top = ring.map((p) => ({ x: p.x, y: p.y, z: z1 }));

    return { wall, top };
}

/**
 * The viewport that frames a projected scene.
 *
 * The scene is padded by a share of its own size and then fitted into the
 * requested aspect ratio. The view box keeps the absolute position of the
 * scene, so the renderer origin stays free for the caller.
 */
export function isoFrame(
    points: Point2D[],
    margin: number = 0.09,
    aspect: number = 4 / 3
): IsoFrame {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;

    for (const p of points) {
        if (p.x < x0) x0 = p.x;
        if (p.x > x1) x1 = p.x;
        if (p.y < y0) y0 = p.y;
        if (p.y > y1) y1 = p.y;
    }

    const m = margin * Math.max(x1 - x0, y1 - y0);
    let w = x1 - x0 + 2 * m;
    let h = y1 - y0 + 2 * m;
    let dx = 0;
    let dy = 0;

    if (w / h < aspect) {
        const nw = h * aspect;
        dx = (nw - w) / 2;
        w = nw;
    } else {
        const nh = w / aspect;
        dy = (nh - h) / 2;
        h = nh;
    }

    return {
        viewBox: `${x0 - m - dx} ${y0 - m - dy} ${w} ${h}`,
        width: w,
        height: h
    };
}

/**
 * A direction is rotated like a point, but around the world origin.
 */
function rotateDirection(direction: Point3D, angles: RotationAngles): Point3D {
    return rotateRzRyRx(direction, { ...angles, rotateCenter: { x: 0, y: 0, z: 0 } });
}

/**
 * The full rounded rectangle of the plan, the outline of the top face.
 */
function planOutline(spec: IsoBoxSpec, r: number): Point2D[] {
    const { x, y, w, d } = spec;
    return [
        ...arc(x + w - r, y + r, r, -QUARTER, 0),
        ...arc(x + w - r, y + d - r, r, 0, QUARTER),
        ...arc(x + r, y + d - r, r, QUARTER, Math.PI),
        ...arc(x + r, y + r, r, Math.PI, 3 * QUARTER)
    ];
}

/**
 * The part of the plan outline that faces the camera.
 *
 * The outline is parametrized by the direction of its outward normal: the
 * arc of a corner runs from the normal of one face to the normal of the
 * next, and the straight edge between two corners sits at the normal of the
 * face it belongs to. A point of the outline is visible when its normal
 * points towards the camera, so the visible part is the window of 180
 * degrees around the direction of the camera.
 */
function visiblePlanOutline(spec: IsoBoxSpec, r: number, view: Point3D): Point2D[] {
    const phi = Math.atan2(view.y, view.x);
    let from = phi - QUARTER;
    let to = phi + QUARTER;
    while (from < 0) {
        from += 2 * Math.PI;
        to += 2 * Math.PI;
    }

    const pieces: { arc: PlanArc; from: number; to: number }[] = [];
    for (const shift of [0, 2 * Math.PI]) {
        for (const arc of planArcs(spec, r)) {
            const start = Math.max(arc.from + shift, from);
            const end = Math.min(arc.to + shift, to);
            if (end > start) pieces.push({ arc, from: start, to: end });
        }
    }
    pieces.sort((a, b) => a.from - b.from);

    const points: Point2D[] = [];
    for (const piece of pieces) {
        points.push(...arc(piece.arc.cx, piece.arc.cy, r, piece.from, piece.to));
    }
    return points;
}

/**
 * The four corner arcs of the plan, in the order of the boundary.
 */
function planArcs(spec: IsoBoxSpec, r: number): PlanArc[] {
    const { x, y, w, d } = spec;
    return [
        { cx: x + w - r, cy: y + d - r, from: 0, to: QUARTER },
        { cx: x + r, cy: y + d - r, from: QUARTER, to: Math.PI },
        { cx: x + r, cy: y + r, from: Math.PI, to: 3 * QUARTER },
        { cx: x + w - r, cy: y + r, from: 3 * QUARTER, to: 2 * Math.PI }
    ];
}

/**
 * The samples of a circular arc, from `a0` to `a1` in radians.
 */
function arc(cx: number, cy: number, r: number, a0: number, a1: number): Point2D[] {
    const points: Point2D[] = [];
    for (let i = 0; i <= ARC_SEGMENTS; i++) {
        const a = a0 + ((a1 - a0) * i) / ARC_SEGMENTS;
        points.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
    }
    return points;
}

/**
 * The silhouette of a box without a corner radius: the two faces that face
 * the camera, as one closed polygon.
 */
function sharpWall(spec: IsoBoxSpec, view: Point3D): Point3D[] {
    const { x, y, z, w, d, h } = spec;
    const z1 = z + h;
    // The visible side is the one whose normal points towards the camera.
    const mx = view.x < 0;
    const my = view.y < 0;
    const X = (v: number) => (mx ? x + w - v : x + v);
    const Y = (v: number) => (my ? y + d - v : y + v);
    return [
        { x: X(0), y: Y(d), z },
        { x: X(w), y: Y(d), z },
        { x: X(w), y: Y(0), z },
        { x: X(w), y: Y(0), z: z1 },
        { x: X(w), y: Y(d), z: z1 },
        { x: X(0), y: Y(d), z: z1 }
    ];
}

function sharpTop(spec: IsoBoxSpec): Point3D[] {
    const { x, y, z, w, d, h } = spec;
    const z1 = z + h;
    return [
        { x, y, z: z1 },
        { x: x + w, y, z: z1 },
        { x: x + w, y: y + d, z: z1 },
        { x, y: y + d, z: z1 }
    ];
}
