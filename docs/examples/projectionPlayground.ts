import { select } from 'd3';
import { cubes3D, lines3D, points3D, sort } from '../../index';
import type { CubeFace, Point3D, ShapeInstance } from '../../index';

/*
 * A projection playground: one cube, its renderer call and its vertices
 * beside the SVG they project to. The sliders set the rotation, the scale,
 * the origin and the rotation center of three renderers at once, and every
 * input draws the figure, the code and the table again. The styles live in
 * this file too, so the file is all a copy needs.
 */

/** A slider: the input name, the line of the renderer call it sets and its range. */
type Control = {
    name: string;
    line: string;
    label: string;
    min: number;
    max: number;
    step: number;
    value: number;
};

const FIELDSETS: [string, Control[]][] = [
    [
        'rotation, in radians',
        ['x', 'y', 'z'].map((axis, k) => ({
            name: `rotate${axis.toUpperCase()}`,
            line: `rotate${axis.toUpperCase()}`,
            label: axis,
            min: -3.14,
            max: 3.14,
            step: 0.01,
            value: [-0.45, 0.6, 0][k]
        }))
    ],
    [
        'scale, in pixels per model unit',
        [{ name: 'scale', line: 'scale', label: '', min: 10, max: 150, step: 1, value: 70 }]
    ],
    [
        'origin, in pixels',
        [
            { name: 'originX', line: 'origin', label: 'x', min: 0, max: 480, step: 1, value: 240 },
            { name: 'originY', line: 'origin', label: 'y', min: 0, max: 400, step: 1, value: 200 }
        ]
    ],
    [
        'rotation center, in model units',
        ['x', 'y', 'z'].map((axis) => ({
            name: `center${axis.toUpperCase()}`,
            line: 'rotationCenter',
            label: axis,
            min: -2,
            max: 2,
            step: 0.1,
            value: 0
        }))
    ]
];

/** A preset: the sliders it sets, the others take their defaults, and what it shows. */
type Preset = { name: string; note: string; values: Record<string, number> };

const PRESETS: Preset[] = [
    {
        name: 'front',
        note: 'No rotation: x points right, y points down and z points at you. The projection drops z, so the cube is a square.',
        values: { rotateX: 0, rotateY: 0 }
    },
    {
        name: 'top',
        note: 'A quarter turn around x, -π/2, tips the top face towards you.',
        values: { rotateX: -1.57, rotateY: 0 }
    },
    {
        name: 'side',
        note: 'A quarter turn around y, -π/2, brings the right face to the front.',
        values: { rotateX: 0, rotateY: -1.57 }
    },
    {
        name: 'isometric',
        note: 'π/4 around y, then arctan(1/√2) ≈ 0.62 around x: the three axes come out equally short and 120° apart.',
        values: { rotateX: -0.62, rotateY: 0.79 }
    },
    {
        name: 'pixel art',
        note: 'The 2:1 isometric of pixel art is dimetric: π/6 around x makes every edge run two pixels across for one up.',
        values: { rotateX: -0.52, rotateY: 0.79 }
    },
    {
        name: 'trimetric',
        note: 'Three different angles shorten every axis by a different amount.',
        values: { rotateX: -0.3, rotateY: 0.45, rotateZ: 0.1 }
    },
    {
        name: 'rolled',
        note: 'An eighth turn around z, the axis that points at you, turns the front square into a diamond.',
        values: { rotateX: 0, rotateY: 0, rotateZ: 0.79 }
    },
    {
        name: 'close-up',
        note: 'The scale is pixels per model unit: at 110, one unit of the model is 110 pixels on the screen.',
        values: { scale: 110 }
    },
    {
        name: 'shifted',
        note: 'The origin is the pixel that model zero lands on. Moving it slides the picture without turning it.',
        values: { originX: 130, originY: 110, scale: 40 }
    },
    {
        name: 'edge hinge',
        note: 'The rotation center sits on the front right edge, which runs along y. Move rotate y and the cube swings on that edge.',
        values: { centerX: 1, centerZ: 1, originX: 170 }
    },
    {
        name: 'corner pivot',
        note: 'The rotation center sits on corner 3. Move any rotation slider: the cube turns, corner 3 stays put.',
        values: { centerX: 1, centerY: -1, centerZ: 1, originX: 170, originY: 210 }
    },
    {
        name: 'orbit',
        note: 'The rotation center sits two units behind the cube. Move rotate y and the cube circles it.',
        values: { centerZ: -2, scale: 45 }
    }
];

const NOTE = 'Pick a preset, or move a slider.';

