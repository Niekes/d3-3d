import { iso3D, sort } from '../../index';
import type { IsoBox, IsoBoxSpec } from '../../index';

/*
 * The system stack: five language cartridges wired to an input interpreter
 * above three worker slabs, topped by a supervisor and a service.
 *
 * The whole scene is static. It is built once, the interaction only toggles
 * classes, so a running figure costs nothing.
 */

// The isometric view: the angles that map the world axes onto the 120 degree
// screen axes of a true isometric projection.
const AX = Math.atan(Math.SQRT2);
const AZ = Math.PI / 4;
const SCALE = Math.sqrt(1.5);

// The scene, in world units.
const SX = 200;
const SY = 0;
const SW = 180;
const SD = 160;
const SF = SY + SD;
const WZ = [0, 36, 72];
const WH = 6;
const IZ = 112;
const IH = 8;
const TZ = 164;
const TH = 6;
const CX = 0;
const CL = 170;
const CW = 20;
const CZ = 113;
const CH = 6;
const WIREZ = 116;
const R = 9;

const LANGS = ['java', 'go', 'c++', 'rust', 'python'];
const NAMES = ['Java', 'Go', 'C++', 'Rust', 'Python'];

const cartY = (i: number) => 220 + 28 * i;
const portX = (i: number) => 220 + 30 * i;

const SOLIDS: IsoBoxSpec[] = [
    ...WZ.map((z) => ({ x: SX, y: SY, z, w: SW, d: SD, h: WH, r: 6 })),
    { x: SX, y: SY, z: IZ, w: SW, d: SD, h: IH, r: 6 },
    { x: SX, y: SY, z: TZ, w: 84, d: SD, h: TH, r: 6 },
    { x: SX + 96, y: SY, z: TZ, w: 84, d: SD, h: TH, r: 6 },
    ...LANGS.map((_, i) => ({ x: CX, y: cartY(i), z: CZ, w: CL, d: CW, h: CH, r: 3 }))
];

const CORNERS = [
    { x: SX, y: SY, z: TZ + TH },
    { x: SX + SW, y: SY, z: TZ + TH },
    { x: SX + SW, y: SF, z: -30 },
    { x: SX, y: SF, z: -30 },
    { x: CX, y: cartY(0), z: CZ + CH },
    { x: CX, y: cartY(4) + CW, z: CZ },
    { x: CX + CL, y: cartY(4) + CW, z: CZ }
];

/**
 * Repeated detail lines inside a face local group.
 */
function slits(
    a0: number,
    a1: number,
    step: number,
    b0: number,
    b1: number,
    vertical = true
): string {
    let out = '';
    for (let a = a0; a <= a1 + 1e-6; a += step) {
        out += vertical
            ? `<line class="detail" x1="${a}" y1="${b0}" x2="${a}" y2="${b1}"/>`
            : `<line class="detail" x1="${b0}" y1="${a}" x2="${b1}" y2="${a}"/>`;
    }
    return out;
}

/**
 * The path of a wire: from the side of a cartridge to the front of the
 * interpreter, with a rounded corner.
 */
function wirePoints(i: number) {
    const y = cartY(i) + CW / 2;
    const x = portX(i);
    const points = [
        { x: CX + CL, y, z: WIREZ },
        { x: x - R, y, z: WIREZ }
    ];
    for (let t = 1; t <= 8; t += 1) {
        const a = (t / 8) * (Math.PI / 2);
        points.push({
            x: x - R + R * Math.sin(a),
            y: y - R + R * Math.cos(a),
            z: WIREZ
        });
    }
    points.push({ x, y: SF, z: WIREZ });
    return points;
}

/**
 * Mounts the figure into `host` and returns a function that removes it.
 */
