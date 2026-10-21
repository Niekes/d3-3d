import {
    axisBottom,
    easeCubic,
    extent,
    format,
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
import { axes3D, lines3D, points3D, sort } from '../../index';
import type {
    AxesSpec,
    AxisEdge,
    AxisWall,
    HasCentroid,
    Line,
    Point,
    Point3D,
    ShapeInstance
} from '../../index';
import { rotatingFigure } from './rotatingFigure';
import './scatterExplorer.css';

/*
 * A scatter explorer after the 3D scatter plot of matterviz: the data sits
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
type ExplorerPoint = Point3D & { id: string; series: string; value?: number; size?: number };

/** A sample as drawn: `fade` runs from 0 to 1 while a new point fades in. */
type ShownPoint = ExplorerPoint & { fade: number };

type Series = { name: string; color: string; line?: 'solid' | 'dashed' };

type Dataset = {
    name: string;
    series: Series[];
    points: () => ExplorerPoint[];
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
    }
];

/**
 * Mounts the figure into `host` and returns a function that removes it.
 */
export function mountScatterExplorer(host: HTMLElement): () => void {
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

    // Data x runs across the screen, data z up and data y into the depth,
    // as in matterviz. The screen y grows downwards, so z is negated.
    const renderers: ShapeInstance<any>[] = [box3d, points3d, segments3d];
    for (const renderer of renderers) {
        renderer
            .scale(SCALE)
            .origin(ORIGIN)
            .x((d: Point3D) => scales.x(d.x))
            .y((d: Point3D) => -scales.z(d.z))
            .z((d: Point3D) => scales.y(d.y));
    }

    // The scene: the current dataset, its samples and what is drawn of them.
    let dataset = DATASETS[0];
    let all: ExplorerPoint[] = [];
    let shown: ShownPoint[] = [];
    let projected: Point<ShownPoint>[] = [];
    let spec: AxesSpec;
    let hoveredId: string | undefined;
    const hidden = new Set<string>();

    // The motion: the drag angles from the scaffold, the auto-rotation and
    // the tween of the samples, all advanced by one render loop.
    let dragYaw = 0;
    let dragPitch = 0;
    let autoYaw = 0;
    let loop: Timer | undefined;
    let lastFrame = 0;
    let tween: { from: Map<string, ShownPoint>; to: ExplorerPoint[]; start: number } | undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const { group, button } = rotatingFigure(
        host,
        'explorer',
        'A 3D scatter plot in a box with gridlines. Drag the figure to rotate it.',
        (yaw, pitch) => {
            dragYaw = yaw;
            dragPitch = pitch;
            drawScene();
        }
    );

    const wallGroup = group.append('g').attr('class', 'explorer-walls');
    const axisGroup = group.append('g').attr('class', 'explorer-axes');
    const dataGroup = group.append('g').attr('class', 'explorer-data');
    const halo = group.append('circle').attr('class', 'explorer-halo');

    button.text('resample');

    host.insertAdjacentHTML(
        'beforeend',
        `<div class="explorer-controls">
            <label>dataset <select name="dataset">${DATASETS.map(
                (d, i) => `<option value="${i}">${d.name}</option>`
            ).join('')}</select></label>
            <label>auto-rotate <input name="spin" type="range" min="0" max="5" step="0.1" value="0"><output></output></label>
        </div>
        <div class="explorer-legend" hidden></div>
        <div class="explorer-colorbar" hidden><span></span><svg width="220" height="34"></svg></div>
        <div class="explorer-tooltip" hidden></div>`
    );

    const picker = host.querySelector('[name=dataset]') as HTMLSelectElement;
    const spin = host.querySelector('[name=spin]') as HTMLInputElement;
    const legend = host.querySelector('.explorer-legend') as HTMLElement;
    const colorbar = host.querySelector('.explorer-colorbar') as HTMLElement;
    const tooltip = host.querySelector('.explorer-tooltip') as HTMLElement;

    const seriesColor = (name: string) => dataset.series.find((s) => s.name === name)!.color;
    const fill = (d: ShownPoint) =>
        d.value === undefined ? seriesColor(d.series) : dataset.ramp!(valueScale(d.value));
    const radius = (d: ShownPoint) => (d.size === undefined ? POINT_RADIUS : sizeScale(d.size));

    /** Draws the walls that face away from the camera, with their gridlines. */
    function drawWalls(): void {
        wallGroup
            .selectAll<SVGPathElement, AxisWall>('path')
            .data(box3d.data(spec).filter((wall) => !wall.ccw))
            .join('path')
            .attr('d', box3d.draw);
    }

    /**
     * Draws the axes on the outline of the box. The ticks and the labels
     * are pushed away from the box along the normal of their edge, so the
     * labels of two axes that meet in a corner part ways.
     */
    function drawAxes(): void {
        const edges = box3d.axes(spec);
        const ticksOf = edges.flatMap((edge) => edge.map((tick) => ({ tick, edge })));
        const first = (edge: AxisEdge) => edge[0].projected;
        const last = (edge: AxisEdge) => edge[edge.length - 1].projected;

        axisGroup
            .selectAll<SVGLineElement, AxisEdge>('line.axis-line')
            .data(edges)
            .join('line')
            .attr('class', 'axis-line')
            .attr('stroke', (d) => AXIS_COLORS[d.axis])
            .attr('x1', (d) => first(d).x)
            .attr('y1', (d) => first(d).y)
            .attr('x2', (d) => last(d).x)
            .attr('y2', (d) => last(d).y);

        axisGroup
            .selectAll<SVGLineElement, (typeof ticksOf)[number]>('line.tick-mark')
            .data(ticksOf)
            .join('line')
            .attr('class', 'tick-mark')
            .attr('x1', (d) => d.tick.projected.x)
            .attr('y1', (d) => d.tick.projected.y)
            .attr('x2', (d) => d.tick.projected.x + d.edge.normal.x * 6)
            .attr('y2', (d) => d.tick.projected.y + d.edge.normal.y * 6);

        axisGroup
            .selectAll<SVGTextElement, (typeof ticksOf)[number]>('text.tick-label')
            .data(ticksOf)
            .join('text')
            .attr('class', 'tick-label')
            .attr('text-anchor', (d) =>
                d.edge.normal.x > 0.3 ? 'start' : d.edge.normal.x < -0.3 ? 'end' : 'middle'
            )
            .attr('x', (d) => d.tick.projected.x + d.edge.normal.x * 10)
            .attr('y', (d) => d.tick.projected.y + d.edge.normal.y * 10)
            .text((d) => scales[d.edge.axis].tickFormat(TICKS)(d.tick[d.edge.axis]));

        axisGroup
            .selectAll<SVGTextElement, AxisEdge>('text.axis-title')
            .data(edges)
            .join('text')
            .attr('class', 'axis-title')
            .attr('fill', (d) => AXIS_COLORS[d.axis])
            .attr('x', (d) => (first(d).x + last(d).x) / 2 + d.normal.x * 38)
            .attr('y', (d) => (first(d).y + last(d).y) / 2 + d.normal.y * 38)
            .text((d) => d.axis.toUpperCase());
    }

    /** Consecutive samples of every series that is drawn as a line. */
    function segments(): ShownPoint[][] {
        return dataset.series
            .filter((s) => s.line)
            .flatMap((s) => {
                const run = shown.filter((p) => p.series === s.name);
                return run.slice(1).map((p, i) => [run[i], p]);
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
            .attr('cx', (d) => d.projected.x)
            .attr('cy', (d) => d.projected.y)
            .attr('r', radius)
            .attr('fill', fill)
            .attr('opacity', (d) => d.fade);

        dataGroup
            .selectAll<SVGLineElement, Line<ShownPoint>>('line')
            .data(segments3d.data(segments()), (d) => d[0].id)
            .join('line')
            .attr('x1', (d) => d[0].projected.x)
            .attr('y1', (d) => d[0].projected.y)
            .attr('x2', (d) => d[1].projected.x)
            .attr('y2', (d) => d[1].projected.y)
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

    /** Turns the scene by the drag and the auto-rotation and draws it. */
    function drawScene(): void {
        for (const renderer of renderers) {
            renderer.rotateY(dragYaw + autoYaw + START_YAW).rotateX(-dragPitch - START_TILT);
        }
        drawWalls();
        drawAxes();
        drawData();
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
    function morph(to: ExplorerPoint[]): void {
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
        const svg = select(colorbar).select('svg');
        svg.selectAll('*').remove();
        svg.append('g')
            .attr('transform', 'translate(10, 0)')
            .selectAll('rect')
            .data(range(0, 1, 1 / 40))
            .join('rect')
            .attr('x', (t) => t * width)
            .attr('width', width / 40 + 0.5)
            .attr('height', 14)
            .attr('fill', (t) => ramp(t));
        svg.append('g').attr('transform', 'translate(10, 14)').call(axisBottom(bar).ticks(4));
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
        const axis = (a: keyof AxesSpec) => ({
            domain: scales[a].domain(),
            ticks: scales[a].ticks(TICKS)
        });
        spec = { x: axis('x'), y: axis('y'), z: axis('z') };
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
