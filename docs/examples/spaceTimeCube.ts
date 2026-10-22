import { groups, interpolateObject, range, scaleLinear, select } from 'd3';
import type { BaseType, Selection } from 'd3';
import {
    axes3D,
    axisSpec,
    camera3D,
    lineStrips3D,
    lines3D,
    planes3D,
    points3D,
    sort,
    strips
} from '../../index';
import type {
    AxesSpec,
    AxisEdge,
    HasCentroid,
    Line,
    LineStrip,
    Point,
    Point3D,
    ShapeInstance
} from '../../index';
import { drawChartBox } from './axisEdges';
import { pose } from './floorView';
import { playback, rotatingFigure } from './rotatingFigure';
import { placeSegments } from './segments';

/*
 * A space-time cube after Torsten Hägerstrand's time geography: the floor
 * is the map of a small town and up is the time of one day. lineStrips3D
 * draws the paths of four people, lines3D the stations of the places, and
 * planes3D the plane at the time of the slider, with points3D marking where
 * everyone is. The plane cuts the scene in two, and the half on the side of
 * the eye is painted over it. The styles ship with the module: the figure
 * adds them to its host.
 */

// The day runs from 6:00 to 22:00 and is sampled every 5 minutes.
const START = 6;
const END = 22;
const PER_HOUR = 12;
const SAMPLES = (END - START) * PER_HOUR + 1;
// The map is 10 × 10 km.
const MAP = 10;
// The cube spans -1 to 1 along every axis and turns around its middle.
const VIEW = { scale: 115, center: { x: 0, y: 0, z: 0 } };
// The eye of the perspective, in the units of the cube: farther from the
// middle than the √3 the corners reach, so the whole cube lies in front of it.
const EYE = 3;
// The pieces the paths are cut into, so each sorts on its own depth.
const CHUNK = 6;
// The playback: 30 minutes of the day per second play the day in 32 seconds.
const RATE = 0.5 / 1000;
// The arrow keys step 15 minutes, and an hour with Shift.
const KEY_STEP = 0.25;
// Without motion the figure opens paused at a time when everyone is somewhere.
const STILL = 12.5;
const MARKER = 5;
const RING = 11;
const LINE_HEIGHT = 13;
const TITLE_SHIFT = 18;
const AXIS_TITLES = { x: 'east, km', y: 'north, km', z: 'time' };
const STEPS: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 };

/** The places of the town, with their name in a sentence and their position in km. */
const PLACES = {
    flat: { name: 'the flat', x: 1.5, y: 8 },
    house: { name: 'the house', x: 8.5, y: 8.5 },
    school: { name: 'school', x: 7.5, y: 4 },
    office: { name: 'the office', x: 2, y: 2 },
    café: { name: 'the café', x: 4.5, y: 5.5 },
    gym: { name: 'the gym', x: 6, y: 1 }
};

type PlaceId = keyof typeof PLACES;

const PLACE_IDS = Object.keys(PLACES) as PlaceId[];

/** A stay: from and to a time of day in hours, at a place. A trip fills the gap to the next. */
type Stay = [from: number, to: number, place: PlaceId];

/**
 * A point of the cube: x east and y north on the map in km, z the time in
 * hours, and the id of the person or the place it belongs to.
 */
type Sample = Point3D & { id: string };

type Group = Selection<SVGGElement, unknown, null, undefined>;

// A and D share the flat, B and C the house. C teaches at the school B goes
// to, D runs the café. The colors are CSS variables, so the dark mode steps
// them for its own surface.
const PEOPLE: { id: string; color: string; stays: Stay[] }[] = [
    {
        id: 'A',
        color: 'var(--stc-a)',
        stays: [
            [6, 7.5, 'flat'],
            [8, 12, 'office'],
            [12.25, 13.25, 'café'],
            [13.5, 17.5, 'office'],
            [18, 19.5, 'gym'],
            [20.25, 22, 'flat']
        ]
    },
    {
        id: 'B',
        color: 'var(--stc-b)',
        stays: [
            [6, 7.5, 'house'],
            [7.75, 15, 'school'],
            [15.5, 16.5, 'café'],
            [17, 22, 'house']
        ]
    },
    {
        id: 'C',
        color: 'var(--stc-c)',
        stays: [
            [6, 7.5, 'house'],
            [7.75, 16, 'school'],
            [16.5, 19, 'gym'],
            [19.5, 22, 'house']
        ]
    },
    {
        id: 'D',
        color: 'var(--stc-d)',
        stays: [
            [6, 6.5, 'flat'],
            [6.75, 16, 'café'],
            [16.5, 18, 'flat'],
            [18.5, 22, 'house']
        ]
    }
];

