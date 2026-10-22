import { drag, select, timer } from 'd3';
import type { DragBehavior, Selection, Timer } from 'd3';
import type { Camera3DInstance } from '../../index';

/*
 * The scaffold the rotating figures share: an SVG that turns on drag and an
 * update button. The pointer distance becomes a yaw and a pitch, and the
 * distance of a finished drag is kept for the next one. A flick keeps the
 * figure turning and lets it glide to a stop.
 */

const DRAG_FACTOR = Math.PI / 230;
/** The glide loses its speed with this time constant, in milliseconds. */
const GLIDE_DECAY = 325;
/** Below this speed, in pixels per millisecond, the figure stands still. */
const GLIDE_MIN_SPEED = 0.01;
/** A pointer that rests this long before the release has no speed left. */
const GLIDE_REST = 50;
/** A press that wanders less than this, in pixels, is a click, not a drag. */
const CLICK_DISTANCE = 4;

/**
 * The drag that turns a figure: hands `onRotate` the yaw and the pitch in
 * radians, during the drag and during the glide after a flick.
 */
export function dragRotate<E extends Element = SVGSVGElement>(
    onRotate: (yaw: number, pitch: number) => void
): DragBehavior<E, unknown, unknown> {
    let startX = 0;
    let startY = 0;
    let keptX = 0;
    let keptY = 0;

    // The pointer speed, from the last two drag events.
    let lastX = 0;
    let lastY = 0;
    let lastTime = 0;
    let speedX = 0;
    let speedY = 0;
    let glide: Timer | undefined;
    let figure: E | undefined;
    let turning = false;

    function glideFrom(release: number): void {
        const still =
            release - lastTime > GLIDE_REST || Math.hypot(speedX, speedY) < GLIDE_MIN_SPEED;

        if (still || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
        }

        let previous = 0;

        glide = timer((elapsed) => {
            // A figure that was taken off the page stops turning.
            if (!figure?.isConnected) {
                glide?.stop();
                return;
            }
            const dt = elapsed - previous;
            const decay = Math.exp(-dt / GLIDE_DECAY);
            previous = elapsed;

            keptX += speedX * dt;
            keptY += speedY * dt;
            speedX *= decay;
            speedY *= decay;
            onRotate(keptX * DRAG_FACTOR, keptY * DRAG_FACTOR);

            if (Math.hypot(speedX, speedY) < GLIDE_MIN_SPEED) {
                glide?.stop();
            }
        });
    }

    // A press that wanders a few pixels is still a click, not a drag, so a
    // shaky hand can still select what it points at. The figure does not
    // turn either: a redraw re-sorts the elements, and the browser drops the
    // click when the element it was pressed on moves in the DOM.
    return drag<E, unknown>()
        .clickDistance(CLICK_DISTANCE)
        .on('start', function (event) {
            figure = this;
            glide?.stop();
            turning = false;
            startX = lastX = event.x;
            startY = lastY = event.y;
            lastTime = event.sourceEvent.timeStamp;
            speedX = speedY = 0;
        })
        .on('drag', (event) => {
            turning ||= Math.hypot(event.x - startX, event.y - startY) > CLICK_DISTANCE;
            if (!turning) {
                return;
            }

            const dt = event.sourceEvent.timeStamp - lastTime;

            if (dt > 0) {
                speedX = (event.x - lastX) / dt;
                speedY = (event.y - lastY) / dt;
                lastX = event.x;
                lastY = event.y;
                lastTime = event.sourceEvent.timeStamp;
            }

            onRotate(
                (event.x - startX + keptX) * DRAG_FACTOR,
                (event.y - startY + keptY) * DRAG_FACTOR
            );
        })
        .on('end', (event) => {
            if (!turning) {
                return;
            }
            keptX += event.x - startX;
            keptY += event.y - startY;
            glideFrom(event.sourceEvent.timeStamp);
        });
}

/** Where a figure starts and how far it may tilt, in radians. */
export interface Turn {
    /** The turn around the vertical axis before any drag. */
    yaw?: number;
    /** The angle above the scene the camera looks down from before any drag. */
    tilt?: number;
    minTilt?: number;
    maxTilt?: number;
}

/**
 * Turns `camera` by the `yaw` and the `pitch` of `dragRotate`, from the
 * start of `turn`, and returns the tilt. Every figure turns through here,
 * so a drag turns all of them the same way: a drag down raises the tilt,
 * and the camera looks down on the scene from higher above.
 */
export function turnCamera(
    camera: Camera3DInstance,
    yaw: number,
    pitch: number,
    turn: Turn = {}
): number {
    const { minTilt = -Infinity, maxTilt = Infinity } = turn;
    const tilt = Math.max(minTilt, Math.min(maxTilt, (turn.tilt ?? 0) + pitch));
    camera.rotateY((turn.yaw ?? 0) + yaw).rotateX(-tilt);
    return tilt;
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

/**
 * Turns the button of a figure into play and pause for a d3 timer. Every
 * frame hands `step` the milliseconds since the last one. Returns `play`,
 * which starts or stops the loop; the button names what a click does next.
 */
export function playback(
    button: Selection<HTMLButtonElement, unknown, null, undefined>,
    step: (elapsed: number) => void
): (on: boolean) => void {
    let loop: Timer | undefined;
    let lastFrame = 0;

    function frame(): void {
        const now = performance.now();
        step(now - lastFrame);
        lastFrame = now;
    }

    function play(on: boolean): void {
        loop?.stop();
        loop = on ? timer(frame) : undefined;
        lastFrame = performance.now();
        button.text(on ? 'pause' : 'play');
    }

    button.on('click', () => play(!loop));

    return play;
}
