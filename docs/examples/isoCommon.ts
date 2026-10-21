import { iso3D } from '../../index';
import type { Iso3DInstance } from '../../index';

/*
 * The parts both isometric figures share: the projection, the frames of the
 * three visible faces, the detail lines and the filters of the scene.
 */

// The isometric view: the angles that map the world axes onto the 120 degree
// screen axes of a true isometric projection.
export const AX: number = Math.atan(Math.SQRT2);
export const AZ: number = Math.PI / 4;
export const SCALE: number = Math.sqrt(1.5);

/**
 * The renderer of an isometric scene.
 */
export function isoScene(): Iso3DInstance {
    return iso3D().rotateX(AX).rotateZ(AZ).scale(SCALE);
}

/**
 * The frames of the three visible faces of a box.
 */
export type IsoFaces = {
    top: (x: number, y: number, z: number) => string;
    front: (x: number, y: number, z: number) => string;
    side: (x: number, y: number, z: number) => string;
};

export function isoFaces(iso: Iso3DInstance): IsoFaces {
    const top = (x: number, y: number, z: number) =>
        iso.plane({ origin: { x, y, z }, u: { x: 1, y: 0, z: 0 }, v: { x: 0, y: 1, z: 0 } }).matrix;
    const front = (x: number, y: number, z: number) =>
        iso.plane({ origin: { x, y, z }, u: { x: 1, y: 0, z: 0 }, v: { x: 0, y: 0, z: -1 } })
            .matrix;
    const side = (x: number, y: number, z: number) =>
        iso.plane({ origin: { x, y, z }, u: { x: 0, y: -1, z: 0 }, v: { x: 0, y: 0, z: -1 } })
            .matrix;
    return { top, front, side };
}

/**
 * Repeated detail lines inside a face local group.
 */
export function slits(
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
 * The filters of the scene: a soft glow, a hard glow and the bloom.
 */
export function isoFilters(): string {
    return `<defs>
        <filter id="iso-soft" filterUnits="userSpaceOnUse" x="-2000" y="-2000" width="6000" height="6000">
          <feGaussianBlur stdDeviation="2.2" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="iso-glow" filterUnits="userSpaceOnUse" x="-2000" y="-2000" width="6000" height="6000">
          <feGaussianBlur stdDeviation="4" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="iso-bloom" filterUnits="userSpaceOnUse" x="-2000" y="-2000" width="6000" height="6000">
          <feGaussianBlur stdDeviation="9"/>
        </filter>
      </defs>`;
}

/**
 * The timing of a figure: the timers it owns and the two animations it
 * triggers.
 */
export type IsoStage = {
    after: (ms: number, fn: () => void) => void;
    replay: (el: Element | null) => void;
    flash: (el: Element | null, ms?: number) => void;
    dispose: () => void;
};

export function isoStage(): IsoStage {
    const timers: ReturnType<typeof setTimeout>[] = [];

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

    const dispose = () => timers.forEach(clearTimeout);

    return { after, replay, flash, dispose };
}

/**
 * A figure must not react while the reader types in the search field.
 */
export function isoKeyGuard(event: KeyboardEvent): boolean {
    if (event.repeat) return false;
    const target = event.target as Element | null;
    return !(target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'));
}

/**
 * The behaviour of a figure.
 */
export type IsoFigure = {
    onClick: (event: Event) => void;
    onKey: (event: KeyboardEvent) => void;
    render: () => void;
    dispose: () => void;
};

/**
 * Wires a figure to its host and returns the function that removes it.
 */
export function isoMount(host: HTMLElement, figure: IsoFigure): () => void {
    host.addEventListener('click', figure.onClick);
    window.addEventListener('keydown', figure.onKey);
    figure.render();
    return () => {
        host.removeEventListener('click', figure.onClick);
        window.removeEventListener('keydown', figure.onKey);
        figure.dispose();
        host.innerHTML = '';
    };
}