export function mountIsoStack(host: HTMLElement): () => void {
    const iso = iso3D().rotateX(AX).rotateZ(AZ).scale(SCALE);
    const boxes = iso.data(SOLIDS);
    const sorted = SOLIDS.map((spec, index) => ({
        spec,
        box: boxes[index],
        centroid: boxes[index].centroid
    })).sort(sort);

    const frame = iso.frame(CORNERS);
    const top = (x: number, y: number, z: number) =>
        iso.plane({ origin: { x, y, z }, u: { x: 1, y: 0, z: 0 }, v: { x: 0, y: 1, z: 0 } }).matrix;
    const front = (x: number, y: number, z: number) =>
        iso.plane({ origin: { x, y, z }, u: { x: 1, y: 0, z: 0 }, v: { x: 0, y: 0, z: -1 } })
            .matrix;
    const side = (x: number, y: number, z: number) =>
        iso.plane({ origin: { x, y, z }, u: { x: 0, y: -1, z: 0 }, v: { x: 0, y: 0, z: -1 } })
            .matrix;

    let svg = '';

    // The shadow of the stack on the ground.
    svg += `<g transform="${top(SX - 10, SY - 10, -30)}">
      <rect class="shadow" width="${SW + 20}" height="${SD + 20}" rx="12"/>
      <rect class="shadow" x="10" y="10" width="${SW}" height="${SD}" rx="6" opacity=".5"/>
    </g>`;

    // The dashed leaders that show the exploded distance between the layers.
    const lead = (z0: number, z1: number) =>
        `<path class="detail lead" d="${iso.path([
            { x: SX + SW, y: SF, z: z0 },
            { x: SX + SW, y: SF, z: z1 }
        ])}"/>`;
    svg += lead(-30, WZ[0]);
    for (let k = 0; k < WZ.length; k += 1) {
        svg += lead(WZ[k] + WH, k < 2 ? WZ[k + 1] : IZ);
    }
    svg += lead(IZ + IH, TZ);

    // The slabs, back to front.
    for (const entry of sorted) {
        const { spec, box } = entry;
        if (spec.z === CZ) {
            svg += cartridge(spec, box, top, side);
            continue;
        }
        if (spec.z === IZ) {
            svg += interpreter(box, top, front);
            continue;
        }
        if (spec.z === TZ) {
            svg += slab(spec, box, top);
            continue;
        }
        svg += worker(spec, box, top, front);
    }

    // The wires sit on top of everything, they connect the two halves.
    for (let i = 0; i < LANGS.length; i += 1) {
        const d = iso.path(wirePoints(i));
        svg += `<path class="wire-under" d="${d}"/>
      <path class="wire" id="wire-${i}" d="${d}"/>
      <path class="pulse" id="pulse-${i}" filter="url(#iso-soft)" pathLength="1000" d="${d}"/>`;
    }

    host.innerHTML = `<svg class="iso-svg" viewBox="${frame.viewBox}" role="img"
      aria-label="Exploded isometric architecture: five language cartridges wired to an
      input interpreter above three worker slabs, topped by a supervisor and a service.">
      <defs>
        <filter id="iso-soft" filterUnits="userSpaceOnUse" x="-2000" y="-2000" width="6000" height="6000">
          <feGaussianBlur stdDeviation="2.2" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="iso-bloom" filterUnits="userSpaceOnUse" x="-2000" y="-2000" width="6000" height="6000">
          <feGaussianBlur stdDeviation="9"/>
        </filter>
      </defs>
      ${svg}
    </svg>`;

    return wire(host);
}

