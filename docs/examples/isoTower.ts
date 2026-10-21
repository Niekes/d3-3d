import { sort } from '../../index';
import type { IsoBoxSpec } from '../../index';
import {
    isoFaces,
    isoFilters,
    isoKeyGuard,
    isoMount,
    isoScene,
    isoStage,
    slits
} from './isoCommon';

/*
 * The office tower: 24 floors on a city block, a night shift that lights the
 * tower from the lobby to the spire and a blinking beacon on top.
 *
 * Unlike the exploded stack, a building cannot be sorted by the depth of
 * its centre: a floor band rests on the facade it belongs to, so the centre
 * of the band is farther away than the centre of the tower. The structure
 * is therefore drawn in the order of its parts, only the trees are sorted.
 */

const PZ = 7;
const FH = 9;
const NF = 24;
const SH = { x: 50, y: 34, w: 110, d: 80, z: 25 };
const SB = { x: 58, y: 42, w: 94, d: 64, z: 205 };
const MC = { x: 64, y: 48, w: 82, d: 52, z: 241, h: 14 };
const RZ = MC.z + MC.h;
const TREES = [
    [188, 22],
    [188, 62],
    [188, 102],
    [24, 154],
    [64, 154],
    [150, 154],
    [188, 142]
];

/**
 * A deterministic "lived in" pattern for the panes of a floor.
 */
function panePattern() {
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    return () => {
        const r = rnd();
        if (r < 0.1) return ' off';
        if (r < 0.27) return ' dim';
        if (r < 0.4) return ' hi';
        return '';
    };
}

/**
 * Mounts the figure into `host` and returns a function that removes it.
 */
