import { color, interpolate, randomUniform, range, scaleLinear, schemeTableau10, select } from 'd3';
import type { Selection } from 'd3';
import { axes3D, camera3D, iso3D, polygons3D, sort } from '../../index';
import type { AxesSpec, Point2D, Point3D, Polygon } from '../../index';
import { drawChartBox } from './axisEdges';
import { rotatingFigure, turnCamera } from './rotatingFigure';
import './areaChart.css';

/*
 * A 3D area chart after the multi-series 3D area chart with hatch fill of
 * AnyChart: the area of every series is extruded into a ribbon, one ribbon
 * behind the other. polygons3D projects the faces and tells which of them
 * face the camera. The order they are painted in follows from the planes
 * that separate them: the ribbons by their depth, the top of a ribbon by
 * its segments along x, and the faces of its bounding box last. The update
 * button tweens the prices, not the paths, so every frame is projected and
 * ordered anew.
 */

const ORIGIN = { x: 480, y: 290 };
const START_ANGLE = Math.PI / 6;
const SCALE = 28;
/** Half the depth of a ribbon, in world units. */
const DEPTH = 1;
/** The size of one hatch tile, in world units. */
const HATCH = 0.4;
const DURATION = 1000;
const YEARS = range(2006, 2026);
// The labels of the price and of the company axes name what they show.
const AXIS_TITLES = { x: 'year', y: '', z: '' };

type FaceName = 'front' | 'back' | 'left' | 'right' | 'bottom' | 'top';

type Hatch = 'diagonal' | 'diagonal-brick';

type Series = {
    id: string;
    name: string;
    color: string;
    hatch: Hatch;
    /** The centre of the ribbon along z. */
    z: number;
};

/** One face after the projection, with its name and its place in the ribbon. */
type AreaFace = Polygon<Point3D> & { face: FaceName; index: number };

/**
 * One ribbon after the projection: the faces that face the camera, the top
 * in the order it is painted in, and the frame of the hatched end.
 */
type Ribbon = {
    series: Series;
    centroid: Point3D;
    top: AreaFace[];
    caps: AreaFace[];
    plane: string;
};

// Two fictional companies; their share prices are sampled.
const SERIES: Series[] = [
    {
        id: 'area-hatch-acme',
        name: 'ACME Corp.',
        color: schemeTableau10[0],
        hatch: 'diagonal',
        z: -1.5
    },
    {
        id: 'area-hatch-competitor',
        name: 'Competitor',
        color: schemeTableau10[1],
        hatch: 'diagonal-brick',
        z: 1.5
    }
];

const year = scaleLinear().domain([2006, 2025]).range([-9.5, 9.5]);
// The prices grow upwards, which is towards a negative y on the screen.
const price = scaleLinear().domain([0, 60]).range([0, -8]);

const SPEC: AxesSpec = {
    x: { domain: [year(2005.5), year(2025.5)], ticks: [2006, 2010, 2015, 2020, 2025].map(year) },
    y: { domain: [price(0), price(60)], ticks: range(0, 70, 10).map(price) },
    z: { domain: [-3, 3], ticks: SERIES.map((series) => series.z) }
};

// The hatch tiles, drawn level and turned by 45° onto the face: one line
// across the tile, or two courses of bricks half a brick apart.
const H = HATCH;
const HATCH_PATHS: Record<Hatch, string> = {
    diagonal: `M0 ${H / 2}H${H}`,
    'diagonal-brick':
        `M0 ${H / 4}H${H}M0 ${(3 * H) / 4}H${H}M${H / 4} ${H / 4}V${(3 * H) / 4}` +
        `M${(3 * H) / 4} ${(3 * H) / 4}V${H}M${(3 * H) / 4} 0V${H / 4}`
};

/** A random walk of prices, one per year, that stays on the price axis. */
function walk(): number[] {
    const step = randomUniform(-5, 7);
    let value = randomUniform(5, 15)();
    return YEARS.map(() => (value = Math.min(58, Math.max(2, value + step()))));
}