/**
 * Where a schedule is at `time`: at the place of the stay that covers it,
 * or on the way to the next stay, at a constant speed from the last one.
 */
function whereAt(stays: Stay[], time: number) {
    const next = stays.findIndex(([, to]) => to >= time);
    const [from, , place] = stays[next];
    const there = PLACES[place];
    if (from <= time) {
        return { x: there.x, y: there.y, place, moving: false };
    }
    const [, left, last] = stays[next - 1];
    const k = (time - left) / (from - left);
    const here = PLACES[last];
    return {
        x: here.x + (there.x - here.x) * k,
        y: here.y + (there.y - here.y) * k,
        place,
        moving: true
    };
}

/** Names two or more people as "A and B" or "A, B and C". */
const names = (ids: string[]) => `${ids.slice(0, -1).join(', ')} and ${ids[ids.length - 1]}`;

/** The people who stay at one place at `time`, by place: two or more meet there. */
function meetingsAt(time: number) {
    const staying = PEOPLE.map(({ id, stays }) => ({ id, ...whereAt(stays, time) })).filter(
        (d) => !d.moving
    );
    return groups(staying, (d) => d.place).filter(([, met]) => met.length > 1);
}

/** The meetings in words, such as "B and C at school; A and D at the café". */
const describe = (meetings: ReturnType<typeof meetingsAt>) =>
    meetings
        .map(([place, met]) => `${names(met.map((d) => d.id))} at ${PLACES[place].name}`)
        .join('; ') || 'none';

/** A point of the station of the place `id`, at the time `z`. */
const at = (id: PlaceId, z: number): Sample => ({ id, x: PLACES[id].x, y: PLACES[id].y, z });

