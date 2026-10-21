import { describe, test, expect } from 'vite-plus/test';
import { iso3D, sort } from '../index';

/*
 * The reference implementation: the isometric kernel of the figure this API
 * was modelled on. The angles below reproduce it exactly, the rotation is
 * the one that maps the world axes onto the 120 degree screen axes.
 */
const C = Math.cos(Math.PI / 6);
const S = Math.sin(Math.PI / 6);
const AX = Math.atan(Math.SQRT2);
const AZ = Math.PI / 4;
const SCALE = Math.sqrt(1.5);

const reference = (x: number, y: number, z: number): [number, number] => [
    (x - y) * C,
    (x + y) * S - z
];

const referencePlane = (o: number[], u: number[], v: number[]): string => {
    const oo = reference(o[0], o[1], o[2]);
    const uu = reference(u[0], u[1], u[2]);
    const vv = reference(v[0], v[1], v[2]);
    return [uu[0], uu[1], vv[0], vv[1], oo[0], oo[1]].join(' ');
};

const referenceArc = (cx: number, cy: number, r: number, a0: number, a1: number) => {
    const points: [number, number][] = [];
    for (let i = 0; i <= 10; i++) {
        const a = a0 + ((a1 - a0) * i) / 10;
        points.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return points;
};

const referenceBox = (
    x: number,
    y: number,
    z: number,
    w: number,
    d: number,
    h: number,
    r: number
) => {
    const q = Math.PI / 4;
    const H = Math.PI / 2;
    const z1 = z + h;
    const ring = [
        ...referenceArc(x + w - r, y + r, r, -H, 0),
        ...referenceArc(x + w - r, y + d - r, r, 0, H),
        ...referenceArc(x + r, y + d - r, r, H, 2 * H),
        ...referenceArc(x + r, y + r, r, 2 * H, 3 * H)
    ];
    const visible = [
        ...referenceArc(x + w - r, y + r, r, -q, 0),
        ...referenceArc(x + w - r, y + d - r, r, 0, H),
        ...referenceArc(x + r, y + d - r, r, H, 3 * q)
    ];
    const wall = [
        ...visible.map((p) => [p[0], p[1], z]),
        ...[...visible].reverse().map((p) => [p[0], p[1], z1])
    ];
    return {
        wall: wall.map((p) => reference(p[0], p[1], p[2])),
        top: ring.map((p) => reference(p[0], p[1], z1))
    };
};

const referenceFrame = (points: [number, number][], margin = 0.09, aspect = 4 / 3) => {
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const y0 = Math.min(...ys);
    const y1 = Math.max(...ys);
    const m = margin * Math.max(x1 - x0, y1 - y0);
    let w = x1 - x0 + 2 * m;
    let h = y1 - y0 + 2 * m;
    let ox = m - x0;
    let oy = m - y0;
    if (w / h < aspect) {
        const nw = h * aspect;
        ox += (nw - w) / 2;
        w = nw;
    } else {
        const nh = w / aspect;
        oy += (nh - h) / 2;
        h = nh;
    }
    return { ox, oy, width: w, height: h };
};

const numbers = (text: string): number[] =>
    (text.match(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi) ?? []).map(Number);

const pathPoints = (path: string): [number, number][] => {
    const values = numbers(path);
    const pairs: [number, number][] = [];
    for (let i = 0; i + 1 < values.length; i += 2) {
        pairs.push([values[i], values[i + 1]]);
    }
    return pairs;
};

// Paths are rounded to three decimals, matrices are not.
const PATH_TOLERANCE = 1e-3;

const expectClose = (actual: number[], expected: number[], tolerance = 1e-9) => {
    expect(actual.length).toBe(expected.length);
    for (let i = 0; i < actual.length; i += 1) {
        expect(Math.abs(actual[i] - expected[i])).toBeLessThan(tolerance);
    }
};

const expectPointsClose = (
    actual: [number, number][],
    expected: [number, number][],
    tolerance = 1e-9
) => {
    expect(actual.length).toBe(expected.length);
    for (let i = 0; i < actual.length; i += 1) {
        expect(Math.abs(actual[i][0] - expected[i][0])).toBeLessThan(tolerance);
        expect(Math.abs(actual[i][1] - expected[i][1])).toBeLessThan(tolerance);
    }
};

const iso = () => iso3D().rotateX(AX).rotateZ(AZ).scale(SCALE);

describe('iso3D', () => {
    test('is exported correctly', () => {
        expect(iso3D).toBeTypeOf('function');
    });

    test('has expected defaults', () => {
        const renderer = iso3D();
        expect(renderer.origin()).toEqual({ x: 0, y: 0 });
        expect(renderer.scale()).toBe(1);
        expect(renderer.rotateX()).toBe(0);
        expect(renderer.rotateY()).toBe(0);
        expect(renderer.rotateZ()).toBe(0);
        expect(renderer.rotationCenter()).toEqual({ x: 0, y: 0, z: 0 });
    });

    test('reproduces the top face of the reference', () => {
        const plane = iso().plane({
            origin: { x: 108, y: 18, z: 200 },
            u: { x: 1, y: 0, z: 0 },
            v: { x: 0, y: 1, z: 0 }
        });
        expectClose(
            numbers(plane.matrix),
            numbers(referencePlane([108, 18, 200], [1, 0, 0], [0, 1, 0]))
        );
    });

    test('reproduces the front face of the reference', () => {
        const plane = iso().plane({
            origin: { x: 108, y: 166, z: 200 },
            u: { x: 1, y: 0, z: 0 },
            v: { x: 0, y: 0, z: -1 }
        });
        expectClose(
            numbers(plane.matrix),
            numbers(referencePlane([108, 166, 200], [1, 0, 0], [0, 0, -1]))
        );
    });

    test('keeps the renderer when an angle is zero', () => {
        const renderer = iso3D();
        expect(renderer.rotateY(0)).toBe(renderer);
        expect(renderer.rotateX(0)).toBe(renderer);
        expect(renderer.rotateZ(0)).toBe(renderer);
        expect(renderer.scale(0)).toBe(renderer);
        expect(iso3D().rotateY(0).data([]).length).toBe(0);
    });

    test('reproduces the side face of the reference', () => {
        const plane = iso().plane({
            origin: { x: 248, y: 166, z: 200 },
            u: { x: 0, y: -1, z: 0 },
            v: { x: 0, y: 0, z: -1 }
        });
        expectClose(
            numbers(plane.matrix),
            numbers(referencePlane([248, 166, 200], [0, -1, 0], [0, 0, -1]))
        );
    });

    test('leaves the plane untouched without a rotation', () => {
        const plane = iso3D().plane({
            origin: { x: 10, y: 20, z: 30 },
            u: { x: 1, y: 0, z: 0 },
            v: { x: 0, y: 1, z: 0 }
        });
        expectClose(numbers(plane.matrix), [1, 0, 0, 1, 10, 20]);
    });

    test('reproduces the wall and the top of a rounded box', () => {
        const [box] = iso().data([{ x: 200, y: 0, z: 36, w: 180, d: 160, h: 6, r: 6 }]);
        const expected = referenceBox(200, 0, 36, 180, 160, 6, 6);

        expectPointsClose(pathPoints(box.wall).reverse(), expected.wall, PATH_TOLERANCE);
        expectPointsClose(pathPoints(box.top).reverse(), expected.top, PATH_TOLERANCE);
    });

    test('closes the wall of a rounded box', () => {
        const [box] = iso().data([{ x: 0, y: 0, z: 0, w: 100, d: 80, h: 20, r: 8 }]);
        expect(box.wall.endsWith('Z')).toBe(true);
        expect(box.top.endsWith('Z')).toBe(true);
    });

    test('builds a sharp box without a corner radius', () => {
        const [box] = iso().data([{ x: 0, y: 0, z: 0, w: 100, d: 80, h: 20 }]);
        expect(box.wall.endsWith('Z')).toBe(true);
        expect(pathPoints(box.top).length).toBe(4);
    });

    test('exposes the frames of the three visible faces', () => {
        const [box] = iso().data([{ x: 200, y: 0, z: 36, w: 180, d: 160, h: 6, r: 6 }]);
        expectClose(
            numbers(box.topPlane.matrix),
            numbers(referencePlane([200, 0, 42], [1, 0, 0], [0, 1, 0]))
        );
        expectClose(
            numbers(box.frontPlane.matrix),
            numbers(referencePlane([200, 160, 42], [1, 0, 0], [0, 0, -1]))
        );
        expectClose(
            numbers(box.sidePlane.matrix),
            numbers(referencePlane([380, 160, 42], [0, -1, 0], [0, 0, -1]))
        );
    });

    test('centres the box on its rotated middle', () => {
        const [box] = iso().data([{ x: 200, y: 0, z: 36, w: 180, d: 160, h: 6, r: 6 }]);
        const expected = (200 + 90 + 0 + 80 + 36 + 3) / Math.sqrt(3);
        expect(Math.abs(box.centroid.z - expected)).toBeLessThan(1e-9);
    });

    test('projects a point onto the screen', () => {
        const points = iso().project([
            { x: 0, y: 0, z: 0 },
            { x: 10, y: 20, z: 30 }
        ]);
        expect(points.length).toBe(2);
        expectClose([points[0].x, points[0].y], reference(0, 0, 0));
        expectClose([points[1].x, points[1].y], reference(10, 20, 30));
    });

    test('projects a polyline into a path', () => {
        const path = iso().path([
            { x: 0, y: 0, z: 0 },
            { x: 10, y: 0, z: 0 },
            { x: 10, y: 10, z: 0 }
        ]);
        const expected = [
            { x: 0, y: 0, z: 0 },
            { x: 10, y: 0, z: 0 },
            { x: 10, y: 10, z: 0 }
        ]
            .map((p) => reference(p.x, p.y, p.z))
            .reverse();

        expectClose(numbers(path), expected.flat(), PATH_TOLERANCE);
    });

    test('frames a scene like the reference', () => {
        const points = [
            { x: 0, y: 0, z: 0 },
            { x: 300, y: 0, z: 7 },
            { x: 0, y: 240, z: 7 },
            { x: 108, y: 166, z: 200 }
        ];
        const frame = iso().frame(points);
        const projected = points.map((p) => reference(p.x, p.y, p.z));
        const expected = referenceFrame(projected);
        const [x, y, w, h] = numbers(frame.viewBox);

        expect(Math.abs(w - expected.width)).toBeLessThan(1e-9);
        expect(Math.abs(h - expected.height)).toBeLessThan(1e-9);
        expect(Math.abs(x + expected.ox)).toBeLessThan(1e-9);
        expect(Math.abs(y + expected.oy)).toBeLessThan(1e-9);
    });

    test('orders the boxes of the stack figure back to front', () => {
        const boxes = [
            { name: 'w0', x: 200, y: 0, z: 0, w: 180, d: 160, h: 6, r: 6 },
            { name: 'w1', x: 200, y: 0, z: 36, w: 180, d: 160, h: 6, r: 6 },
            { name: 'w2', x: 200, y: 0, z: 72, w: 180, d: 160, h: 6, r: 6 },
            { name: 'interp', x: 200, y: 0, z: 112, w: 180, d: 160, h: 8, r: 6 },
            { name: 'sup', x: 200, y: 0, z: 164, w: 84, d: 160, h: 6, r: 6 },
            { name: 'rpc', x: 296, y: 0, z: 164, w: 84, d: 160, h: 6, r: 6 },
            { name: 'c0', x: 0, y: 220, z: 113, w: 170, d: 20, h: 6, r: 3 },
            { name: 'c1', x: 0, y: 248, z: 113, w: 170, d: 20, h: 6, r: 3 },
            { name: 'c2', x: 0, y: 276, z: 113, w: 170, d: 20, h: 6, r: 3 },
            { name: 'c3', x: 0, y: 304, z: 113, w: 170, d: 20, h: 6, r: 3 },
            { name: 'c4', x: 0, y: 332, z: 113, w: 170, d: 20, h: 6, r: 3 }
        ];

        const sorted = iso()
            .data(boxes)
            .map((box, index) => ({ name: boxes[index].name, centroid: box.centroid }))
            .sort(sort)
            .map((entry) => entry.name);

        expect(sorted).toEqual([
            'w0',
            'w1',
            'c0',
            'w2',
            'c1',
            'interp',
            'c2',
            'sup',
            'c3',
            'c4',
            'rpc'
        ]);
    });
});
