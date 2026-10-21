import {
    extent,
    interpolateCividis,
    interpolateSpectral,
    interpolateTurbo,
    interpolateViridis,
    pointer,
    randomUniform,
    scaleLinear,
    select
} from 'd3';
import { sample, surfaceFigure } from './surfaceFigure';
import type { GridPlane, Point3D } from '../../index';
import './surfacePlot.css';

/*
 * A surface plot: the surface figure with controls. The pickers swap the
 * shape and the color ramp, the sliders reshape the wave, the checkboxes fit
 * the ramp to the samples and strip the surface down to a wireframe, and the
 * tooltip reads the sample under the pointer.
 */

const MAX_AMPLITUDE = 12;
const MIN_FREQUENCY = 0.05;
const MAX_FREQUENCY = 0.6;

/** The ramps of the color picker, by the name it shows. */
const RAMPS: Record<string, (t: number) => string> = {
    spectral: interpolateSpectral,
    viridis: interpolateViridis,
    turbo: interpolateTurbo,
    cividis: interpolateCividis
};

/**
 * The shapes of the shape picker, by the name it shows: a radial ripple, the
 * cosine of the distance from the centre, and a wave, a sine along x times a
 * cosine along z. Both are `amplitude` high; the phase shifts the rings and
 * the hills without changing their height or their spacing.
 */
const SHAPES: Record<
    string,
    (amplitude: number, frequency: number, phase: number) => (x: number, z: number) => number
> = {
    ripple: (amplitude, frequency, phase) => (x, z) =>
        amplitude * Math.cos(2 * frequency * Math.hypot(x, z) + phase),
    wave: (amplitude, frequency, phase) => (x, z) =>
        amplitude * Math.sin(frequency * x + phase) * Math.cos(frequency * z + phase)
};

/**
 * Mounts the figure into `host` and returns a function that removes it.
 */
export function mountSurfacePlot(host: HTMLElement): () => void {
    const colorScale = scaleLinear<number, number>();

    const { group, button, show } = surfaceFigure(
        host,
        'surface',
        'A surface plot. Drag the figure to rotate it.',
        (height) => RAMPS[ramp.value](colorScale(height))
    );

    host.insertAdjacentHTML(
        'beforeend',
        `<div class="surface-controls">
            <label>shape <select name="shape">${Object.keys(SHAPES)
                .map((name) => `<option>${name}</option>`)
                .join('')}</select></label>
            <label>amplitude <input name="amplitude" type="range" min="0" max="${MAX_AMPLITUDE}" step="0.5" value="6"><output></output></label>
            <label>frequency <input name="frequency" type="range" min="${MIN_FREQUENCY}" max="${MAX_FREQUENCY}" step="0.01" value="0.3"><output></output></label>
            <label>colors <select name="ramp">${Object.keys(RAMPS)
                .map((name) => `<option>${name}</option>`)
                .join('')}</select></label>
            <label><input name="fit" type="checkbox" checked> fit colors</label>
            <label><input name="wireframe" type="checkbox"> wireframe</label>
        </div>
        <div class="surface-tooltip" hidden></div>`
    );

    const shape = host.querySelector('[name=shape]') as HTMLSelectElement;
    const amplitude = host.querySelector('[name=amplitude]') as HTMLInputElement;
    const frequency = host.querySelector('[name=frequency]') as HTMLInputElement;
    const ramp = host.querySelector('[name=ramp]') as HTMLSelectElement;
    const fit = host.querySelector('[name=fit]') as HTMLInputElement;
    const wireframe = host.querySelector('[name=wireframe]') as HTMLInputElement;
    const tooltip = host.querySelector('.surface-tooltip') as HTMLElement;
    let phase = 0;

    /** Shows the sample at the first corner of the quad under the pointer, unless a drag is on. */
    function showTooltip(event: PointerEvent): void {
        tooltip.hidden = event.buttons !== 0;
        if (tooltip.hidden) {
            return;
        }
        const d = select<Element, GridPlane<Point3D>>(event.target as Element).datum();
        const [left, top] = pointer(event, host);
        tooltip.textContent = `x ${d[0].x}, z ${d[0].z}, y ${d[0].y.toFixed(2)}`;
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
        tooltip.classList.toggle('is-left', left > host.clientWidth / 2);
    }

    /**
     * Samples the shape the controls describe, scales the ramp, draws it and
     * hides the stale tooltip. Fitted, the ramp spans the current samples;
     * otherwise it spans the whole amplitude range, so a low wave stays in
     * the middle of the ramp.
     */
    function update(duration?: number): void {
        tooltip.hidden = true;
        for (const input of [amplitude, frequency]) {
            input.nextElementSibling!.textContent = input.value;
        }
        const points = sample(
            SHAPES[shape.value](amplitude.valueAsNumber, frequency.valueAsNumber, phase)
        );
        colorScale.domain(
            fit.checked
                ? (extent(points, (d) => d.y) as [number, number])
                : [-MAX_AMPLITUDE, MAX_AMPLITUDE]
        );
        show(points, duration);
    }

    shape.addEventListener('change', () => update());
    amplitude.addEventListener('input', () => update(0));
    frequency.addEventListener('input', () => update(0));
    ramp.addEventListener('change', () => update(0));
    fit.addEventListener('change', () => update(0));
    wireframe.addEventListener('change', () =>
        host.classList.toggle('is-wireframe', wireframe.checked)
    );
    group.on('pointermove', showTooltip).on('pointerleave', () => {
        tooltip.hidden = true;
    });

    // A new phase is new data with the amplitude and the frequency the sliders set.
    button.on('click', () => {
        phase = randomUniform(0, 2 * Math.PI)();
        update();
    });

    update();

    return () => {
        host.innerHTML = '';
    };
}
