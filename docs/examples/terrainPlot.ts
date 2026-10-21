/// <reference types="vite/client" />
import {
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
import './terrainPlot.css';

/*
 * A terrain plot: the surface figure of the surface plot with controls. The
 * sliders reshape the terrain, the picker swaps the color ramp, the checkbox
 * strips the surface down to a wireframe and the tooltip reads the sample
 * under the pointer.
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

/** The terrain: a sine along x times a cosine along z, `amplitude` high. */
function terrain(amplitude: number, frequency: number): (x: number, z: number) => number {
    return (x, z) => amplitude * Math.sin(frequency * x) * Math.cos(frequency * z);
}

/**
 * Mounts the figure into `host` and returns a function that removes it.
 */
export function mountTerrainPlot(host: HTMLElement): () => void {
    // The whole amplitude range, not the current samples, so a low terrain
    // stays in the middle of the ramp.
    const colorScale = scaleLinear<number, number>().domain([-MAX_AMPLITUDE, MAX_AMPLITUDE]);

    const { group, button, show } = surfaceFigure(
        host,
        'terrain',
        'A terrain plot. Drag the figure to rotate it.',
        (height) => RAMPS[ramp.value](colorScale(height))
    );

    host.insertAdjacentHTML(
        'beforeend',
        `<div class="terrain-controls">
            <label>amplitude <input name="amplitude" type="range" min="0" max="${MAX_AMPLITUDE}" step="0.5" value="6"><output></output></label>
            <label>frequency <input name="frequency" type="range" min="${MIN_FREQUENCY}" max="${MAX_FREQUENCY}" step="0.01" value="0.3"><output></output></label>
            <label>colors <select name="ramp">${Object.keys(RAMPS)
                .map((name) => `<option>${name}</option>`)
                .join('')}</select></label>
            <label><input name="wireframe" type="checkbox"> wireframe</label>
        </div>
        <div class="terrain-tooltip" hidden></div>`
    );

    const amplitude = host.querySelector('[name=amplitude]') as HTMLInputElement;
    const frequency = host.querySelector('[name=frequency]') as HTMLInputElement;
    const ramp = host.querySelector('[name=ramp]') as HTMLSelectElement;
    const wireframe = host.querySelector('[name=wireframe]') as HTMLInputElement;
    const tooltip = host.querySelector('.terrain-tooltip') as HTMLElement;

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

    /** Samples the terrain the sliders describe and draws it. */
    function update(duration?: number): void {
        for (const input of [amplitude, frequency]) {
            input.nextElementSibling!.textContent = input.value;
        }
        show(sample(terrain(amplitude.valueAsNumber, frequency.valueAsNumber)), duration);
    }

    amplitude.addEventListener('input', () => update(0));
    frequency.addEventListener('input', () => update(0));
    ramp.addEventListener('change', () => update(0));
    wireframe.addEventListener('change', () =>
        host.classList.toggle('is-wireframe', wireframe.checked)
    );
    group.on('pointermove', showTooltip).on('pointerleave', () => {
        tooltip.hidden = true;
    });

    button.on('click', () => {
        amplitude.valueAsNumber = randomUniform(1, MAX_AMPLITUDE)();
        frequency.valueAsNumber = randomUniform(MIN_FREQUENCY, MAX_FREQUENCY)();
        update();
    });

    update();

    return () => {
        host.innerHTML = '';
    };
}