/** A time of day in hours as h:mm. */
function clock(hours: number): string {
    const minutes = Math.round(hours * 60);
    return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/**
 * Mounts the figure into `host` and returns a function that removes it.
 */
export function mountSpaceTimeCube(host: HTMLElement): () => void {
    // The paths are sampled once: a stay keeps its place, a trip moves on.
    const paths: Sample[][] = PEOPLE.map(({ id, stays }) =>
        range(SAMPLES).map((i) => {
            const z = START + i / PER_HOUR;
            const { x, y } = whereAt(stays, z);
            return { id, x, y, z };
        })
    );
    // The routes are the paths flat on the floor: where, without when.
    const routes = paths.map((samples) => samples.map((s) => ({ ...s, z: START })));

    // Both map axes span 10 km and the time axis the day, each onto -1 to 1.
    const km = scaleLinear([0, MAP], [-1, 1]);
    const hours = scaleLinear([START, END], [-1, 1]);
    const spec: AxesSpec = { x: axisSpec(km, 5), y: axisSpec(km, 5), z: axisSpec(hours, 8) };
    const tickLabel = (axis: keyof AxesSpec, value: number) =>
        axis === 'z' ? clock(value) : String(value);

    // The state: every input writes it, and `render` reads it.
    let t = START;
    let selected = '';
    let yaw = 0;
    let pitch = 0;

    // All renderers hang on one camera. East is x, and the time goes up,
    // which is towards a negative y on the screen. North runs into the
    // depth, away from the viewer, so it is negated too: otherwise the map
    // would be mirrored.
    const camera = camera3D();
    const box3d = axes3D().camera(camera);
    const strips3d = lineStrips3D<Sample>().camera(camera);
    const lines3d = lines3D<Sample>().camera(camera);
    const plane3d = planes3D<Point3D>().camera(camera);
    const dots3d = points3D<Sample>().camera(camera);
    const renderers: ShapeInstance<any>[] = [box3d, strips3d, lines3d, plane3d, dots3d];
    for (const renderer of renderers) {
        renderer
            .x((d: Point3D) => km(d.x))
            .y((d: Point3D) => -hours(d.z))
            .z((d: Point3D) => -km(d.y));
    }

    const { group, button } = rotatingFigure(
        host,
        'stc',
        'A space-time cube: the paths of four people through one day above the map of a small town, cut by a plane at the time of the slider. Drag the figure to rotate it, or focus it, step the time with the arrow keys, play and pause with Space and pick a person with the keys 1 to 4.',
        (dragYaw, dragPitch) => {
            yaw = dragYaw;
            pitch = dragPitch;
            render();
        }
    );

    host.classList.add('space-time-cube');
    host.insertAdjacentHTML(
        'beforeend',
        `<style>${STYLES}</style>
        <div class="stc-controls">
            <label>time <input name="time" type="range" min="${START * 60}" max="${END * 60}" step="5"><span class="stc-clock"></span></label>
            <fieldset>
                <legend>person</legend>
                <label><input type="radio" name="stc-person" value="" checked> all</label>
                ${PEOPLE.map(
                    (d) =>
                        `<label><input type="radio" name="stc-person" value="${d.id}"><span class="swatch" style="background: ${d.color}"></span>${d.id}</label>`
                ).join('')}
            </fieldset>
            <label><input type="checkbox" name="perspective"> perspective</label>
            <ul class="stc-where"></ul>
            <p class="stc-readout"><span></span> <span class="stc-status" aria-live="polite"></span></p>
        </div>`
    );

    const svg = select(host).select<SVGSVGElement>('svg').attr('tabindex', 0);

    /** One side of the plane: the stations, and over them the paths and drop lines. */
    function side() {
        const slot = group.append('g');
        return {
            slot,
            stationGroup: slot.append('g').attr('class', 'stc-stations'),
            pathGroup: slot.append('g').attr('class', 'stc-paths')
        };
    }

    // Painted in this order: the box, the floor, the far side of the plane,
    // the plane, the markers on it and the near side.
    const wallGroup = group.append('g').attr('class', 'stc-walls');
    const axisGroup = group.append('g').attr('class', 'stc-axes');
    const routeGroup = group.append('g').attr('class', 'stc-routes');
    const placeGroup = group.append('g').attr('class', 'stc-places');
    const far = side();
    const planePath = group.append('path').attr('class', 'stc-plane');
    const markerGroup = group.append('g').attr('class', 'stc-markers');
    const near = side();
    const scrub = host.querySelector('[name=time]') as HTMLInputElement;
    const clockText = host.querySelector('.stc-clock') as HTMLElement;
    const perspective = host.querySelector('[name=perspective]') as HTMLInputElement;
    const radios = Array.from(host.querySelectorAll<HTMLInputElement>('[name=stc-person]'));
    const whereabouts = host.querySelector('.stc-where') as HTMLUListElement;
    const [meetingText, status] = Array.from(
        host.querySelectorAll<HTMLElement>('.stc-readout span')
    );

    const colorOf = (id: string) => PEOPLE.find((d) => d.id === id)!.color;
    const faded = (id: string) => selected !== '' && id !== selected;

    /** Strokes every line in the color of its person and fades the people not selected. */
    function byPerson<E extends BaseType, D extends Sample[], P extends BaseType>(
        lines: Selection<E, D, P, unknown>
    ): void {
        lines.style('stroke', (d) => colorOf(d[0].id)).classed('is-faded', (d) => faded(d[0].id));
    }

    /** Joins one path per line strip into `parent`. */
    function joinStrips(parent: Group, data: Sample[][]): void {
        parent
            .selectAll<SVGPathElement, LineStrip<Sample>>('path')
            .data(strips3d.data(data))
            .join('path')
            .attr('d', strips3d.draw)
            .call(byPerson);
    }

    /**
     * Writes the id of every point beside it, `dx` to its right. A label
     * steps down a line past every earlier label it would overlap, so the
     * labels stay apart where their points meet.
     */
    function writeLabels(parent: Group, points: Point<Sample>[], dx: number, width: number) {
        const overlap = (a: Point<Sample>, b: Point<Sample>) =>
            Math.abs(a.projected.x - b.projected.x) < width &&
            Math.abs(a.projected.y - b.projected.y) < LINE_HEIGHT;
        return parent
            .selectAll<SVGTextElement, Point<Sample>>('text')
            .data(points)
            .join('text')
            .attr('x', (d) => d.projected.x + dx)
            .attr(
                'y',
                (d, k) =>
                    d.projected.y +
                    LINE_HEIGHT * points.slice(0, k).filter((e) => overlap(e, d)).length
            )
            .text((d) => d.id);
    }

    /**
     * Draws the past or the future into one side of the plane. A stay runs
     * exactly along its station, so the stations go under the paths, and
     * the pieces of the paths and the drop lines sort by their depth.
     */
    function drawSide(
        { slot, stationGroup, pathGroup }: ReturnType<typeof side>,
        kind: 'past' | 'future',
        stations: Sample[][],
        pieces: Sample[][],
        drops: Sample[][]
    ): void {
        slot.attr('class', `stc-${kind}`);
        stationGroup
            .selectAll<SVGLineElement, Line<Sample>>('line')
            .data(lines3d.data(stations))
            .join('line')
            .call(placeSegments);
        joinStrips(pathGroup, pieces);
        pathGroup
            .selectAll<SVGLineElement, Line<Sample>>('line')
            .data(lines3d.data(drops))
            .join('line')
            .call(placeSegments)
            .call(byPerson);
        pathGroup.selectAll<SVGElement, HasCentroid>('path, line').sort(sort);
    }

    /** Turns the scene and draws the box, the floor, both sides of the plane and the markers. */
    function render(): void {
        camera.perspective(perspective.checked ? EYE : Infinity);
        pose(camera, VIEW, yaw, pitch);

        drawChartBox(wallGroup, axisGroup, box3d, spec, tickLabel, (axis) => AXIS_TITLES[axis]);
        // The times of day are wider than the numbers the titles clear, so the
        // title of the time axis moves further out.
        axisGroup
            .selectAll<SVGTextElement, AxisEdge>('text.axis-title')
            .attr('dx', (d) => (d.axis === 'z' ? d.normal.x * TITLE_SHIFT : 0))
            .attr('dy', (d) => (d.axis === 'z' ? d.normal.y * TITLE_SHIFT : 0));

        joinStrips(routeGroup, routes);
        writeLabels(placeGroup, dots3d.data(PLACE_IDS.map((id) => at(id, START))), 6, 48);

        // Every path splits at t: the samples up to t and the position at t
        // are the past, the position at t and the samples after it the
        // future. The position at t lies between the two nearest samples.
        const i = (t - START) * PER_HOUR;
        const k = Math.min(Math.floor(i), SAMPLES - 2);
        const heads = paths.map((s) => interpolateObject(s[k], s[k + 1])(i - k));
        const past = paths.flatMap((s, p) => strips([...s.slice(0, k + 1), heads[p]], CHUNK));
        const future = paths.flatMap((s, p) => strips([heads[p], ...s.slice(k + 1)], CHUNK));
        const drops = heads.map((head) => [head, { ...head, z: START }]);
        const lower = PLACE_IDS.map((id) => [at(id, START), at(id, t)]);
        const upper = PLACE_IDS.map((id) => [at(id, t), at(id, END)]);

        // The eye sits at the center plus the distance times the view
        // direction: infinitely far up in the orthographic view. Heights grow
        // towards a negative y. The side of the plane the eye is on is
        // painted over the plane, the other side under it.
        const eye = -(VIEW.center.y + camera.perspective() * camera.viewDirection().y);
        const [pastSide, futureSide] = eye > hours(t) ? [far, near] : [near, far];
        drawSide(pastSide, 'past', lower, past, drops);
        drawSide(futureSide, 'future', upper, future, []);

        const corners = [
            [0, 0],
            [MAP, 0],
            [MAP, MAP],
            [0, MAP]
        ].map(([x, y]) => ({ x, y, z: t }));
        planePath.attr('d', plane3d.draw(plane3d.data([corners])[0]));

        // A ring marks every place where people meet, and a marker everyone.
        const meetings = meetingsAt(t);
        markerGroup
            .selectAll<SVGCircleElement, Point<Sample>>('circle.ring')
            .data(dots3d.data(meetings.map(([place]) => at(place, t))))
            .join('circle')
            .attr('class', 'ring')
            .attr('cx', (d) => d.projected.x)
            .attr('cy', (d) => d.projected.y)
            .attr('r', RING);
        const markers = dots3d.data(heads);
        markerGroup
            .selectAll<SVGCircleElement, Point<Sample>>('circle.marker')
            .data(markers)
            .join('circle')
            .attr('class', 'marker')
            .classed('is-faded', (d) => faded(d.id))
            .style('fill', (d) => colorOf(d.id))
            .attr('cx', (d) => d.projected.x)
            .attr('cy', (d) => d.projected.y)
            .attr('r', MARKER)
            .sort(sort);
        writeLabels(markerGroup, markers, MARKER + 5, 10).classed('is-faded', (d) => faded(d.id));

        scrub.valueAsNumber = t * 60;
        clockText.textContent = clock(t);
        radios.forEach((radio) => (radio.checked = radio.value === selected));
        select(whereabouts)
            .selectAll('li')
            .data(PEOPLE)
            .join('li')
            .text(({ id, stays }) => {
                const { place, moving } = whereAt(stays, t);
                return `${id} · ${moving ? 'on the way to' : 'at'} ${PLACES[place].name}`;
            });
        meetingText.textContent = `meetings: ${describe(meetings)}`;
    }

    // One frame of the playback: the day moves on and wraps from 22:00 to 6:00.
    const play = playback(button, (elapsed) => {
        // The time waits while the reader holds the slider.
        if (!scrub.matches(':active')) {
            t = START + ((t - START + elapsed * RATE) % (END - START));
        }
        render();
    });

    scrub.addEventListener('input', () => {
        t = scrub.valueAsNumber / 60;
        render();
    });
    host.querySelector('fieldset')!.addEventListener('change', (event) => {
        selected = (event.target as HTMLInputElement).value;
        render();
    });
    perspective.addEventListener('change', render);

    // The arrows step the time, Space plays and pauses, the digits pick a
    // person and 0 or Escape all of them.
    svg.on('keydown', (event: KeyboardEvent) => {
        // Cmd and Ctrl keep their browser shortcuts.
        if (event.metaKey || event.ctrlKey) {
            return;
        }
        const step = STEPS[event.key];
        const person = ['0', 'Escape'].includes(event.key) ? '' : PEOPLE[Number(event.key) - 1]?.id;
        let note = '';
        if (step) {
            t = clamp(t + step * (event.shiftKey ? 1 : KEY_STEP), START, END);
        } else if (event.key === ' ') {
            button.node()!.click();
            note = button.text() === 'pause' ? 'Playing. ' : 'Paused. ';
        } else if (person !== undefined) {
            selected = person;
            note = person ? `Showing ${person}. ` : 'Showing everyone. ';
        } else {
            return;
        }
        event.preventDefault();
        render();
        status.textContent = `${note}${clock(t)}, meetings: ${describe(meetingsAt(t))}.`;
    });

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    t = reducedMotion ? STILL : START;
    render();
    play(!reducedMotion);

    return () => {
        play(false);
        host.innerHTML = '';
        host.classList.remove('space-time-cube');
    };
}

// The styles of the figure, scoped by the class of its host. VitePress puts
// the class `dark` on the root element in dark mode.
const STYLES = `
.space-time-cube {
    --stc-ink: #1b1e21;
    --stc-muted: #5f6468;
    --stc-button: #f0f1f1;
    --stc-line: #c4c7c9;
    --stc-bg: #ffffff;
    --stc-wall: #888888;
    --stc-plane: #5f6468;
    --stc-plane-opacity: 0.14;
    --stc-a: #2a78d6;
    --stc-b: #eb6834;
    --stc-c: #1baf7a;
    --stc-d: #eda100;
    margin: 1.5rem 0;
    position: relative;
    overflow: hidden;
    border: 1px solid var(--stc-line);
    border-radius: 12px;
    background: var(--stc-bg);
    color: var(--stc-ink);
}

/* The dark mode steps the same four hues for its own surface. */
.dark .space-time-cube {
    --stc-ink: #e6e8e9;
    --stc-muted: #9aa0a4;
    --stc-button: #17181a;
    --stc-line: #3d4144;
    --stc-bg: #0c0d0e;
    --stc-plane: #9aa0a4;
    --stc-plane-opacity: 0.16;
    --stc-a: #3987e5;
    --stc-b: #d95926;
    --stc-c: #199e70;
    --stc-d: #c98500;
}

.space-time-cube .stc-svg {
    display: block;
    width: 100%;
    height: auto;
    cursor: grab;
    touch-action: none;
}

.space-time-cube .stc-svg:active {
    cursor: grabbing;
}

/* The browser rings a focused SVG on every click: keep the ring for the keyboard. */
.space-time-cube .stc-svg:focus {
    outline: none;
}

.space-time-cube .stc-svg:focus-visible {
    outline: 2px solid var(--stc-ink);
    outline-offset: -4px;
}

.space-time-cube .stc-walls path {
    fill: var(--stc-wall);
    fill-opacity: 0.06;
    stroke: var(--stc-wall);
    stroke-opacity: 0.4;
    stroke-width: 0.5;
}

.space-time-cube .axis-line {
    stroke-width: 1.5;
}

.space-time-cube .tick-mark {
    stroke: currentColor;
    stroke-opacity: 0.6;
}

.space-time-cube text {
    font-family: system-ui, sans-serif;
    dominant-baseline: central;
}

.space-time-cube .tick-label {
    font-size: 10px;
    fill: currentColor;
}

.space-time-cube .axis-title {
    text-anchor: middle;
    font-size: 13px;
    font-weight: 600;
}

.space-time-cube .stc-routes path {
    fill: none;
    stroke-width: 1.5;
    stroke-opacity: 0.35;
    stroke-linejoin: round;
}

.space-time-cube .stc-places text {
    font-size: 11px;
    fill: var(--stc-muted);
}

.space-time-cube .stc-stations line {
    stroke: var(--stc-muted);
    stroke-width: 1;
    stroke-dasharray: 2 3;
}

.space-time-cube .stc-paths path {
    fill: none;
    stroke-width: 2.5;
    stroke-linejoin: round;
}

.space-time-cube .stc-paths line {
    stroke-width: 1;
    stroke-opacity: 0.7;
}

/* The future is faded and dashed: what has not happened yet. */
.space-time-cube .stc-future path {
    stroke-width: 2;
    stroke-opacity: 0.5;
    stroke-dasharray: 5 3;
}

.space-time-cube .stc-future line {
    stroke-opacity: 0.5;
}

.space-time-cube .stc-plane {
    fill: var(--stc-plane);
    fill-opacity: var(--stc-plane-opacity);
    stroke: var(--stc-ink);
    stroke-opacity: 0.35;
    stroke-width: 1;
}

.space-time-cube .stc-markers .marker {
    stroke: var(--stc-bg);
    stroke-width: 2;
}

.space-time-cube .stc-markers .ring {
    fill: none;
    stroke: var(--stc-ink);
    stroke-width: 1.5;
}

.space-time-cube .stc-markers text {
    font-size: 12px;
    font-weight: 600;
    fill: var(--stc-ink);
}

.space-time-cube .is-faded {
    opacity: 0.15;
}

.space-time-cube .stc-button {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    padding: 0.35rem 0.9rem;
    border: 1px solid var(--stc-line);
    border-radius: 8px;
    background: var(--stc-button);
    color: var(--stc-ink);
    font-size: 0.85rem;
    cursor: pointer;
}

.space-time-cube .stc-button:hover {
    border-color: var(--stc-ink);
}

.space-time-cube .stc-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 1.5rem;
    padding: 0.75rem;
    border-top: 1px solid var(--stc-line);
    font-size: 0.85rem;
}

.space-time-cube .stc-controls label {
    display: flex;
    align-items: center;
    gap: 0.4rem;
}

/* The slider takes the room the other controls leave. */
.space-time-cube .stc-controls > label:first-child {
    flex: 1 1 16rem;
}

.space-time-cube .stc-controls input[type='range'] {
    flex: 1;
}

.space-time-cube .stc-clock {
    min-width: 2.5em;
    font-variant-numeric: tabular-nums;
}

.space-time-cube fieldset {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 0;
    padding: 0;
    border: 0;
}

/* A floated legend leaves the border of the fieldset and lines up with the radios. */
.space-time-cube legend {
    float: left;
    padding: 0;
}

.space-time-cube .swatch {
    width: 0.6rem;
    height: 0.6rem;
    border-radius: 50%;
}

/* Where everyone is, a person to a line on a narrow screen, and the meetings below. */
.space-time-cube .stc-where {
    display: flex;
    flex: 1 1 100%;
    flex-wrap: wrap;
    gap: 0 1.25em;
    margin: 0;
    padding: 0;
    list-style: none;
}

.space-time-cube .stc-where li {
    margin: 0;
}

.space-time-cube .stc-readout {
    flex: 1 1 100%;
    margin: 0;
    color: var(--stc-muted);
}

/* The live region speaks for the keys; the readout already shows the same. */
.space-time-cube .stc-status {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
}
`;
