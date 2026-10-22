import {
    axisBottom,
    easeCubic,
    extent,
    format,
    interpolateCool,
    interpolatePlasma,
    interpolateViridis,
    interpolateYlOrRd,
    pointer,
    randomNormal,
    randomUniform,
    range,
    rgb,
    scaleLinear,
    select,
    timer
} from 'd3';
import type { Timer } from 'd3';
import { axes3D, axisSpec, camera3D, lines3D, points3D, sort, strips } from '../../index';
import type {
    AxesSpec,
    AxisWall,
    HasCentroid,
    Line,
    Point,
    Point3D,
    ShapeInstance
} from '../../index';
import { rotatingFigure, turnCamera } from './rotatingFigure';
import { placePoints, placeSegments } from './segments';
import { drawAxisEdges } from './axisEdges';
import './scatterPlot.css';

/*
 * A scatter plot after the 3D scatter plot of matterviz: the data sits
 * in a box whose back walls carry the gridlines, the axes run along the
 * outline of the box, and the points can be colored and sized by a value.
 * The renderers read the data through one scale per axis, so the box of
 * axes3D and the points both live in data units.
 */

const ORIGIN = { x: 480, y: 250 };
const SCALE = 125;
const TICKS = 5;
const START_YAW = Math.PI / 4;
const START_TILT = Math.PI / 6;
const TWEEN_DURATION = 750;
const POINT_RADIUS = 3.5;
// The speed units of three.js OrbitControls: 2 is one turn in 30 seconds.
const SPIN = Math.PI / 30000;
const AXIS_COLORS = { x: '#ef4444', y: '#22c55e', z: '#3b82f6' };

const AXES: (keyof AxesSpec)[] = ['x', 'y', 'z'];

/** A sample: a position, its series and the optional values for color and size. */
type ScatterPoint = Point3D & { id: string; series: string; value?: number; size?: number };

/** A sample as drawn: `fade` runs from 0 to 1 while a new point fades in. */
type ShownPoint = ScatterPoint & { fade: number };

type Series = { name: string; color: string; line?: 'solid' | 'dashed' };

type Dataset = {
    name: string;
    series: Series[];
    points: () => ScatterPoint[];
    ramp?: (t: number) => string;
    rampTitle?: string;
    autoRotate?: number;
    zDomain?: [number, number];
};

const TAU = Math.PI * 2;