/**
 * The faces of one ribbon in world space, each wound counter-clockwise as
 * seen from outside, so `ccw` tells whether it faces the camera. The first
 * five are the faces of its bounding box, the rest its top, one quad per
 * segment of the line.
 */
function ribbonFaces(series: Series, values: number[]): [FaceName, Point3D[]][] {
    const zf = series.z + DEPTH;
    const zb = series.z - DEPTH;
    const line: Point2D[] = values.map((v, i) => ({ x: year(YEARS[i]), y: price(v) }));
    const first = line[0];
    const last = line[line.length - 1];
    const at = (p: Point2D, z: number): Point3D => ({ x: p.x, y: p.y, z });
    const foot = (p: Point2D, z: number): Point3D => ({ x: p.x, y: 0, z });

    return [
        [
            'front',
            [
                at(first, zf),
                foot(first, zf),
                foot(last, zf),
                ...line.slice(1).reverse().map((p) => at(p, zf))
            ]
        ],
        ['back', [...line.map((p) => at(p, zb)), foot(last, zb), foot(first, zb)]],
        ['left', [at(first, zb), foot(first, zb), foot(first, zf), at(first, zf)]],
        ['right', [at(last, zf), foot(last, zf), foot(last, zb), at(last, zb)]],
        ['bottom', [foot(first, zf), foot(first, zb), foot(last, zb), foot(last, zf)]],
        ...line
            .slice(1)
            .map((q, i): [FaceName, Point3D[]] => [
                'top',
                [at(line[i], zf), at(q, zf), at(q, zb), at(line[i], zb)]
            ])
    ];
}

function faceFill(face: FaceName, series: Series): string {
    if (face === 'front' || face === 'back') {
        return `url(#${series.id})`;
    }
    const base = color(series.color)!;
    return (face === 'top' ? base.brighter(0.6) : base.darker(0.8)).formatHex();
}

function label(axis: keyof AxesSpec, value: number): string {
    if (axis === 'x') {
        return String(Math.round(year.invert(value)));
    }
    if (axis === 'y') {
        return `$${Math.round(price.invert(value))}`;
    }
    return SERIES.find((series) => series.z === value)?.name ?? '';
}

/**
 * Mounts the figure into `host` and returns a function that removes it.
 */