/** The eight corners of a cube from -1 to 1, in the order cubes3D expects. */
const CUBE: Point3D[] = [
    { x: -1, y: -1, z: 1 }, // front top left
    { x: -1, y: 1, z: 1 }, // front bottom left
    { x: 1, y: 1, z: 1 }, // front bottom right
    { x: 1, y: -1, z: 1 }, // front top right
    { x: -1, y: -1, z: -1 }, // back top left
    { x: -1, y: 1, z: -1 }, // back bottom left
    { x: 1, y: 1, z: -1 }, // back bottom right
    { x: 1, y: -1, z: -1 } // back top right
];

/** The model axes, from the model origin out of the cube. */
const AXES: Point3D[][] = [
    [
        { x: 0, y: 0, z: 0 },
        { x: 1.6, y: 0, z: 0 }
    ],
    [
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 1.6, z: 0 }
    ],
    [
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 1.6 }
    ]
];

/**
 * The styles, scoped to the class the figure puts on its host. The colors
 * are custom properties, and a `.dark` ancestor, as VitePress sets it, swaps
 * them for the dark theme.
 */
const STYLE = `
    .projection-playground {
        --pp-ink: #1b1e21;
        --pp-muted: #6b7075;
        --pp-line: #c4c7c9;
        --pp-bg: #ffffff;
        --pp-button: #f0f1f1;
        --pp-face: #4c7bd9;
        --pp-accent: #d9480f;
        --pp-highlight: #fff1d6;
        --pp-x: #d6336c;
        --pp-y: #2b8a3e;
        --pp-z: #1c7ed6;
        margin: 1.5rem 0;
        overflow: hidden;
        border: 1px solid var(--pp-line);
        border-radius: 12px;
        background: var(--pp-bg);
        color: var(--pp-ink);
    }

    .dark .projection-playground {
        --pp-ink: #e6e8e9;
        --pp-muted: #9aa0a6;
        --pp-line: #3d4144;
        --pp-bg: #0c0d0e;
        --pp-button: #17181a;
        --pp-face: #74a0f0;
        --pp-accent: #ff8a4c;
        --pp-highlight: #3a2a12;
        --pp-x: #f06595;
        --pp-y: #51cf66;
        --pp-z: #4dabf7;
    }

    .projection-playground .pp-panels {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr));
    }

    .projection-playground .pp-svg {
        display: block;
        width: 100%;
        height: auto;
    }

    .projection-playground .pp-svg text {
        font-size: 11px;
    }

    .projection-playground .pp-faces path {
        fill: var(--pp-face);
        fill-opacity: 0.12;
        stroke: var(--pp-face);
        stroke-width: 1.5;
    }

    .projection-playground .axis-x {
        stroke: var(--pp-x);
        fill: var(--pp-x);
    }

    .projection-playground .axis-y {
        stroke: var(--pp-y);
        fill: var(--pp-y);
    }

    .projection-playground .axis-z {
        stroke: var(--pp-z);
        fill: var(--pp-z);
    }

    .projection-playground .pp-axes path {
        fill: none;
        stroke-width: 2;
    }

    .projection-playground .pp-axes text {
        stroke: none;
        font-size: 13px;
        font-weight: 600;
    }

    .projection-playground path.pp-origin {
        stroke: var(--pp-muted);
        stroke-width: 1.5;
    }

    .projection-playground text.pp-origin {
        fill: var(--pp-muted);
    }

    .projection-playground .pp-pivot {
        fill: var(--pp-accent);
    }

    .projection-playground .pp-vertices g {
        fill: var(--pp-ink);
    }

    .projection-playground .pp-vertices .is-active {
        fill: var(--pp-accent);
        font-weight: 600;
    }

    .projection-playground .pp-vertices .is-active circle {
        r: 6;
    }

    .projection-playground .pp-source {
        min-width: 0;
        padding: 0.75rem;
        font-size: 0.8rem;
        font-variant-numeric: tabular-nums;
    }

    .projection-playground .pp-code {
        margin: 0 0 0.75rem;
        padding: 0.5rem 0.75rem;
        overflow-x: auto;
        border-radius: 8px;
        background: var(--pp-button);
        font-size: 0.8rem;
        line-height: 1.5;
    }

    .projection-playground .pp-code span {
        display: block;
    }

    .projection-playground .pp-code .is-active,
    .projection-playground .pp-table tr.is-active td {
        background: var(--pp-highlight);
    }

    .projection-playground .pp-table {
        display: block;
        margin: 0;
        overflow-x: auto;
        border-collapse: collapse;
        font-size: 0.8rem;
    }

    .projection-playground .pp-table th,
    .projection-playground .pp-table td {
        padding: 0.2rem 0.45rem;
        border: 1px solid var(--pp-line);
        text-align: right;
    }

    .projection-playground .pp-controls {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-end;
        gap: 0.75rem 1.5rem;
        padding: 0.75rem;
        border-top: 1px solid var(--pp-line);
        font-size: 0.85rem;
    }

    .projection-playground .pp-controls fieldset {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        margin: 0;
        padding: 0;
        border: 0;
    }

    .projection-playground .pp-controls legend,
    .projection-playground .pp-note {
        color: var(--pp-muted);
    }

    .projection-playground .pp-controls legend {
        margin-bottom: 0.25rem;
    }

    .projection-playground .pp-controls label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .projection-playground .pp-controls output {
        min-width: 2.5em;
        font-variant-numeric: tabular-nums;
    }

    .projection-playground .pp-controls button {
        padding: 0.35rem 0.9rem;
        border: 1px solid var(--pp-line);
        border-radius: 8px;
        background: var(--pp-button);
        color: var(--pp-ink);
        cursor: pointer;
    }

    .projection-playground .pp-controls button:hover {
        border-color: var(--pp-ink);
    }

    .projection-playground .pp-presets {
        display: flex;
        flex-basis: 100%;
        flex-wrap: wrap;
        gap: 0.4rem;
    }

    .projection-playground .pp-presets button {
        padding: 0.2rem 0.7rem;
        border-radius: 999px;
    }

    .projection-playground .pp-note {
        flex-basis: 100%;
        margin: 0;
    }`;