const DATASETS: Dataset[] = [
    {
        name: 'Helices',
        series: [
            { name: 'Helix 1', color: '#7c3aed' },
            { name: 'Helix 2', color: '#d97706' }
        ],
        points: () => {
            const phase = randomUniform(TAU)();
            return [0, Math.PI].flatMap((offset, s) =>
                range(100).map((i) => {
                    const t = (i / 99) * 2 * TAU;
                    return {
                        id: `helix-${s}-${i}`,
                        series: `Helix ${s + 1}`,
                        x: Math.cos(t + phase + offset),
                        y: Math.sin(t + phase + offset),
                        z: t / TAU
                    };
                })
            );
        }
    },
    {
        name: 'Spherical shell',
        series: [{ name: 'Sphere', color: 'steelblue' }],
        ramp: interpolateViridis,
        rampTitle: 'Z-coordinate',
        points: () =>
            range(500).map((i) => {
                const u = randomUniform(-1, 1)();
                const phi = randomUniform(TAU)();
                const r = randomUniform(0.8, 1.2)();
                const z = r * u;
                const ring = r * Math.sqrt(1 - u * u);
                return {
                    id: `shell-${i}`,
                    series: 'Sphere',
                    x: ring * Math.cos(phi),
                    y: ring * Math.sin(phi),
                    z,
                    value: z
                };
            })
    },
    {
        name: 'Lissajous curves',
        series: [
            { name: 'Lissajous 3:4:5', color: '#e74c3c', line: 'solid' },
            { name: 'Lissajous 2:3:2', color: '#3498db', line: 'solid' },
            { name: 'Helix', color: '#2ecc71', line: 'dashed' }
        ],
        points: () => {
            const phase = randomUniform(TAU)();
            const curves: [string, (t: number) => [number, number, number]][] = [
                [
                    'Lissajous 3:4:5',
                    (t) => [Math.sin(3 * t), Math.sin(4 * t + phase), Math.sin(5 * t)]
                ],
                [
                    'Lissajous 2:3:2',
                    (t) => [Math.sin(2 * t), Math.sin(3 * t + phase), Math.cos(2 * t)]
                ],
                [
                    'Helix',
                    (t) => [
                        0.5 * Math.cos(3 * t + phase),
                        0.5 * Math.sin(3 * t + phase),
                        t / Math.PI - 1
                    ]
                ]
            ];
            return curves.flatMap(([series, curve], s) =>
                range(60).map((i) => {
                    const [x, y, z] = curve((i / 59) * TAU);
                    return { id: `curve-${s}-${i}`, series, x, y, z };
                })
            );
        }
    },
    {
        name: 'Size-scaled',
        series: [{ name: 'Cube', color: 'steelblue' }],
        ramp: interpolatePlasma,
        rampTitle: 'Distance from Origin',
        points: () =>
            range(200).map((i) => {
                const [x, y, z] = range(3).map(randomUniform(-5, 5));
                const distance = Math.hypot(x, y, z);
                return {
                    id: `cube-${i}`,
                    series: 'Cube',
                    x,
                    y,
                    z,
                    value: distance,
                    size: distance
                };
            })
    },
    {
        name: 'Galaxy',
        series: [{ name: 'Galaxy', color: 'goldenrod' }],
        ramp: interpolateYlOrRd,
        rampTitle: 'Radial fraction',
        autoRotate: 1,
        // A thin disk: a fixed height keeps it from being stretched to the full box.
        zDomain: [-2, 2],
        points: () => {
            const noise = randomNormal(0, 0.25);
            return range(3).flatMap((arm) =>
                range(200).map((i) => {
                    const t = i / 199;
                    const r = 0.3 + 4.7 * t;
                    const angle = (arm * TAU) / 3 + 0.8 * r;
                    return {
                        id: `galaxy-${arm}-${i}`,
                        series: 'Galaxy',
                        x: r * Math.cos(angle) + noise(),
                        y: r * Math.sin(angle) + noise(),
                        z: noise() * (1 - t),
                        value: t
                    };
                })
            );
        }
    },
    {
        name: 'Random heights',
        series: [{ name: 'Field', color: 'steelblue' }],
        ramp: interpolateCool,
        rampTitle: 'Height',
        // A 20 by 20 field, every sample at a random height.
        points: () =>
            range(400).map((i) => {
                const z = randomUniform(10)();
                return {
                    id: `field-${i}`,
                    series: 'Field',
                    x: (i % 20) - 10,
                    y: Math.floor(i / 20) - 10,
                    z,
                    value: z
                };
            })
    }
];

/**
 * Mounts the figure into `host` and returns a function that removes it.
 */