export function mountIsoTower(host: HTMLElement): () => void {
    const iso = isoScene();
    const { top, front, side } = isoFaces(iso);

    // Every solid of the scene, in the order it is drawn.
    const specs: IsoBoxSpec[] = [
        { x: 0, y: 0, z: 0, w: 210, d: 180, h: PZ, r: 12 },
        { x: 54, y: 38, z: PZ, w: 102, d: 72, h: 18 },
        { x: SH.x, y: SH.y, z: SH.z, w: SH.w, d: SH.d, h: 20 * FH, r: 2 },
        { x: SB.x, y: SB.y, z: SB.z, w: SB.w, d: SB.d, h: 4 * FH, r: 1 },
        { x: MC.x, y: MC.y, z: MC.z, w: MC.w, d: MC.d, h: MC.h, r: 1 },
        { x: 70, y: 53, z: RZ, w: 16, d: 12, h: 6, r: 1 },
        { x: 100, y: 68, z: RZ, w: 8, d: 8, h: 10, r: 1 },
        { x: 122, y: 82, z: RZ, w: 18, d: 12, h: 7, r: 1 },
        { x: 76, y: 114, z: 19, w: 58, d: 14, h: 2 }
    ];
    const pilotis = [50, 77, 104, 131, 158]
        .map((x) => ({ x, y: 112, z: PZ, w: 2, d: 2, h: 18 }))
        .concat([126, 99, 72, 45].map((y) => ({ x: 158, y, z: PZ, w: 2, d: 2, h: 18 })));

    const solids = iso.data([...specs, ...pilotis]);
    const [plate, lobby, shaft, crown, mech, unitA, spire, unitB, canopy] = solids;
    const posts = solids.slice(9, 9 + pilotis.length);

    // The trees are the only parts that are sorted: the nearest one is drawn
    // last, the depth of its base decides the order.
    const treeBoxes = TREES.map(([x, y]) => {
        const box = iso.data([{ x: x - 4, y: y - 4, z: PZ, w: 8, d: 8, h: 2, r: 1 }])[0];
        return { x, y, box, centroid: box.centroid };
    }).sort(sort);

    const variant = panePattern();
    const panes = (w: number, n: number) => {
        const pitch = w / n;
        const pw = pitch - 1.6;
        let out = '';
        for (let i = 0; i < n; i++) {
            out += `<rect class="pn${variant()}" x="${(i * pitch + 0.8).toFixed(2)}" y="1.6" width="${pw.toFixed(2)}" height="${FH - 3.4}"/>`;
        }
        return out;
    };

    const floor = (i: number) => {
        const B = i <= 20 ? SH : SB;
        const zTop = i <= 20 ? SH.z + i * FH : SB.z + (i - 20) * FH;
        const fy = B.y + B.d;
        const sx = B.x + B.w;
        const nF = i <= 20 ? 14 : 12;
        const nS = i <= 20 ? 10 : 8;
        const face = (matrix: string, w: number, n: number) => `<g transform="${matrix}">
      <rect class="face band" width="${w}" height="${FH}"/>
      <rect class="halo" x="-2" y="-1" width="${w + 4}" height="${FH + 2}" filter="url(#iso-bloom)"/>
      <g class="win">${panes(w, n)}</g>
      <rect class="cur" x="-0.6" y="-0.6" width="${w + 1.2}" height="${FH + 1.2}"/>
    </g>`;
        return `<g class="fl" id="floor-${i}" data-f="${i}">${face(side(sx, fy, zTop), B.d, nS)}${face(front(B.x, fy, zTop), B.w, nF)}</g>`;
    };

    let svg = '';

    // The city block.
    svg += `<path class="face" d="${plate.wall}"/><path class="face top" d="${plate.top}"/>`;
    svg += `<g transform="${top(0, 0, PZ)}">
      <rect class="detail" x="7" y="7" width="196" height="166" rx="8"/>
      <rect class="detail" x="14" y="14" width="182" height="152" rx="4"/>
      ${slits(24, 186, 12, 128, 166)}
      ${slits(26, 118, 12, 168, 196, false)}
      ${[
          [20, 20],
          [190, 20],
          [20, 160],
          [190, 160]
      ]
          .map(
              ([x, y]) =>
                  `<circle class="face recess" cx="${x}" cy="${y}" r="2.6"/><line class="detail" x1="${x - 1.6}" y1="${y}" x2="${x + 1.6}" y2="${y}"/>`
          )
          .join('')}
    </g>`;
    svg += `<g transform="${front(0, 180, PZ)}"><text class="label" x="16" y="5.2" font-size="4" letter-spacing=".6">240 MERIDIAN · BLOCK 24</text></g>`;
    svg += `<g transform="${side(210, 180, PZ)}">${slits(120, 168, 3, 2, 5)}</g>`;

    // The recessed glass lobby.
    svg += `<path class="face" d="${lobby.wall}"/><path class="face top" d="${lobby.top}"/>`;
    const lobbyFace = (matrix: string, w: number) =>
        `<g transform="${matrix}"><g class="lobby-fx"><rect class="lobby-glass" x="2" y="2" width="${w - 4}" height="16"/></g>${slits(2 + (w - 4) / 8, w - 2 - (w - 4) / 8 + 0.01, (w - 4) / 8, 2, 18)}<line class="detail" x1="2" y1="7" x2="${w - 2}" y2="7"/></g>`;
    svg += `<g class="halo lobby-halo" filter="url(#iso-bloom)"><g transform="${front(54, 110, 25)}"><rect width="102" height="18"/></g></g>`;
    svg += lobbyFace(side(156, 110, 25), 72);
    svg += lobbyFace(front(54, 110, 25), 102);
    svg += `<g transform="${front(54, 110, 25)}"><rect class="lobby-door" x="41" y="8" width="20" height="10"/><line class="detail" x1="51" y1="8" x2="51" y2="18"/></g>`;
    for (const post of posts) {
        svg += `<path class="face" d="${post.wall}"/><path class="face top" d="${post.top}"/>`;
    }

    // The shaft with its floors, the setback crown with its floors.
    svg += `<path class="face" d="${shaft.wall}"/><path class="face top" d="${shaft.top}"/>`;
    svg += `<g transform="${top(SH.x, SH.y, SH.z + 20 * FH)}"><rect class="detail" x="3" y="3" width="${SH.w - 6}" height="${SH.d - 6}" rx="1"/></g>`;
    for (let i = 1; i <= 20; i++) svg += floor(i);
    svg += `<path class="face" d="${crown.wall}"/><path class="face top" d="${crown.top}"/>`;
    for (let i = 21; i <= 24; i++) svg += floor(i);
    svg += `<g transform="${top(SB.x, SB.y, SB.z + 4 * FH)}"><rect class="detail" x="2.5" y="2.5" width="${SB.w - 5}" height="${SB.d - 5}"/></g>`;

    // The mechanical floor, the rooftop units and the spire.
    svg += `<path class="face" d="${mech.wall}"/><path class="face top" d="${mech.top}"/>`;
    svg += `<g transform="${front(MC.x, MC.y + MC.d, RZ)}">${slits(2.5, 11.5, 1.8, 3, MC.w - 3, false)}</g>`;
    svg += `<g transform="${side(MC.x + MC.w, MC.y + MC.d, RZ)}">${slits(2.5, 11.5, 1.8, 3, MC.d - 3, false)}</g>`;
    svg += `<g transform="${top(MC.x, MC.y, RZ)}"><rect class="detail" x="2" y="2" width="${MC.w - 4}" height="${MC.d - 4}"/></g>`;
    svg += `<path class="face" d="${unitA.wall}"/><path class="face top" d="${unitA.top}"/>`;
    svg += `<g transform="${top(70, 53, RZ + 6)}"><circle class="detail" cx="8" cy="6" r="4"/></g>`;
    svg += `<path class="face" d="${spire.wall}"/><path class="face top" d="${spire.top}"/>`;
    svg += `<path class="mast" d="${iso.path([
        { x: 104, y: 72, z: RZ + 10 },
        { x: 104, y: 72, z: 334 }
    ])}"/>`;
    svg += `<path class="mast" d="${iso.path([
        { x: 101, y: 72, z: 290 },
        { x: 107, y: 72, z: 290 }
    ])}"/>`;
    svg += `<path class="mast" d="${iso.path([
        { x: 104, y: 69, z: 305 },
        { x: 104, y: 75, z: 305 }
    ])}"/>`;
    const beacon = iso.project([{ x: 104, y: 72, z: 336 }])[0];
    svg += `<circle class="beacon-halo" cx="${beacon.x}" cy="${beacon.y}" r="7" filter="url(#iso-bloom)"/><circle class="beacon" filter="url(#iso-glow)" cx="${beacon.x}" cy="${beacon.y}" r="2.2"/>`;
    svg += `<path class="face" d="${unitB.wall}"/><path class="face top" d="${unitB.top}"/>`;
    svg += `<g transform="${front(122, 94, RZ + 7)}">${slits(3, 15, 2, 1.5, 5.5)}</g>`;

    // The canopy over the entrance.
    svg += `<path class="face" d="${canopy.wall}"/><path class="face top" d="${canopy.top}"/>`;
    svg += `<g transform="${front(76, 128, 21)}"><text class="label" x="18" y="1.7" font-size="1.9" letter-spacing=".4">MERIDIAN</text></g>`;

    // The street trees, the nearest one last.
    for (const tree of treeBoxes) {
        svg += `<path class="face" d="${tree.box.wall}"/><path class="face top" d="${tree.box.top}"/>`;
        svg += `<path class="mast" d="${iso.path([
            { x: tree.x, y: tree.y, z: PZ + 2 },
            { x: tree.x, y: tree.y, z: PZ + 14 }
        ])}"/>`;
        const crownPoint = iso.project([{ x: tree.x, y: tree.y, z: PZ + 20 }])[0];
        svg += `<circle class="face" cx="${crownPoint.x}" cy="${crownPoint.y}" r="8.5"/><circle class="detail" cx="${crownPoint.x - 1.5}" cy="${crownPoint.y - 1.5}" r="4.5"/>`;
    }

    const frame = iso.frame(
        [
            { x: 0, y: 180, z: 0 },
            { x: 210, y: 0, z: PZ },
            { x: 210, y: 180, z: 0 },
            { x: 0, y: 0, z: PZ },
            { x: 104, y: 72, z: 340 },
            { x: 50, y: 114, z: 205 },
            { x: 160, y: 34, z: 205 }
        ],
        0.06
    );

    host.innerHTML = `<svg class="iso-svg" viewBox="${frame.viewBox}" role="img"
      aria-label="Isometric modernist office tower with 24 floors on a city block.">
      ${isoFilters()}
      ${svg}
    </svg>`;

    return wire(host);
}

