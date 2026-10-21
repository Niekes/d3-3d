import { extent, interpolateSpectral, randomUniform, scaleLinear } from 'd3';
import { sample, surfaceFigure } from './surfaceFigure';

/*
 * A surface plot: a random radial wave, sampled over the field and drawn by
 * the surface figure it shares with the terrain plot, shaded by the spectral
 * ramp at the height of each quad.
 */

/** A random radial wave: cos of the distance, with a random amplitude. */
function randomWave(): (x: number, z: number) => number {
    const amplitude = Math.floor(randomUniform(1, 12)());
    return (x, z) => Math.cos((Math.sqrt(x * x + z * z) / 5) * Math.PI) * amplitude;
}

/**
 * Mounts the figure into `host` and returns a function that removes it.
 */
export function mountSurfacePlot(host: HTMLElement): () => void {
    const colorScale = scaleLinear<number, number>();

    const { button, show } = surfaceFigure(
        host,
        'surface',
        'A surface plot of a radial wave. Drag the figure to rotate it.',
        (height) => interpolateSpectral(colorScale(height))
    );

    /** Samples a new wave, scales the color ramp to its range and draws it. */
    function update(): void {
        const points = sample(randomWave());
        colorScale.domain(extent(points, (d) => d.y) as [number, number]);
        show(points);
    }

    button.on('click', update);

    update();

    return () => {
        host.innerHTML = '';
    };
}
