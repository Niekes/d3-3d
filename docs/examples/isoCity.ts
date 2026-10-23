import { randomInt, randomLcg, range } from 'd3';
import { sort } from '../../index';
import type { IsoBox, IsoBoxSpec, IsoPlane, Point3D } from '../../index';
import { isoFilters, isoScene } from './isoCommon';
import './isoCity.css';

/*
 * A neon city at night: five streets of five lots, every building a stack
 * of iso3D boxes. iso3D hands back the frame of every visible face of a
 * box, so the top, the left and the right face each get their own shade,
 * and the windows are plain rectangles drawn in those frames. The traffic
 * is a dash that CSS runs along the streets.
 */

// The lots along every street, the size of a lot, the width of a street and
// the height of the block and the sidewalk, in world units. z points up.
const N = 5;
const LOT = 24;
const STREET = 10;
const PITCH = LOT + STREET;
const SIZE = N * PITCH + STREET;
const PLATE = 4;
const CURB = 1;
const GROUND = PLATE + CURB;
const STOREY = 4;
const MAST = 12;

// The city, street by street: s is a shop, m a mid-rise, t a tower and p a
// park, so the towers make a downtown in the middle.
const LAYOUT = ['smspm', 'mtmts', 'pttms', 'smtmp', 'mspsm'];
// The neon hues, hue-0 to hue-4 in the stylesheet.
const HUES = 5;
// Where the trees of a park stand on its lot.
const TREES = [
    [3, 3],
    [14, 2],
    [8, 11],
    [17, 14],
    [3, 17]
];

// The city is random, but seeded, so it is the same on every load.
const random = randomLcg(11);
const int = randomInt.source(random);

/** One box of a building: its body has windows, a unit or a sign has none. */
type Piece = IsoBoxSpec & { part: 'body' | 'unit' | 'sign' };

/** A building on its lot, the pieces from the bottom up. */
function pieces(kind: string, x: number, y: number): Piece[] {
    const block = (inset: number, z: number, floors: number): Piece => ({
        x: x + inset,
        y: y + inset,
        z,
        w: LOT - 2 * inset,
        d: LOT - 2 * inset,
        h: floors * STOREY,
        part: 'body'
    });
    if (kind === 's') {
        // A low shop with a billboard along its front edge.
        const body = block(3, GROUND, int(2, 4)());
        const z = body.z + body.h;
        return [
            body,
            {
                x: x + 5,
                y: y + LOT - 5,
                z,
                w: LOT - 10,
                d: 1,
                h: 4,
                part: 'sign'
            }
        ];
    }
    if (kind === 'm') {
        // A mid-rise with a unit on its roof.
        const body = block(2, GROUND, int(5, 10)());
        const z = body.z + body.h;
        return [body, { x: x + 5, y: y + 5, z, w: 7, d: 5, h: 3, part: 'unit' }];
    }
    // A tower with a set-back top.
    const base = block(2, GROUND, int(10, 17)());
    return [base, block(5, base.z + base.h, int(4, 9)())];
}

/** The windows of a wall: one row per storey, most of them lit. */
function panes(w: number, h: number): string {
    const cols = Math.floor(w / 4);
    const pitch = w / cols;
    return range(Math.floor(h / STOREY))
        .flatMap((row) =>
            range(cols).map((col) => {
                const r = random();
                const state = r < 0.35 ? 'off' : r < 0.55 ? 'warm' : 'on';
                return `<rect class="pane ${state}" x="${(col + 0.25) * pitch}" y="${row * STOREY + 1}" width="${pitch / 2}" height="${STOREY / 2}"/>`;
            })
        )
        .join('');
}

/** A face: a wall in the frame iso3D hands back, and the windows on it. */
function face(plane: IsoPlane, w: number, h: number, side: string, windows: boolean): string {
    return `<g transform="${plane.matrix}"><rect class="${side}" width="${w}" height="${h}"/>${windows ? panes(w, h) : ''}</g>`;
}

/** A box: the left face, the right face, then the top over both. */
function solid(spec: IsoBoxSpec, box: IsoBox, windows = false): string {
    return (
        face(box.frontPlane, spec.w, spec.h, 'left', windows) +
        face(box.sidePlane, spec.d, spec.h, 'right', windows) +
        `<path class="top" d="${box.top}"/>`
    );
}

/**
 * Mounts the figure into `host` and returns a function that removes it.
 */
