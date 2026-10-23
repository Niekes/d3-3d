import { describe, test, expect } from 'vite-plus/test';
import { axes3D } from '../index';
import type { AxesSpec } from '../index';

const SPEC: AxesSpec = {
    x: { domain: [-1, 1], ticks: [-1, -0.5, 0, 0.5, 1] },
    y: { domain: [0, 4], ticks: [0, 1, 2, 3, 4] },
    z: { domain: [-2, 2], ticks: [-2, 0, 2] }
};

// A chart view: turned by 45 degrees and looking down on the box.
const tilted = () =>
    axes3D()
        .rotateY(Math.PI / 4)
        .rotateX(-Math.PI / 6);

describe('axes3D', () => {
    test('returns the six walls, one of each opposite pair facing the camera', () => {
        const walls = tilted().data(SPEC);

        expect(walls).toHaveLength(6);
        expect(walls.filter((wall) => !wall.ccw)).toHaveLength(3);
        for (let i = 0; i < 6; i += 2) {
            expect(walls[i].ccw).not.toBe(walls[i + 1].ccw);
        }
    });

    test('the near wall faces the camera', () => {
        const walls = axes3D().rotateY(0.1).rotateX(0.1).data(SPEC);

        // The order is x lo, x hi, y lo, y hi, z lo, z hi, and a larger
        // rotated z is nearer the viewer.
        expect(walls[5].ccw).toBe(true);
        expect(walls[4].ccw).toBe(false);
    });

    test('the near wall faces the camera whatever the accessors and the domains', () => {
        const near = (walls: { ccw: boolean }[]) => [walls[4].ccw, walls[5].ccw];

        // A negated accessor mirrors the box.
        const negated = axes3D()
            .rotateY(0.1)
            .rotateX(0.1)
            .y((d) => -d.y)
            .data(SPEC);
        expect(near(negated)).toEqual([false, true]);

        // So does a reversed domain.
        const reversed = axes3D()
            .rotateY(0.1)
            .rotateX(0.1)
            .data({ ...SPEC, x: { domain: [1, -1], ticks: SPEC.x.ticks } });
        expect(near(reversed)).toEqual([false, true]);
    });

    test('half a turn around y swaps the x and the z walls', () => {
        const before = tilted().data(SPEC);
        const after = tilted()
            .rotateY(Math.PI / 4 + Math.PI)
            .data(SPEC);

        expect(after.map((wall) => wall.ccw)).toEqual([
            !before[0].ccw,
            !before[1].ccw,
            before[2].ccw,
            before[3].ccw,
            !before[4].ccw,
            !before[5].ccw
        ]);
    });

    test('names the axis and the side of every wall', () => {
        const walls = tilted().data(SPEC);

        expect(walls.map((wall) => [wall.axis, wall.side])).toEqual([
            ['x', 0],
            ['x', 1],
            ['y', 0],
            ['y', 1],
            ['z', 0],
            ['z', 1]
        ]);
        for (const wall of walls) {
            const value = SPEC[wall.axis].domain[wall.side];
            expect(wall.every((corner) => corner[wall.axis] === value)).toBe(true);
        }
    });

    test('draws the outline and one gridline per inner tick', () => {
        const box = tilted();
        const [xLo] = box.data(SPEC);

        // The x wall is spanned by y (inner ticks 1, 2, 3) and z (inner tick 0).
        expect(xLo.grid).toHaveLength(4);
        expect(xLo.centroid).toBeDefined();

        const path = box.draw(xLo);

        expect(path.match(/M/g)).toHaveLength(5);
        expect(path.indexOf('Z')).toBeLessThan(path.indexOf('M', 1));
    });

    test('puts every axis on an edge of the outline', () => {
        const box = tilted();
        const walls = box.data(SPEC);
        const edges = box.axes(SPEC);

        expect(edges.map((edge) => edge.axis)).toEqual(['x', 'y', 'z']);

        const span = { x: ['y', 'z'], y: ['z', 'x'], z: ['x', 'y'] } as const;
        const index = { x: 0, y: 2, z: 4 };

        for (const edge of edges) {
            expect(edge.map((tick) => tick[edge.axis])).toEqual(SPEC[edge.axis].ticks);

            // The two walls the edge joins: one faces the camera, one does not.
            const [b, c] = span[edge.axis];
            const wallOf = (axis: 'x' | 'y' | 'z') =>
                walls[index[axis] + (edge[0][axis] === SPEC[axis].domain[0] ? 0 : 1)];
            expect(wallOf(b).ccw).not.toBe(wallOf(c).ccw);

            // The normal is a unit vector square to the projected edge.
            const first = edge[0].projected;
            const last = edge[edge.length - 1].projected;
            const dot = edge.normal.x * (last.x - first.x) + edge.normal.y * (last.y - first.y);
            expect(Math.hypot(edge.normal.x, edge.normal.y)).toBeCloseTo(1);
            expect(dot).toBeCloseTo(0);
        }
    });

    test('prefers the edges below the box, then the ones left of it', () => {
        // Data z is up: the screen y grows downwards, so the accessor negates it.
        const [x, y, z] = tilted()
            .y((d) => -d.z)
            .z((d) => d.y)
            .axes(SPEC);

        expect(x.normal.y).toBeGreaterThan(0);
        expect(y.normal.y).toBeGreaterThan(0);
        expect(z.normal.x).toBeLessThan(0);
    });

    test('lists the four edges along every axis and marks the one it chooses', () => {
        const box = tilted();
        const edges = box.edges(SPEC);

        expect(edges.map((edge) => edge.axis).join('')).toBe('xxxxyyyyzzzz');
        expect(edges.map((edge) => edge.sides.join('')).slice(0, 4)).toEqual([
            '00',
            '01',
            '10',
            '11'
        ]);
        expect(edges.filter((edge) => edge.chosen).map((edge) => edge.axis)).toEqual([
            'x',
            'y',
            'z'
        ]);
        expect(box.axes(SPEC).every((edge) => edge.chosen)).toBe(true);
    });

    test('keeps an axis on its edge while the camera turns level with the box', () => {
        // Level, the floor and the ceiling are seen edge on and face neither way.
        const changes = { x: 0, y: 0, z: 0 };
        let last: string[] = [];
        for (let degree = 0; degree < 360; degree += 1) {
            const edges = axes3D()
                .rotateY((degree * Math.PI) / 180)
                .rotateX(0)
                .axes(SPEC);
            const now = edges.map((edge) => edge.sides.join(''));
            edges.forEach((edge, i) => {
                if (last.length && last[i] !== now[i]) changes[edge.axis] += 1;
            });
            last = now;
        }

        // An axis moves only when a wall beside it turns away; z moves once more at 360°.
        expect(changes).toEqual({ x: 2, y: 4, z: 1 });
    });
});