function worker(
    spec: IsoBoxSpec,
    box: IsoBox,
    top: (x: number, y: number, z: number) => string,
    front: (x: number, y: number, z: number) => string
): string {
    const k = WZ.indexOf(spec.z);
    return `<g class="slab worker" id="worker-${k}">
    <g transform="${top(spec.x, spec.y, spec.z + spec.h)}">
      <rect class="halo" x="-6" y="-6" width="${spec.w + 12}" height="${spec.d + 12}" rx="10" filter="url(#iso-bloom)"/>
    </g>
    <path class="face" d="${box.wall}"/>
    <path class="face top" d="${box.top}"/>
    <g transform="${top(spec.x, spec.y, spec.z + spec.h)}">
      <rect class="detail" x="5" y="5" width="${spec.w - 10}" height="${spec.d - 10}" rx="3"/>
      <text class="label" x="12" y="${spec.d - 12}" font-size="8.5" letter-spacing="1.2">WORKER ${k + 1}</text>
      ${slits(spec.w - 60, spec.w - 14, 4, spec.d - 22, spec.d - 11)}
    </g>
    <g transform="${front(spec.x, spec.y + spec.d, spec.z + spec.h)}">${slits(12, 60, 4, 1.6, spec.h - 1.6)}</g>
  </g>`;
}

function interpreter(
    box: IsoBox,
    top: (x: number, y: number, z: number) => string,
    front: (x: number, y: number, z: number) => string
): string {
    return `<g class="slab interp" id="interp">
    <path class="face" d="${box.wall}"/>
    <path class="face top" d="${box.top}"/>
    <g transform="${top(SX, SY, IZ + IH)}">
      <rect class="detail" x="5" y="5" width="${SW - 10}" height="${SD - 10}" rx="3"/>
      <text class="label" x="12" y="${SD - 13}" font-size="9" letter-spacing="1.4">INPUT INTERPRETER</text>
    </g>
    <g transform="${front(SX, SF, IZ + IH)}">${LANGS.map(
        (_, i) =>
            `<rect class="face recess" x="${portX(i) - SX - 4}" y="2" width="8" height="${IH - 4}" rx="1"/>`
    ).join('')}</g>
  </g>`;
}

function slab(
    spec: IsoBoxSpec,
    box: IsoBox,
    top: (x: number, y: number, z: number) => string
): string {
    const name = spec.x === SX ? 'SUPERVISOR' : 'SERVICE RPC';
    const id = spec.x === SX ? 'sup' : 'rpc';
    return `<g class="slab" id="${id}">
    <path class="face" d="${box.wall}"/>
    <path class="face top" d="${box.top}"/>
    <g transform="${top(spec.x, spec.y, spec.z + spec.h)}">
      <rect class="detail" x="5" y="5" width="${spec.w - 10}" height="${spec.d - 10}" rx="3"/>
      <text class="label" x="${spec.w / 2}" y="${spec.d / 2 + 3}" font-size="8.5" letter-spacing="1"
        text-anchor="middle">${name}</text>
      ${slits(14, 70, 4, spec.d - 26, spec.d - 14)}
    </g>
  </g>`;
}

function cartridge(
    spec: IsoBoxSpec,
    box: IsoBox,
    top: (x: number, y: number, z: number) => string,
    side: (x: number, y: number, z: number) => string
): string {
    const i = Math.round((spec.y - cartY(0)) / 28);
    return `<g class="press cart" id="cart-${i}" data-i="${i}">
    <path class="face" d="${box.wall}"/>
    <path class="face top" d="${box.top}"/>
    <g transform="${top(spec.x, spec.y, spec.z + spec.h)}">
      <rect class="face recess" x="6" y="6" width="8" height="8" rx="4"/>
      <text class="label" x="22" y="13.4" font-size="8" letter-spacing="1">${NAMES[i]}</text>
      <text class="cnt" id="count-${i}" x="${spec.w - 66}" y="13.2" font-size="6" text-anchor="end">0</text>
      ${slits(spec.w - 58, spec.w - 18, 2.5, 4, spec.d - 4)}
      ${slits(4, spec.d - 4, 2.5, spec.w - 58, spec.w - 18, false)}
      <rect class="scr-accent" filter="url(#iso-soft)" x="${spec.w - 12}" y="6" width="5" height="8" rx="1"/>
    </g>
    <g transform="${side(spec.x + spec.w, spec.y + spec.d, spec.z + spec.h)}">
      <rect class="face recess" x="${spec.d / 2 - 3}" y="1.5" width="6" height="3" rx="1"/>
    </g>
  </g>`;
}

