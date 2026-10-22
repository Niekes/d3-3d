import { easeCubicInOut, interpolateNumber, range, select } from 'd3';
import { box, cubes3D, sort } from '../../index';
import type { Cube, CubeFace, Point3D } from '../../index';
import { joinFaces } from './cubeFaces';
import { rotatingFigure, turnCamera } from './rotatingFigure';

/*
 * An exploded assembly: a block of 64 cubes whose four layers move apart.
 * The explosion is an offset in the y accessor, so it happens before the
 * rotation and the layers part along the block's own axis. The id of every
 * cube rides on its eight vertices through the projection, the joins are
 * keyed by it and the elements are created once, so the selection, the click
 * target and the inspector always point at the same cube. The styles ship
 * with the module: the figure adds them to its host.
 */

const ORIGIN = { x: 480, y: 250 };
const SCALE = 46;
const START_ANGLE = Math.PI / 6;
// The cubes along every edge of the block, and the space between two layers
// when the block is fully exploded, in cube edges.
const N = 4;
const GAP = 1.2;
const DURATION = 900;

// A cube is named by how many of its faces show while the block is assembled.
const KINDS = ['core', 'face', 'edge', 'corner'];

/** One vertex of a cube: a point that carries the id and the grid position of its cube. */
type CubeVertex = Point3D & { id: string; layer: number; row: number; column: number };

/** One cube after the projection: cubes3D always sets its faces and its centroid. */
type AssemblyCube = Cube<CubeVertex> & { faces: CubeFace<CubeVertex>[]; centroid: Point3D };

/** The eight vertices of the unit cube at a grid position, in the order cubes3D expects. */
function makeCube(layer: number, row: number, column: number): CubeVertex[] {
    const id = `cube-${layer}-${row}-${column}`;
    const mid = (N - 1) / 2;
    // The screen y grows downwards, so the top layer has the smallest y and
    // a cube stands on its largest.
    return box({
        x: column - mid,
        y: mid - layer + 0.5,
        z: row - mid,
        width: 1,
        height: 1,
        depth: 1
    }).map((corner) => ({ ...corner, id, layer, row, column }));
}

/** The block, layer by layer from the bottom, then row by row, then column by column. */
const ASSEMBLY = range(N).flatMap((layer) =>
    range(N).flatMap((row) => range(N).map((column) => makeCube(layer, row, column)))
);

const cubeAt = (layer: number, row: number, column: number) =>
    ASSEMBLY[(layer * N + row) * N + column][0];

const clamp = (i: number) => Math.max(0, Math.min(N - 1, i));

/** How the keys move the selection: by layer, by row and by column. */
const STEPS: Record<string, [number, number, number]> = {
    PageUp: [1, 0, 0],
    PageDown: [-1, 0, 0],
    ArrowUp: [0, -1, 0],
    ArrowDown: [0, 1, 0],
    ArrowLeft: [0, 0, -1],
    ArrowRight: [0, 0, 1]
};

/** What the inspector says about a cube: its place in the block and how much of it shows. */
function describe(cube: CubeVertex): string {
    const exposed = [cube.layer, cube.row, cube.column].filter(
        (i) => i === 0 || i === N - 1
    ).length;
    const shows = exposed
        ? `${exposed} face${exposed > 1 ? 's' : ''} on the outside`
        : 'hidden inside the block';
    return `Layer ${cube.layer + 1} of ${N}, row ${cube.row + 1}, column ${cube.column + 1}: a ${KINDS[exposed]} cube, ${shows}.`;
}

/**
 * Mounts the figure into `host` and returns a function that removes it.
 */