export function mountIsoCity(host: HTMLElement): () => void {
    const iso = isoScene();
    // The far corner of every roof and mast: what the frame has to show.
    const tops: Point3D[] = [];

    const plateSpec = { x: 0, y: 0, z: 0, w: SIZE, d: SIZE, h: PLATE };
    const plate = solid(plateSpec, iso.data([plateSpec])[0]);

    /** A light trail on a lane: a glow and a core, with the same dash. */
    const lane = (points: Point3D[], light: string) => {
        const d = iso.path(points);
        const timing = `--t:${5 + 5 * random()}s;--d:${-10 * random()}s`;
        return `<g class="lane ${light}" style="${timing}"><path class="glow" d="${d}"/><path class="core" d="${d}"/></g>`;
    };

    // Two lanes on every street, one each way: headlights come towards the
    // camera, tail lights drive away from it.
    const lanes = range(N + 1).flatMap((k) => {
        const c = k * PITCH + STREET / 2;
        return [-2, 2].flatMap((offset) => {
            const along = [0, SIZE].map((x) => ({
                x,
                y: c + offset,
                z: PLATE
            }));
            const across = along.map((p) => ({ x: p.y, y: p.x, z: PLATE }));
            return offset < 0
                ? [lane(along, 'head'), lane(across, 'head')]
                : [lane(along.reverse(), 'tail'), lane(across.reverse(), 'tail')];
        });
    });

    /** A building: its pieces from the bottom up, a mast on a tower. */
    const building = (kind: string, x: number, y: number) => {
        const parts = pieces(kind, x, y);
        const boxes = iso.data(parts);
        let svg = parts
            .map((p, i) => `<g class="${p.part}">${solid(p, boxes[i], p.part === 'body')}</g>`)
            .join('');
        parts.forEach((p) => tops.push({ x: p.x, y: p.y, z: p.z + p.h }));
        if (kind === 't') {
            const roof = parts[parts.length - 1];
            const foot = {
                x: roof.x + roof.w / 2,
                y: roof.y + roof.d / 2,
                z: roof.z + roof.h
            };
            const tip = { ...foot, z: foot.z + MAST };
            const [light] = iso.project([tip]);
            tops.push(tip);
            svg += `<path class="mast" d="${iso.path([foot, tip])}"/>`;
            svg += `<circle class="beacon" cx="${light.x}" cy="${light.y}" r="1.6" style="animation-delay:${-2 * random()}s"/>`;
        }
        return svg;
    };

    /** A park: round trees, drawn back to front. */
    const park = (x: number, y: number) =>
        iso
            .data(
                TREES.map(([tx, ty]) => ({
                    x: x + tx,
                    y: y + ty,
                    z: GROUND,
                    w: 5,
                    d: 5,
                    h: int(4, 9)(),
                    r: 2.5
                }))
            )
            .sort(sort)
            .map(
                (tree) =>
                    `<path class="tree" d="${tree.wall}"/><path class="crown" d="${tree.top}"/>`
            )
            .join('');

    // Every lot is a sidewalk with a building or a park on it. The lots never
    // overlap, so the depth of the sidewalk orders them, and the pieces on a
    // lot stack from the bottom up.
    const lots = range(N).flatMap((row) =>
        range(N).map((col) => {
            const kind = LAYOUT[row][col];
            const x = STREET + col * PITCH;
            const y = STREET + row * PITCH;
            const padSpec = { x, y, z: PLATE, w: LOT, d: LOT, h: CURB };
            const pad = iso.data([padSpec])[0];
            const kindClass = kind === 'p' ? 'park' : `hue-${int(0, HUES)()}`;
            const content = kind === 'p' ? park(x, y) : building(kind, x, y);
            return {
                centroid: pad.centroid,
                svg: `<g class="lot ${kindClass}"><g class="pad">${solid(padSpec, pad)}</g>${content}</g>`
            };
        })
    );

    const frame = iso.frame(
        [...[0, SIZE].flatMap((x) => [0, SIZE].map((y) => ({ x, y, z: 0 }))), ...tops],
        0.05,
        16 / 10
    );

    // The traffic is flat on the street, so nothing on it ever hides a
    // building, and it is drawn under all of them.
    host.innerHTML = `<svg class="iso-svg" viewBox="${frame.viewBox}" role="img"
      aria-label="A neon city at night in isometric view: shops, mid-rises, towers and parks on five streets, with traffic running along them.">
      ${isoFilters()}
      <g class="plate">${plate}</g>
      ${lanes.join('')}
      ${lots
          .sort(sort)
          .map((lot) => lot.svg)
          .join('')}
    </svg>`;

    return () => {
        host.innerHTML = '';
    };
}