/**
 * The interaction: a request runs down the wire, the interpreter picks it
 * up, a worker takes it and the service answers.
 */
function wire(host: HTMLElement): () => void {
    const state = {
        total: 0,
        per: [0, 0, 0, 0, 0],
        next: 0,
        wire: [0, 0, 0, 0, 0],
        interp: 0,
        worker: [0, 0, 0],
        resp: 0,
        last: ''
    };
    const timers: ReturnType<typeof setTimeout>[] = [];

    const query = <T extends Element>(selector: string) => host.querySelector<T>(selector);

    const carts = LANGS.map((_, i) => query(`#cart-${i}`));
    const wires = LANGS.map((_, i) => query(`#wire-${i}`));
    const pulses = LANGS.map((_, i) => query(`#pulse-${i}`));
    const counts = LANGS.map((_, i) => query(`#count-${i}`));
    const workers = WZ.map((_, k) => query(`#worker-${k}`));
    const interp = query('#interp');
    const sup = query('#sup');
    const rpc = query('#rpc');

    const after = (ms: number, fn: () => void) => {
        timers.push(setTimeout(fn, ms));
    };

    const replay = (el: Element | null) => {
        if (!el) return;
        el.classList.remove('go');
        void el.getBoundingClientRect();
        el.classList.add('go');
    };

    const flash = (el: Element | null, ms = 160) => {
        if (!el) return;
        el.classList.add('down', 'lit');
        after(110, () => el.classList.remove('down'));
        after(ms, () => el.classList.remove('lit'));
    };

    const render = () => {
        wires.forEach((w, i) => w?.classList.toggle('hot', state.wire[i] > 0));
        counts.forEach((c, i) => {
            if (!c) return;
            c.textContent = String(state.per[i]);
            c.classList.toggle('hot', state.wire[i] > 0);
        });
        interp?.classList.toggle('hot', state.interp > 0);
        workers.forEach((w, k) => {
            w?.classList.toggle('on', state.worker[k] > 0);
            w?.querySelector('.halo')?.classList.toggle('hot', state.worker[k] > 0);
        });
        sup?.classList.toggle('on', state.resp > 0);
        rpc?.classList.toggle('on', state.resp > 0);
    };

    const send = (i: number) => {
        const w = state.next;
        state.next = (state.next + 1) % WZ.length;
        state.total += 1;
        state.per[i] += 1;
        state.last = `${NAMES[i]} to worker ${w + 1}`;
        flash(carts[i], 260);
        state.wire[i] += 1;
        replay(pulses[i]);
        render();
        after(560, () => {
            state.interp += 1;
            render();
        });
        after(700, () => {
            state.worker[w] += 1;
            render();
        });
        after(900, () => {
            state.wire[i] -= 1;
            render();
        });
        after(1900, () => {
            state.worker[w] -= 1;
            state.interp -= 1;
            state.resp += 1;
            render();
            after(320, () => {
                state.resp -= 1;
                render();
            });
        });
    };

    const onClick = (event: Event) => {
        const cart = (event.target as Element).closest('.cart');
        if (cart) send(Number(cart.getAttribute('data-i')));
    };

    const onKey = (event: KeyboardEvent) => {
        if (event.repeat) return;
        const target = event.target as Element | null;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
        const n = Number(event.key);
        if (n >= 1 && n <= LANGS.length) send(n - 1);
    };

    host.addEventListener('click', onClick);
    window.addEventListener('keydown', onKey);
    render();

    return () => {
        host.removeEventListener('click', onClick);
        window.removeEventListener('keydown', onKey);
        timers.forEach(clearTimeout);
        host.innerHTML = '';
    };
}