/**
 * Mounts the figure into `host` and returns a function that removes it.
 */
export function mountProjectionPlayground(host: HTMLElement): () => void {
    host.classList.add('projection-playground');
    host.innerHTML = `
        <style>${STYLE}</style>
        <div class="pp-panels">
            <svg class="pp-svg" viewBox="0 0 480 400" role="img" aria-label="A cube projected with the rotation, scale, origin and rotation center set below."></svg>
            <div class="pp-source">
                <pre class="pp-code"><code></code></pre>
                <table class="pp-table">
                    <thead>
                        <tr><th rowspan="2">#</th><th colspan="3">input</th><th colspan="3">rotated</th><th colspan="2">projected</th></tr>
                        <tr><th>x</th><th>y</th><th>z</th><th>x</th><th>y</th><th>z</th><th>x</th><th>y</th></tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>
        <form class="pp-controls">
            <div class="pp-presets">${PRESETS.map(
                (p, k) => `<button type="button" value="${k}">${p.name}</button>`
            ).join('')}</div>
            <p class="pp-note" aria-live="polite">${NOTE}</p>
            ${FIELDSETS.map(
                ([legend, controls]) => `<fieldset>
                    <legend>${legend}</legend>
                    ${controls
                        .map(
                            (c) =>
                                `<label>${c.label} <input name="${c.name}" data-line="${c.line}" type="range" min="${c.min}" max="${c.max}" step="${c.step}" value="${c.value}"><output></output></label>`
                        )
                        .join('')}
                </fieldset>`
            ).join('')}
            <button type="reset">reset</button>
        </form>`;

    const svg = select(host).select<SVGSVGElement>('svg');
    const faceGroup = svg.append('g').attr('class', 'pp-faces');
    const axisGroup = svg.append('g').attr('class', 'pp-axes');
    const markGroup = svg.append('g').attr('class', 'pp-marks');
    const vertexGroup = svg.append('g').attr('class', 'pp-vertices');
    const code = select(host).select('code');
    const tbody = select(host).select<HTMLTableSectionElement>('tbody');
    const form = host.querySelector('form') as HTMLFormElement;
    const sliders = [...form.querySelectorAll('input')];
    const note = form.querySelector('.pp-note') as HTMLParagraphElement;

    const cube3d = cubes3D();
    const axes3d = lines3D();
    const center3d = points3D();
    const renderers: ShapeInstance[] = [cube3d, axes3d, center3d];

    // The lines of the renderer call the last input or preset changed, and the hovered row.
    let changed = new Set<string>();
    let active = -1;

    const value = (name: string) =>
        (form.elements.namedItem(name) as HTMLInputElement).valueAsNumber;

    /** Hands the sliders to every renderer and draws the figure, the code and the table. */
    function draw(): void {
        const origin = { x: value('originX'), y: value('originY') };
        const center = { x: value('centerX'), y: value('centerY'), z: value('centerZ') };
        for (const renderer of renderers) {
            renderer
                .rotateX(value('rotateX'))
                .rotateY(value('rotateY'))
                .rotateZ(value('rotateZ'))
                .scale(value('scale'))
                .origin(origin)
                .rotationCenter(center);
        }

        const [cube] = cube3d.data([CUBE]);
        const axes = axes3d.data(AXES);
        const [pivot] = center3d.data([center]);

        faceGroup
            .selectAll<SVGPathElement, CubeFace>('path')
            .data(cube.faces ?? [])
            .join('path')
            .attr('d', (face) => cube3d.draw(face))
            .sort(sort);

        axisGroup
            .selectAll('path')
            .data(axes)
            .join('path')
            .attr('class', (_, k) => `axis-${'xyz'[k]}`)
            .attr('d', (axis) => axes3d.draw(axis));
        axisGroup
            .selectAll('text')
            .data(axes)
            .join('text')
            .attr('class', (_, k) => `axis-${'xyz'[k]}`)
            .attr('x', (d) => d[1].projected.x + 4)
            .attr('y', (d) => d[1].projected.y - 4)
            .text((_, k) => 'xyz'[k]);

        // The origin is a screen point and is drawn as it is; the rotation
        // center is a model point and goes through the projection.
        markGroup.html(`
            <path class="pp-origin" d="M${origin.x - 8},${origin.y}h16M${origin.x},${origin.y - 8}v16"></path>
            <text class="pp-origin" x="${origin.x - 10}" y="${origin.y + 18}" text-anchor="end">origin</text>
            <circle class="pp-pivot" cx="${pivot.projected.x}" cy="${pivot.projected.y}" r="5"></circle>
            <text class="pp-pivot" x="${pivot.projected.x + 8}" y="${pivot.projected.y - 8}">rotation center</text>`);

        // A vertex is a dot and its index, moved together to the projected point.
        vertexGroup
            .selectAll('g')
            .data(cube)
            .join((enter) => {
                const vertex = enter.append('g');
                vertex.append('circle').attr('r', 4);
                vertex
                    .append('text')
                    .attr('x', 6)
                    .attr('y', -6)
                    .text((_, k) => k);
                return vertex;
            })
            .classed('is-active', (_, k) => k === active)
            .attr('transform', (d) => `translate(${d.projected.x},${d.projected.y})`);

        const lines: [string, string][] = [
            ['', 'cubes3D()'],
            ['rotateX', `    .rotateX(${value('rotateX').toFixed(2)})`],
            ['rotateY', `    .rotateY(${value('rotateY').toFixed(2)})`],
            ['rotateZ', `    .rotateZ(${value('rotateZ').toFixed(2)})`],
            ['scale', `    .scale(${value('scale')})`],
            ['origin', `    .origin({ x: ${origin.x}, y: ${origin.y} })`],
            [
                'rotationCenter',
                `    .rotationCenter({ x: ${center.x}, y: ${center.y}, z: ${center.z} })`
            ],
            ['', '    .data([cube]);']
        ];
        code.selectAll('span')
            .data(lines)
            .join('span')
            .classed('is-active', ([line]) => changed.has(line))
            .text(([, text]) => text);

        // The columns are the fields a transformed point carries: its input, rotated and projected.
        tbody
            .selectAll('tr')
            .data(cube)
            .join('tr')
            .classed('is-active', (_, k) => k === active)
            .selectAll('td')
            .data((d, k) => [
                k,
                d.x,
                d.y,
                d.z,
                d.rotated.x.toFixed(2),
                d.rotated.y.toFixed(2),
                d.rotated.z.toFixed(2),
                d.projected.x.toFixed(1),
                d.projected.y.toFixed(1)
            ])
            .join('td')
            .text(String);

        for (const slider of sliders) {
            slider.nextElementSibling!.textContent = slider.value;
        }
    }

    /** Sets the sliders a preset names, puts the others back to their defaults and marks its lines. */
    function applyPreset(preset: Preset): void {
        for (const slider of sliders) {
            slider.value = String(preset.values[slider.name] ?? slider.defaultValue);
        }
        changed = new Set(
            sliders.filter((s) => s.name in preset.values).map((s) => s.dataset.line!)
        );
        note.textContent = `${preset.name}: ${preset.note}`;
        draw();
    }

    form.addEventListener('input', (event) => {
        changed = new Set([(event.target as HTMLInputElement).dataset.line!]);
        draw();
    });
    form.querySelector('.pp-presets')!.addEventListener('click', (event) => {
        const button = (event.target as Element).closest('button');
        if (button) applyPreset(PRESETS[Number(button.value)]);
    });
    // The reset event fires before the inputs take their defaults back.
    form.addEventListener('reset', () => {
        changed = new Set();
        note.textContent = NOTE;
        requestAnimationFrame(draw);
    });
    tbody
        .on('pointerover', (event: PointerEvent) => {
            active = (event.target as Element).closest('tr')?.sectionRowIndex ?? -1;
            draw();
        })
        .on('pointerleave', () => {
            active = -1;
            draw();
        });

    draw();

    return () => {
        host.innerHTML = '';
        host.classList.remove('projection-playground');
    };
}