/**
 * The interaction: a floor lights up, the cursor walks the floors and the
 * night shift lights the tower from the lobby to the spire.
 */
function wire(host: HTMLElement): () => void {
    const state = { lit: new Array(NF + 1).fill(false), cursor: 1 };
    const stage = isoStage();
    const query = <T extends Element>(selector: string) => host.querySelector<T>(selector);
    const floors = Array.from({ length: NF }, (_, i) => query(`#floor-${i + 1}`));
    const lobbyHalo = query('.lobby-halo');

    const { after } = stage;

    const render = () => {
        let n = 0;
        for (let i = 1; i <= NF; i++) {
            floors[i - 1]?.classList.toggle('on', state.lit[i]);
            floors[i - 1]?.classList.toggle('cursor', state.cursor === i);
            if (state.lit[i]) n += 1;
        }
        host.classList.toggle('lit', n > 0);
        lobbyHalo?.classList.toggle('hot', n > 0);
    };

    const stopCascade = () => {
        stage.dispose();
    };

    const toggle = (i: number) => {
        state.lit[i] = !state.lit[i];
        state.cursor = i;
        render();
    };

    const move = (d: number) => {
        state.cursor = Math.max(1, Math.min(NF, state.cursor + d));
        render();
    };

    // Lights cascade lobby to crown, or crown to lobby.
    const cascade = (on: boolean, upto = NF, step = 80) => {
        stopCascade();
        const order = [];
        for (let i = 1; i <= upto; i++) order.push(i);
        if (!on) order.reverse();
        order.forEach((f, k) =>
            after(k * step, () => {
                state.lit[f] = on;
                render();
            })
        );
        render();
    };

    const onClick = (event: Event) => {
        const floor = (event.target as Element).closest('.fl');
        if (floor) toggle(Number(floor.getAttribute('data-f')));
    };

    const onKey = (event: KeyboardEvent) => {
        if (!isoKeyGuard(event)) return;
        if (event.key === 'ArrowUp') {
            move(1);
            return;
        }
        if (event.key === 'ArrowDown') {
            move(-1);
            return;
        }
        if (event.key === ' ' || event.key === 'Enter') {
            toggle(state.cursor);
            return;
        }
        if (event.key === 'n' || event.key === 'N') cascade(true);
        if (event.key === 'o' || event.key === 'O') cascade(false);
    };

    return isoMount(host, { onClick, onKey, render, dispose: stage.dispose });
}