export function mountAreaChart(host: HTMLElement): () => void {
    // The three renderers hang on one camera, so turning it turns them all.
    const camera = camera3D().scale(SCALE).origin(ORIGIN);
    const polygons = polygons3D<Point3D>().camera(camera);
    const box = axes3D().camera(camera);
    const plane = iso3D().camera(camera);

    // The ribbons start flat and grow into the first sample.
    let values: number[][] = SERIES.map(() => YEARS.map(() => 0));

    const { group: figure, button } = rotatingFigure(
        host,
        'area',
        'A 3D area chart of the share prices of two companies from 2006 to 2025. Drag the figure to rotate it.',
        pose
    );
    const defs = figure.append('defs');
    const wallGroup = figure.append('g').attr('class', 'area-walls');
    const axisGroup = figure.append('g').attr('class', 'area-axes');
    const group = figure.append('g');

    /**
     * Projects one ribbon and keeps the faces that face the camera. The top
     * is a row of convex slabs that the planes x = const separate, so it is
     * painted along x, from the end that points away from the camera.
     */
    function project(series: Series, prices: number[]): Ribbon {
        const named = ribbonFaces(series, prices);
        const faces = polygons
            .data(named.map(([, points]) => points))
            .map((face, index) => Object.assign(face, { face: named[index][0], index }));
        const bottom = faces[4];
        // The depth grows along the view direction, so its x tells whether
        // +x points towards the camera or away from it.
        const sx = Math.sign(camera.viewDirection().x);
        const visible = faces.filter((face) => face.ccw);
        const hatched = faces[0].ccw ? series.z + DEPTH : series.z - DEPTH;

        return {
            series,
            // The floors of all ribbons share x and y, so their centres
            // differ only along z: `sort` orders the ribbons exactly.
            centroid: bottom.centroid,
            top: visible
                .filter((face) => face.face === 'top')
                .sort((a, b) => sx * (a.index - b.index)),
            caps: visible.filter((face) => face.face !== 'top'),
            plane: plane.plane({
                origin: { x: 0, y: 0, z: hatched },
                u: { x: 1, y: 0, z: 0 },
                v: { x: 0, y: 1, z: 0 }
            }).matrix
        };
    }

    /** Joins the faces of one part of a ribbon in the order they are painted in. */
    function paint(
        parent: Selection<SVGGElement, Ribbon, null, undefined>,
        faces: AreaFace[],
        series: Series
    ): void {
        parent
            .selectAll<SVGPathElement, AreaFace>('path')
            .data(faces, (d) => d.index)
            .join('path')
            .attr('d', polygons.draw)
            .attr('fill', (d) => faceFill(d.face, series))
            .order();
    }

    /** Repaints the box, the hatches and the ribbons back to front. */
    function draw(): void {
        const ribbons = SERIES.map((series, k) => project(series, values[k]));

        drawChartBox(wallGroup, axisGroup, box, SPEC, label, (axis) => AXIS_TITLES[axis]);

        defs.selectAll<SVGPatternElement, Ribbon>('pattern')
            .data(ribbons)
            .join((enter) => {
                const pattern = enter
                    .append('pattern')
                    .attr('id', (d) => d.series.id)
                    .attr('patternUnits', 'userSpaceOnUse')
                    .attr('width', HATCH)
                    .attr('height', HATCH);
                pattern
                    .append('rect')
                    .attr('width', HATCH)
                    .attr('height', HATCH)
                    .attr('fill', (d) => d.series.color);
                pattern
                    .append('path')
                    .attr('d', (d) => HATCH_PATHS[d.series.hatch])
                    .attr('fill', 'none')
                    .attr('stroke', (d) => color(d.series.color)!.darker(1.5).formatHex())
                    .attr('stroke-width', 0.06);
                return pattern;
            })
            .attr('patternTransform', (d) => `${d.plane} rotate(45)`);

        group
            .selectAll<SVGGElement, Ribbon>('g.series')
            .data(ribbons, (d) => d.series.id)
            .join((enter) => {
                const g = enter
                    .append('g')
                    .attr('class', 'series')
                    .attr('stroke', (d) => color(d.series.color)!.darker(1.5).formatHex());
                g.append('g').attr('class', 'top');
                g.append('g').attr('class', 'caps');
                return g;
            })
            .sort(sort)
            .each(function (ribbon) {
                const g = select<SVGGElement, Ribbon>(this);
                paint(g.select('g.top'), ribbon.top, ribbon.series);
                paint(g.select('g.caps'), ribbon.caps, ribbon.series);
            });
    }

    /** Turns the camera, and with it all three renderers, and repaints. */
    function pose(yaw: number, pitch: number): void {
        turnCamera(camera, yaw, pitch, { yaw: START_ANGLE, tilt: START_ANGLE });
        draw();
    }

    /**
     * Samples new prices and tweens the current ones into them. Which faces
     * are seen and the order of the top change while the ribbons morph, so
     * the tween moves the prices and every frame is projected anew. A new
     * sample interrupts the running tween and starts from where it stands.
     */
    function sample(): void {
        const next = SERIES.map(() => walk());
        figure
            .transition()
            .duration(DURATION)
            .tween('prices', () => {
                const prices = interpolate(values, next);
                return (t) => {
                    values = prices(t);
                    draw();
                };
            });
    }

    button.on('click', sample);

    pose(0, 0);
    sample();

    return () => {
        figure.interrupt();
        host.innerHTML = '';
    };
}
