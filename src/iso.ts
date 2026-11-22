import { IsoBoxSpec, IsoFrame, Point2D, Point3D, RotationAngles } from './types';
import { rotateRzRyRx } from './rotation';

const ARC_SEGMENTS = 10;
const QUARTER = Math.PI / 2;
const DIAGONAL = Math.PI / 4;
const TAU = 2 * Math.PI;

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
 * The silhouette of a box and the outline of its top face, in world space.
 *
 * The wall is the visible side of the box, the top the face that points up.
 * Both are point lists; the shape module projects them. `view` is the
 * direction towards the camera, `viewDirection()` of the renderer: the wall
 * is the half of the box on its side.
 *
 * shortcut: assumes the camera looks down on the box (view.z > 0); seen from
 * below, the top is drawn instead of the bottom. Add the bottom face when a
 * scene needs a view from below.
 */
export function isoBoxOutline(
    spec: IsoBoxSpec,
    view: Point3D
): { wall: Point3D[]; top: Point3D[] } {
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
 * The centres of the four corner arcs of the plan, in the order of the ring.
 * Corner k turns its outward normal from (k − 1) to k quarter turns.
 */
function corners(spec: IsoBoxSpec, r: number): Point2D[] {
    const { x, y, w, d } = spec;
    return [
        { x: x + w - r, y: y + r },
        { x: x + w - r, y: y + d - r },
        { x: x + r, y: y + d - r },
        { x: x + r, y: y + r }
    ];
}

/**
 * The full rounded rectangle of the plan, the outline of the top face.
 */
function planOutline(spec: IsoBoxSpec, r: number): Point2D[] {
    return corners(spec, r).flatMap((c, k) => arc(c.x, c.y, r, (k - 1) * QUARTER, k * QUARTER));
}

/**
 * The part of the plan outline that faces the camera: the half of the ring
 * whose outward normal lies within a quarter turn of the view direction.
 */
function visiblePlanOutline(spec: IsoBoxSpec, r: number, view: Point3D): Point2D[] {
    // Seen straight down every side is in view; keep the near corner of the isometric view.
    const phi = view.x === 0 && view.y === 0 ? DIAGONAL : Math.atan2(view.y, view.x);
    // The first visible normal, within the first lap of the ring: [−1, 3) quarter turns.
    const start = (((phi % TAU) + TAU) % TAU) - QUARTER;
    const ring = corners(spec, r);
    const points: Point2D[] = [];

    // The half ring ends before the end of the sixth quarter, the second corner of the second lap.
    for (let k = 0; k < 6; k += 1) {
        const lo = Math.max((k - 1) * QUARTER, start);
        const hi = Math.min(k * QUARTER, start + Math.PI);
        if (lo < hi) {
            const c = ring[k % 4];
            points.push(...arc(c.x, c.y, r, lo, hi));
        }
    }

    return points;
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
    // The near corner is on the side of the camera; straight down counts as +x, +y.
    const [nx, fx] = view.x >= 0 ? [x + w, x] : [x, x + w];
    const [ny, fy] = view.y >= 0 ? [y + d, y] : [y, y + d];
    return [
        { x: fx, y: ny, z },
        { x: nx, y: ny, z },
        { x: nx, y: fy, z },
        { x: nx, y: fy, z: z1 },
        { x: nx, y: ny, z: z1 },
        { x: fx, y: ny, z: z1 }
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
