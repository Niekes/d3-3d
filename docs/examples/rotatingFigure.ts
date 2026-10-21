import { drag, select } from 'd3';
import type { DragBehavior, Selection } from 'd3';

/*
 * The scaffold both rotating figures share: an SVG that turns on drag and an
 * update button. The pointer distance becomes a yaw and a pitch, and the
 * distance of a finished drag is kept for the next one.
 */

const DRAG_FACTOR = Math.PI / 230;

function dragRotate(
    onRotate: (yaw: number, pitch: number) => void
): DragBehavior<SVGSVGElement, unknown, unknown> {
    let startX = 0;
    let startY = 0;
    let keptX = 0;
    let keptY = 0;

    return drag<SVGSVGElement, unknown>()
        .on('start', (event) => {
            startX = event.x;
            startY = event.y;
        })
        .on('drag', (event) => {
            onRotate(
                (event.x - startX + keptX) * DRAG_FACTOR,
                (event.y - startY + keptY) * DRAG_FACTOR
            );
        })
        .on('end', (event) => {
            keptX += event.x - startX;
            keptY += event.y - startY;
        });
}

/**
 * Renders the SVG and the button into `host`, with the classes
 * `<prefix>-svg` and `<prefix>-button`, and returns the group to draw into
 * and the button.
 */
export function rotatingFigure(
    host: HTMLElement,
    prefix: string,
    label: string,
    onRotate: (yaw: number, pitch: number) => void
): {
    group: Selection<SVGGElement, unknown, null, undefined>;
    button: Selection<HTMLButtonElement, unknown, null, undefined>;
} {
    host.innerHTML = `
        <svg class="${prefix}-svg" viewBox="0 0 960 500" role="img" aria-label="${label}"></svg>
        <button class="${prefix}-button" type="button">update</button>`;

    const svg = select(host).select<SVGSVGElement>('svg').call(dragRotate(onRotate));

    return {
        group: svg.append('g'),
        button: select(host).select<HTMLButtonElement>('button')
    };
}