export function mountExplodedCubes(host: HTMLElement): () => void {
    // The state: every source of motion writes it, and `render` reads it.
    let yaw = 0;
    let pitch = 0;
    let explode = 0;
    let selected: CubeVertex | undefined;

    /** How far a layer has moved up from its place in the block. */
    const lift = (layer: number) => (layer - (N - 1) / 2) * GAP * explode;

    const cubes = cubes3D<CubeVertex>()
        .scale(SCALE)
        .origin(ORIGIN)
        // The explosion: the accessor runs before the rotation, so the
        // layers move along the block's own axis, however it is turned.
        .y((d) => d.y - lift(d.layer));

    const { group, button } = rotatingFigure(
        host,
        'cubes',
        'A block of 64 cubes in four layers. Drag it to rotate it and click a cube to inspect it, or focus it and move the selection with the arrow keys and Page Up and Page Down.',
        (dragYaw, dragPitch) => {
            yaw = dragYaw;
            pitch = dragPitch;
            render();
        }
    );

    host.classList.add('exploded-cubes');
    host.insertAdjacentHTML(
        'beforeend',
        `<style>${STYLES}</style>
        <div class="cubes-controls">
            <label>explode <input name="explode" type="range" min="0" max="1" step="0.01" value="0"><output></output></label>
            <p class="cubes-inspector"><span aria-live="polite">Click a cube to inspect it.</span> <span></span></p>
        </div>`
    );

    const svg = select(host).select<SVGSVGElement>('svg').attr('tabindex', 0);
    const slider = host.querySelector('[name=explode]') as HTMLInputElement;
    const [named, moved] = Array.from(host.querySelectorAll<HTMLElement>('.cubes-inspector span'));

    /** Projects the block, shows the faces that face the camera and paints the cubes back to front. */
    function render(): void {
        turnCamera(cubes, yaw, pitch, { yaw: START_ANGLE, tilt: START_ANGLE });

        const cubeGroups = group
            .selectAll<SVGGElement, AssemblyCube>('g.cube')
            .data(cubes.data(ASSEMBLY) as AssemblyCube[], (d) => d[0].id)
            .join((enter) => enter.append('g').attr('class', (d) => `cube layer-${d[0].layer}`))
            .classed('is-selected', (d) => d[0].id === selected?.id)
            .sort(sort);

        // The faces of a cube that face the camera never overlap, so they
        // need no sort of their own.
        joinFaces(
            cubeGroups.selectAll<SVGPathElement, CubeFace<CubeVertex>>('path').data(
                (d) => d.faces,
                (d) => d.face
            ),
            cubes.draw
        );
    }

    /** Tells how far the layer of the selected cube has moved. */
    function showMove(): void {
        const up = selected ? lift(selected.layer) : 0;
        moved.textContent = !selected
            ? ''
            : up === 0
              ? 'In place.'
              : `Moved ${Math.abs(up).toFixed(2)} ${up > 0 ? 'up' : 'down'}.`;
    }

    /** Selects a cube, or none, and describes it. */
    function inspect(cube: CubeVertex | undefined): void {
        selected = cube;
        host.classList.toggle('has-selection', Boolean(cube));
        named.textContent = cube ? describe(cube) : 'Click a cube to inspect it.';
        showMove();
        render();
    }

    /** Sets the explosion, mirrors it on the slider and the button, and draws it. */
    function setExplode(amount: number): void {
        explode = amount;
        slider.valueAsNumber = amount;
        slider.nextElementSibling!.textContent = `${Math.round(amount * 100)}%`;
        button.text(amount < 0.5 ? 'explode' : 'assemble');
        showMove();
        render();
    }

    // The button tweens the explode amount, not the paths, so a drag during
    // the animation keeps turning the block.
    button.on('click', () => {
        const target = explode < 0.5 ? 1 : 0;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setExplode(target);
            return;
        }
        select(host)
            .transition('explode')
            .duration(DURATION)
            .ease(easeCubicInOut)
            .tween('explode', () => {
                const amount = interpolateNumber(explode, target);
                return (t) => setExplode(amount(t));
            });
    });

    slider.addEventListener('input', () => {
        select(host).interrupt('explode');
        setExplode(slider.valueAsNumber);
    });

    // The face under the pointer knows its cube: every vertex carries the id.
    // A click on the selected cube or next to the block clears the selection.
    // d3.drag swallows the click that ends a drag, so turning the block
    // never selects a cube.
    svg.on('click', (event: MouseEvent) => {
        const target = event.target as Element;
        const cube = target.matches('.face')
            ? select<Element, CubeFace<CubeVertex>>(target).datum()[0]
            : undefined;
        inspect(cube?.id === selected?.id ? undefined : cube);
    });

    // The first key selects a corner, the next ones walk from there.
    svg.on('keydown', (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            inspect(undefined);
            return;
        }
        const step = STEPS[event.key];
        if (!step) {
            return;
        }
        event.preventDefault();
        const [dl, dr, dc] = selected ? step : [0, 0, 0];
        const { layer, row, column } = selected ?? { layer: N - 1, row: 0, column: 0 };
        inspect(cubeAt(clamp(layer + dl), clamp(row + dr), clamp(column + dc)));
    });

    setExplode(0);

    return () => {
        select(host).interrupt('explode');
        host.innerHTML = '';
        host.classList.remove('exploded-cubes', 'has-selection');
    };
}