export function mountScatterPlot(host: HTMLElement): () => void {
    // Every axis spans the box from -1 to 1, whatever the extent of its data.
    const scales = {
        x: scaleLinear().range([-1, 1]),
        y: scaleLinear().range([-1, 1]),
        z: scaleLinear().range([-1, 1])
    };
    const valueScale = scaleLinear();
    const sizeScale = scaleLinear().range([2, 9]);
    const fmt = format('.3~g');

    const box3d = axes3D();
    const points3d = points3D<ShownPoint>();
    const segments3d = lines3D<ShownPoint>();
    const probe3d = lines3D();

    // Data x runs across the screen, data z up and data y into the depth,
    // as in matterviz. The screen y grows downwards, so z is negated. All
    // renderers hang on one camera, so turning it turns the whole scene.
    const camera = camera3D().scale(SCALE).origin(ORIGIN);
    const renderers: ShapeInstance<any>[] = [box3d, points3d, segments3d, probe3d];
    for (const renderer of renderers) {
        renderer
            .camera(camera)
            .x((d: Point3D) => scales.x(d.x))
            .y((d: Point3D) => -scales.z(d.z))
            .z((d: Point3D) => scales.y(d.y));
    }

    // The scene: the current dataset, its samples and what is drawn of them.
    let dataset = DATASETS[0];
    let all: ScatterPoint[] = [];
    let shown: ShownPoint[] = [];
    let projected: Point<ShownPoint>[] = [];
    let spec: AxesSpec;
    let hoveredId: string | undefined;
    const hidden = new Set<string>();

    // The probe: the pointer in the group while no button is down, and the
    // data z of the horizontal wall that is drawn, the floor it reads.
    let resting: [number, number] | undefined;
    let floorZ: number | undefined;

    // The motion: the drag angles from the scaffold, the auto-rotation and
    // the tween of the samples, all advanced by one render loop.
    let dragYaw = 0;
    let dragPitch = 0;
    let autoYaw = 0;
    let loop: Timer | undefined;
    let lastFrame = 0;
    let tween: { from: Map<string, ShownPoint>; to: ScatterPoint[]; start: number } | undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const { group, button } = rotatingFigure(
        host,
        'scatter',
        'A 3D scatter plot in a box with gridlines. Drag the figure to rotate it.',
        (yaw, pitch) => {
            dragYaw = yaw;
            dragPitch = pitch;
            drawScene();
        }
    );

    const wallGroup = group.append('g').attr('class', 'scatter-walls');
    const axisGroup = group.append('g').attr('class', 'scatter-axes');
    const probeGroup = group.append('g').attr('class', 'scatter-probe');
    const dataGroup = group.append('g').attr('class', 'scatter-data');
    const halo = group.append('circle').attr('class', 'scatter-halo');

    button.text('resample');

    host.insertAdjacentHTML(
        'beforeend',
        `<div class="scatter-controls">
            <label>dataset <select name="dataset">${DATASETS.map(
                (d, i) => `<option value="${i}">${d.name}</option>`
            ).join('')}</select></label>
            <label>auto-rotate <input name="spin" type="range" min="0" max="5" step="0.1" value="0"><output></output></label>
            <span class="scatter-readout"></span>
        </div>
        <div class="scatter-legend" hidden></div>
        <div class="scatter-colorbar" hidden><span></span><svg width="220" height="34"></svg></div>
        <div class="scatter-tooltip" hidden></div>`
    );

    const picker = host.querySelector('[name=dataset]') as HTMLSelectElement;
    const spin = host.querySelector('[name=spin]') as HTMLInputElement;
    const legend = host.querySelector('.scatter-legend') as HTMLElement;
    const colorbar = host.querySelector('.scatter-colorbar') as HTMLElement;
    const tooltip = host.querySelector('.scatter-tooltip') as HTMLElement;
    const readout = host.querySelector('.scatter-readout') as HTMLElement;
    const svg = select(host).select<SVGSVGElement>('svg');

    const seriesColor = (name: string) => dataset.series.find((s) => s.name === name)!.color;
    const fill = (d: ShownPoint) =>
        d.value === undefined ? seriesColor(d.series) : dataset.ramp!(valueScale(d.value));
    const radius = (d: ShownPoint) => (d.size === undefined ? POINT_RADIUS : sizeScale(d.size));

    /** Draws the walls that face away from the camera, with their gridlines; keeps the floor. */
    function drawWalls(): void {
        const walls = box3d.data(spec).filter((wall) => !wall.ccw);
        wallGroup
            .selectAll<SVGPathElement, AxisWall>('path')
            .data(walls)
            .join('path')
            .attr('d', box3d.draw);

        // The floor is the drawn wall across data z. A level view sees both
        // horizontal walls edge-on and has no floor.
        const floors = walls.filter((wall) => wall.axis === 'z');
        floorZ = floors.length === 1 ? floors[0][0].z : undefined;
    }

    /** Consecutive samples of every series that is drawn as a line. */
    function segments(): ShownPoint[][] {
        return dataset.series
            .filter((s) => s.line)
            .flatMap((s) => {
                return strips(
                    shown.filter((p) => p.series === s.name),
                    2
                );
            });
    }

    /**
     * Draws the samples and the line segments, and paints them back to
     * front. A curve is cut into segments so each piece sorts on its own
     * depth instead of the whole curve sharing one.
     */
    function drawData(): void {
        projected = points3d.data(shown);

        dataGroup
            .selectAll<SVGCircleElement, Point<ShownPoint>>('circle')
            .data(projected, (d) => d.id)
            .join('circle')
            .call(placePoints)
            .attr('r', radius)
            .attr('fill', fill)
            .attr('opacity', (d) => d.fade);

        dataGroup
            .selectAll<SVGLineElement, Line<ShownPoint>>('line')
            .data(segments3d.data(segments()), (d) => d[0].id)
            .join('line')
            .call(placeSegments)
            .attr('stroke', (d) => seriesColor(d[0].series))
            .attr('opacity', (d) => d[0].fade)
            .classed('is-dashed', (d) =>
                dataset.series.some((s) => s.name === d[0].series && s.line === 'dashed')
            );

        dataGroup.selectAll<SVGElement, HasCentroid>('circle, line').sort(sort);

        drawHalo();
    }

    /** Rings the hovered sample, wherever the rotation has carried it. */
    function drawHalo(): void {
        const hovered = projected.find((d) => d.id === hoveredId);
        halo.attr('visibility', hovered ? null : 'hidden');
        if (!hovered) {
            tooltip.hidden = true;
            return;
        }
        halo.attr('cx', hovered.projected.x)
            .attr('cy', hovered.projected.y)
            .attr('r', radius(hovered) + 4)
            .attr('fill', rgb(fill(hovered)).brighter(0.8).formatHex());
    }

    /** The point of the floor at data z `z` under the pointer, in data units, inside the box. */
    function floorAt([x, y]: [number, number], z: number): Point3D | undefined {
        const world = box3d.unproject(
            { x, y },
            { x: 0, y: -scales.z(z), z: 0 },
            { x: 0, y: 1, z: 0 }
        );
        // Every scale maps its domain onto -1 to 1, so beyond that the
        // inverted scales would read values outside the domains.
        if (!world || Math.abs(world.x) > 1 || Math.abs(world.z) > 1) {
            return undefined;
        }
        return { x: scales.x.invert(world.x), y: scales.y.invert(world.z), z };
    }

    /**
     * Draws the crosshair on the floor through the foot of the hovered
     * sample, or through the floor under the pointer, the drop line from
     * the hovered sample and the readout.
     */
    function drawProbe(): void {
        const hovered = shown.find((d) => d.id === hoveredId);
        const z = floorZ;
        const at =
            z === undefined || !resting
                ? undefined
                : hovered
                  ? { x: hovered.x, y: hovered.y, z }
                  : floorAt(resting, z);
        const [x0, x1] = scales.x.domain();
        const [y0, y1] = scales.y.domain();
        const lines: Point3D[][] = at
            ? [
                  [
                      { ...at, x: x0 },
                      { ...at, x: x1 }
                  ],
                  [
                      { ...at, y: y0 },
                      { ...at, y: y1 }
                  ],
                  ...(hovered ? [[hovered, at]] : [])
              ]
            : [];

        probeGroup
            .style('--drop', hovered ? seriesColor(hovered.series) : '')
            .selectAll<SVGLineElement, Line<Point3D>>('line')
            .data(probe3d.data(lines))
            .join('line')
            .call(placeSegments)
            .classed('is-drop', (d) => d[0].z !== d[1].z);

        readout.textContent = at ? `x ${fmt(at.x)} · y ${fmt(at.y)}` : '';
        svg.classed('is-probing', !!at);
    }

    /** Turns the scene by the drag and the auto-rotation and draws it. */
    function drawScene(): void {
        turnCamera(camera, dragYaw + autoYaw, dragPitch, { yaw: START_YAW, tilt: START_TILT });
        drawWalls();
        drawAxisEdges(
            axisGroup,
            box3d.axes(spec),
            (axis, value) => scales[axis].tickFormat(TICKS)(value),
            (axis) => axis.toUpperCase(),
            (axis) => AXIS_COLORS[axis]
        );
        drawData();
        drawProbe();
    }

    /** Moves the shown samples one frame further towards the target of the tween. */
    function stepTween(now: number): void {
        if (!tween) {
            return;
        }
        const t = easeCubic(Math.min(1, (now - tween.start) / TWEEN_DURATION));
        const mix = (a: number, b: number) => a + (b - a) * t;
        const { from } = tween;

        shown = tween.to.map((p) => {
            const q = from.get(p.id);
            if (!q) {
                return { ...p, fade: t };
            }
            return {
                ...p,
                x: mix(q.x, p.x),
                y: mix(q.y, p.y),
                z: mix(q.z, p.z),
                value: p.value === undefined ? undefined : mix(q.value!, p.value),
                size: p.size === undefined ? undefined : mix(q.size!, p.size),
                fade: mix(q.fade, 1)
            };
        });

        if (t === 1) {
            tween = undefined;
        }
    }

    /** One frame of the render loop, which stops itself once nothing moves. */
    function frame(): void {
        const now = performance.now();
        autoYaw += (now - lastFrame) * spin.valueAsNumber * SPIN;
        lastFrame = now;
        stepTween(now);
        drawScene();
        if (!tween && !spin.valueAsNumber && loop) {
            loop.stop();
            loop = undefined;
        }
    }

    function wake(): void {
        if (!loop) {
            lastFrame = performance.now();
            loop = timer(frame);
        }
    }

    /** Glides the shown samples to `to`: kept ids move, new ids fade in, the rest leave. */
    function morph(to: ScatterPoint[]): void {
        tween = { from: new Map(shown.map((p) => [p.id, p])), to, start: performance.now() };
        wake();
    }

    const visible = () => all.filter((p) => !hidden.has(p.series));

    /** The series toggles, shown only when there is more than one series. */
    function drawLegend(): void {
        legend.hidden = dataset.series.length < 2;
        select(legend)
            .selectAll<HTMLButtonElement, Series>('button')
            .data(dataset.series)
            .join('button')
            .attr('type', 'button')
            .attr('aria-pressed', (d) => String(!hidden.has(d.name)))
            .style('--swatch', (d) => d.color)
            .text((d) => d.name)
            .on('click', (_, d) => {
                if (!hidden.delete(d.name)) {
                    hidden.add(d.name);
                }
                drawLegend();
                morph(visible());
            });
    }

    /** The color bar of the value ramp, shown only when the dataset colors by value. */
    function drawColorbar(): void {
        const ramp = dataset.ramp;
        colorbar.hidden = !ramp;
        if (!ramp) {
            return;
        }
        colorbar.querySelector('span')!.textContent = dataset.rampTitle ?? '';

        const width = 200;
        const bar = scaleLinear().domain(valueScale.domain()).range([0, width]);
        const barSvg = select(colorbar).select('svg');
        barSvg.selectAll('*').remove();
        barSvg
            .append('g')
            .attr('transform', 'translate(10, 0)')
            .selectAll('rect')
            .data(range(0, 1, 1 / 40))
            .join('rect')
            .attr('x', (t) => t * width)
            .attr('width', width / 40 + 0.5)
            .attr('height', 14)
            .attr('fill', (t) => ramp(t));
        barSvg.append('g').attr('transform', 'translate(10, 14)').call(axisBottom(bar).ticks(4));
    }

    /** Switches to a dataset: new domains, axes, legend and color bar. */
    function useDataset(next: Dataset): void {
        dataset = next;
        hidden.clear();
        all = next.points();

        for (const a of AXES) {
            const domain = a === 'z' && next.zDomain ? next.zDomain : extent(all, (p) => p[a]);
            scales[a].domain(domain as [number, number]).nice(TICKS);
        }
        spec = {
            x: axisSpec(scales.x, TICKS),
            y: axisSpec(scales.y, TICKS),
            z: axisSpec(scales.z, TICKS)
        };
        valueScale.domain(extent(all, (p) => p.value) as [number, number]);
        sizeScale.domain([0, Math.max(...all.map((p) => p.size ?? 0))]);

        spin.valueAsNumber = reducedMotion ? 0 : (next.autoRotate ?? 0);
        spin.nextElementSibling!.textContent = spin.value;

        drawLegend();
        drawColorbar();
        morph(visible());
    }

    /** Shows the sample under the pointer, unless a drag is on. */
    function showTooltip(event: PointerEvent): void {
        const target = event.target as Element;
        if (event.buttons !== 0 || target.tagName !== 'circle') {
            hoveredId = undefined;
            drawHalo();
            return;
        }
        const d = select<Element, ShownPoint>(target).datum();
        const [left, top] = pointer(event, host);
        hoveredId = d.id;
        tooltip.hidden = false;
        tooltip.textContent = [
            d.series,
            `x ${fmt(d.x)}  y ${fmt(d.y)}  z ${fmt(d.z)}`,
            ...(d.value === undefined ? [] : [`${dataset.rampTitle} ${fmt(d.value)}`])
        ].join('\n');
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
        tooltip.classList.toggle('is-left', left > host.clientWidth / 2);
        drawHalo();
    }

    picker.addEventListener('change', () => useDataset(DATASETS[picker.selectedIndex]));
    spin.addEventListener('input', () => {
        spin.nextElementSibling!.textContent = spin.value;
        wake();
    });
    dataGroup.on('pointermove', showTooltip).on('pointerleave', () => {
        hoveredId = undefined;
        drawHalo();
    });
    // The pointer is kept while no button is down, so the probe follows the
    // scene through a glide and the auto-rotation; a drag hides it.
    svg.on('pointerdown pointermove pointerup', (event: PointerEvent) => {
        resting = event.buttons ? undefined : pointer(event, group.node());
        drawProbe();
    }).on('pointerleave', () => {
        resting = undefined;
        drawProbe();
    });
    button.on('click', () => {
        all = dataset.points();
        morph(visible());
    });

    useDataset(dataset);

    return () => {
        loop?.stop();
        host.innerHTML = '';
    };
}