// The styles of the figure, scoped by the class of its host. VitePress puts
// the class `dark` on the root element in dark mode.
const STYLES = `
.exploded-cubes {
    --ec-ink: #1b1e21;
    --ec-button: #f0f1f1;
    --ec-line: #c4c7c9;
    --ec-bg: #ffffff;
    /* One hue per layer, from the bottom up. */
    --ec-layer-0: #2a78d6;
    --ec-layer-1: #eb6834;
    --ec-layer-2: #1baf7a;
    --ec-layer-3: #eda100;
    margin: 1.5rem 0;
    position: relative;
    overflow: hidden;
    border: 1px solid var(--ec-line);
    border-radius: 12px;
    background: var(--ec-bg);
}

.dark .exploded-cubes {
    --ec-ink: #e6e8e9;
    --ec-button: #17181a;
    --ec-line: #3d4144;
    --ec-bg: #0c0d0e;
    --ec-layer-0: #3987e5;
    --ec-layer-1: #d95926;
    --ec-layer-2: #199e70;
    --ec-layer-3: #c98500;
}

.exploded-cubes .cubes-svg {
    display: block;
    width: 100%;
    height: auto;
    cursor: grab;
    touch-action: none;
}

.exploded-cubes .cubes-svg:active {
    cursor: grabbing;
}

/* The browser rings a focused SVG on every click: keep the ring for the keyboard. */
.exploded-cubes .cubes-svg:focus {
    outline: none;
}

.exploded-cubes .cubes-svg:focus-visible {
    outline: 2px solid var(--ec-ink);
    outline-offset: -4px;
}

/* The layer picks the hue, the face its shade, so the figure never sets a fill. */
.exploded-cubes .layer-0 {
    --ec-base: var(--ec-layer-0);
}

.exploded-cubes .layer-1 {
    --ec-base: var(--ec-layer-1);
}

.exploded-cubes .layer-2 {
    --ec-base: var(--ec-layer-2);
}

.exploded-cubes .layer-3 {
    --ec-base: var(--ec-layer-3);
}

/* The glow is mixed in once per cube, so all of its faces light up together. */
.exploded-cubes .cube {
    --ec-face: color-mix(in srgb, var(--ec-base), white var(--ec-glow, 0%));
}

.exploded-cubes .face {
    fill: var(--ec-face);
    stroke: color-mix(in srgb, var(--ec-face) 50%, black);
    stroke-width: 0.75;
    stroke-linejoin: round;
}

.exploded-cubes .face-front,
.exploded-cubes .face-back {
    fill: color-mix(in srgb, var(--ec-face) 82%, black);
}

.exploded-cubes .face-left,
.exploded-cubes .face-right {
    fill: color-mix(in srgb, var(--ec-face) 66%, black);
}

.exploded-cubes .face-bottom {
    fill: color-mix(in srgb, var(--ec-face) 50%, black);
}

/* The other cubes fade, so the selected one shows through the cubes in front of it. */
.exploded-cubes.has-selection .cube:not(.is-selected) {
    opacity: var(--ec-dim, 0.25);
}

.exploded-cubes .cube.is-selected .face {
    stroke: var(--ec-ink);
    stroke-width: 2;
}

/*
 * The cube under the pointer lights up and, next to a selection, fades less.
 * Not during a drag, while the block turns under the pointer.
 */
@media (hover: hover) {
    .exploded-cubes .cubes-svg:not(:active) .cube:hover {
        --ec-glow: 25%;
        --ec-dim: 0.5;
    }
}

.exploded-cubes .cubes-button {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    padding: 0.35rem 0.9rem;
    border: 1px solid var(--ec-line);
    border-radius: 8px;
    background: var(--ec-button);
    color: var(--ec-ink);
    font-size: 0.85rem;
    cursor: pointer;
}

.exploded-cubes .cubes-button:hover {
    border-color: var(--ec-ink);
}

.exploded-cubes .cubes-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 1.5rem;
    padding: 0.75rem;
    border-top: 1px solid var(--ec-line);
    color: var(--ec-ink);
    font-size: 0.85rem;
}

.exploded-cubes .cubes-controls label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.exploded-cubes .cubes-controls output {
    min-width: 2.5em;
    font-variant-numeric: tabular-nums;
}

.exploded-cubes .cubes-inspector {
    flex: 1 1 16rem;
    margin: 0;
    /* Two lines, so a selection does not push the page down. */
    min-height: 3em;
    line-height: 1.5;
    font-variant-numeric: tabular-nums;
}
`;
