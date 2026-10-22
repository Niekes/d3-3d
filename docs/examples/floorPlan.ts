import {
    easeCubicInOut,
    format,
    interpolateLab,
    interpolateNumber,
    least,
    piecewise,
    polygonCentroid,
    quantize,
    select,
    sum
} from 'd3';
import type { Selection } from 'd3';
import { camera3D, planes3D, points3D, polygons3D, sort } from '../../index';
import type { Plane, Point, Point3D, Polygon, ShapeInstance, TransformedPoint } from '../../index';
import { rotatingFigure } from './rotatingFigure';

/*
 * A layered floor plan: four floors of one building, each a slab drawn with
 * planes3D and its rooms drawn with polygons3D, colored by how many of their
 * seats are taken. The spread is an offset in the y accessor, so the floors
 * part along the building's own axis. Every vertex carries its floor and its
 * room through the projection, so a click on a path knows what it hit. The
 * figure brings its own styles, so the module works without a stylesheet.
 */

const ORIGIN = { x: 480, y: 250 };
const SCALE = 24;
const START_YAW = Math.PI / 6;
const START_TILT = Math.PI / 9;
// The height of a storey, and the space a fully spread floor adds to it.
const STOREY = 0.6;
const GAP = 3.6;
const DURATION = 900;

// The colors of both themes. `light-dark()` follows the color-scheme of the
// page, so a theme switch recolors the figure without a redraw, and a page
// that sets no color-scheme gets the light colors. It is CSS, not an SVG
// attribute value, so the colors are set with `style`.
const INK = 'light-dark(#1b1e21, #e6e8e9)';
const MUTED = 'light-dark(#5f6468, #a3a8ab)';
const LINE = 'light-dark(#c4c7c9, #3d4144)';
const PAPER = 'light-dark(#ffffff, #0c0d0e)';
const SLAB = 'light-dark(#e4e6e7, #26292b)';
const BUTTON = 'light-dark(#f0f1f1, #17181a)';

type Plan = [number, number][];

/** A room as it is written down: its outline on the plan and its seats. */
type RoomSpec = { name: string; seats: number; people: number; plan: Plan };

/** A room in the building: the spec, its floor and an id for the joins. */
type Room = RoomSpec & { id: string; floor: number };

/** One vertex of a slab: a point on the plan and the floor it lies on. */
type FloorVertex = { x: number; z: number; floor: number };

/** One vertex of a room: a slab vertex that also carries its room. */
type RoomVertex = FloorVertex & { room: Room };

/** One floor after the projection, sorted by the depth of its slab. */
type FloorView = {
    floor: number;
    slab: Plane<FloorVertex>;
    rooms: Polygon<RoomVertex>[];
    labels: Point<RoomVertex>[];
    corner: TransformedPoint<FloorVertex>;
    centroid: Point3D;
};

const rect = (x0: number, z0: number, x1: number, z1: number): Plan => [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1]
];

// Every floor shares the footprint, 12 by 8 plan units. A corridor along the
// middle is left free, so the slab shows through and a click on it picks the
// floor. Every floor has one L-shaped room, which a plane cannot draw.
const FOOTPRINT = rect(-6, -4, 6, 4);

const FLOORS: { name: string; rooms: RoomSpec[] }[] = [
    {
        name: 'Ground floor',
        rooms: [
            {
                name: 'Lobby',
                seats: 40,
                people: 12,
                plan: [
                    [-6, -4],
                    [-3, -4],
                    [-3, 0.75],
                    [-1, 0.75],
                    [-1, 4],
                    [-6, 4]
                ]
            },
            { name: 'Café', seats: 30, people: 27, plan: rect(-1, 0.75, 3, 4) },
            { name: 'Mail room', seats: 4, people: 0, plan: rect(3, 0.75, 6, 4) },
            { name: 'Bike store', seats: 20, people: 9, plan: rect(-3, -4, 1, -0.75) },
            { name: 'Security', seats: 6, people: 6, plan: rect(1, -4, 6, -0.75) }
        ]
    },
    {
        name: 'Floor 1',
        rooms: [
            {
                name: 'Open office',
                seats: 48,
                people: 36,
                plan: [
                    [1, -4],
                    [6, -4],
                    [6, 4],
                    [3, 4],
                    [3, -0.75],
                    [1, -0.75]
                ]
            },
            { name: 'Meeting A', seats: 10, people: 8, plan: rect(-6, -4, -3, -0.75) },
            { name: 'Meeting B', seats: 20, people: 14, plan: rect(-3, -4, 1, -0.75) },
            { name: 'Kitchen', seats: 12, people: 3, plan: rect(-6, 0.75, -2, 4) },
            { name: 'Quiet room', seats: 8, people: 1, plan: rect(-2, 0.75, 3, 4) }
        ]
    },
    {
        name: 'Floor 2',
        rooms: [
            {
                name: 'Open office',
                seats: 48,
                people: 44,
                plan: [
                    [-6, -4],
                    [-1, -4],
                    [-1, -0.75],
                    [-3, -0.75],
                    [-3, 4],
                    [-6, 4]
                ]
            },
            { name: 'Focus rooms', seats: 6, people: 2, plan: rect(-1, -4, 2, -0.75) },
            { name: 'Meeting C', seats: 12, people: 12, plan: rect(2, -4, 6, -0.75) },
            { name: 'Library', seats: 16, people: 5, plan: rect(-3, 0.75, 2, 4) },
            { name: 'Lab', seats: 10, people: 7, plan: rect(2, 0.75, 6, 4) }
        ]
    },
    {
        name: 'Floor 3',
        rooms: [
            {
                name: 'Event space',
                seats: 80,
                people: 20,
                plan: [
                    [-6, -0.75],
                    [-4, -0.75],
                    [-4, 0.75],
                    [2, 0.75],
                    [2, 4],
                    [-6, 4]
                ]
            },
            { name: 'Board room', seats: 14, people: 11, plan: rect(2, 0.75, 6, 4) },
            { name: 'Lounge', seats: 18, people: 15, plan: rect(-6, -4, 0, -0.75) },
            { name: 'Studio', seats: 10, people: 4, plan: rect(0, -4, 6, -0.75) }
        ]
    }
];

const ROOMS: Room[] = FLOORS.flatMap(({ rooms }, floor) =>
    rooms.map((spec, i) => ({ ...spec, id: `room-${floor}-${i}`, floor }))
);

const roomsOf = (floor: number) => ROOMS.filter((room) => room.floor === floor);

const occupancy = (rooms: Room[]) =>
    sum(rooms, (room) => room.people) / sum(rooms, (room) => room.seats);

// The input of the renderers, built once: the room on every vertex survives
// the projection, so the paths and the labels know their room.
const roomVertex =
    (room: Room) =>
    ([x, z]: [number, number]): RoomVertex => ({ x, z, floor: room.floor, room });

const SLABS: FloorVertex[][] = FLOORS.map((_, floor) =>
    FOOTPRINT.map(([x, z]) => ({ x, z, floor }))
);
const OUTLINES: RoomVertex[][] = ROOMS.map((room) => room.plan.map(roomVertex(room)));
// The library's centroid averages the vertices, which can miss an L; the
// labels sit at the centroid of the area instead.
const ANCHORS: RoomVertex[] = ROOMS.map((room) => roomVertex(room)(polygonCentroid(room.plan)));

// One blue from light to dark for the occupancy. The dark mode runs it the
// other way, so an empty room recedes into the dark page as it does into the
// light one.
const BLUES = ['#cde2fb', '#86b6ef', '#3987e5', '#1c5cab', '#0d366b'];
const light = piecewise(interpolateLab, BLUES);
const dark = piecewise(interpolateLab, [...BLUES].reverse());
const shade = (t: number) => `light-dark(${light(t)}, ${dark(t)})`;

const percent = format('.0%');

/** What the inspector says about the selected floor or room. */
function describe(floor: number | undefined, room: Room | undefined): string {
    if (room) {
        return `${FLOORS[room.floor].name}, ${room.name}: ${room.people} of ${room.seats} seats taken, ${percent(room.people / room.seats)} occupied.`;
    }
    if (floor === undefined) {
        return 'Click a floor or a room to inspect it.';
    }
    const rooms = roomsOf(floor);
    return `${FLOORS[floor].name}: ${rooms.length} rooms, ${sum(rooms, (d) => d.people)} of ${sum(rooms, (d) => d.seats)} seats taken, ${percent(occupancy(rooms))} occupied.`;
}

/** How the arrow keys move the selection: by floor and by room. */
const STEPS: Record<string, [number, number]> = {
    ArrowUp: [1, 0],
    ArrowDown: [-1, 0],
    ArrowRight: [0, 1],
    ArrowLeft: [0, -1]
};

// A key turns the building by 15°, and the zoom stays between half and three
// times the start.
const TURN = Math.PI / 12;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** Every control of the figure, as listed under it. */
const CONTROLS: [string, string][] = [
    ['Drag', 'rotate'],
    ['<kbd>Shift</kbd> + drag', 'turn, keeping the building upright'],
    ['<kbd>Ctrl</kbd> / <kbd>⌘</kbd> + wheel, or pinch', 'zoom'],
    ['Point at a room', 'show its name'],
    ['Click', 'select a room, or a floor by its corridor or its label'],
    ['<kbd>↑</kbd> <kbd>↓</kbd>', 'walk through the floors'],
    ['<kbd>←</kbd> <kbd>→</kbd>', 'walk through the rooms of a floor'],
    ['<kbd>Shift</kbd> + arrow keys', 'rotate'],
    ['<kbd>+</kbd> <kbd>−</kbd>', 'zoom'],
    ['<kbd>S</kbd>', 'stack or spread the floors'],
    ['<kbd>R</kbd>', 'reset the rotation and the zoom'],
    ['<kbd>Esc</kbd>', 'clear the selection']
];

/** The room a path under the pointer belongs to: every vertex carries it. */
const roomAt = (target: Element) =>
    target.matches('.room')
        ? select<Element, Polygon<RoomVertex>>(target).datum()[0].room
        : undefined;

/**
 * Styles a group of room names. A halo in the page color keeps a name
 * legible on a light room and on a dark one, and the names let the clicks
 * through to their room.
 */
function roomNames(g: Selection<SVGGElement, any, any, any>): void {
    g.attr('font-size', 11)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('paint-order', 'stroke')
        .attr('stroke-width', 3)
        .attr('stroke-linejoin', 'round')
        .attr('pointer-events', 'none')
        .style('fill', INK)
        .style('stroke', PAPER);
}

/**
 * Mounts the figure into `host` and returns a function that removes it.
 */
export function mountFloorPlan(host: HTMLElement): () => void {
    // The state: every source of motion writes it, and `render` reads it.
    let yaw = 0;
    let pitch = 0;
    let zoom = 1;
    let spread = 1;
    let floor: number | undefined;
    let room: Room | undefined;
    let hovered: Room | undefined;
    // Whether Shift was down at the last pointer event, and the drag totals
    // the scaffold reported last.
    let shift = false;
    let dragged = { yaw: 0, pitch: 0 };

    /** How high a floor sits above the middle of the building. */
    const elevation = (f: number) => (f - (FLOORS.length - 1) / 2) * (STOREY + GAP * spread);

    const slabs3d = planes3D<FloorVertex>();
    const rooms3d = polygons3D<RoomVertex>();
    const anchors3d = points3D<RoomVertex>();

    // The renderers hang on one camera, so turning or zooming it moves them
    // all. The spread lives in the y accessor, before the rotation, so the
    // floors part along the building's own axis. The screen y grows downwards.
    const camera = camera3D().origin(ORIGIN);
    const renderers: ShapeInstance<any>[] = [slabs3d, rooms3d, anchors3d];
    for (const renderer of renderers) {
        renderer.camera(camera).y((d: FloorVertex) => -elevation(d.floor));
    }

    // The scaffold reports the total of every drag so far. The figure turns
    // by the change since the last report, so the keys can turn it too, and
    // with Shift it drops the tilt, so the building stays upright.
    const { group, button } = rotatingFigure(
        host,
        'plan',
        'Four floors of a building with their rooms colored by occupancy. Drag it to rotate it and click a floor or a room to inspect it. With the figure focused, the arrow keys move the selection, Shift with the arrow keys rotates the building, plus and minus zoom, S stacks or spreads the floors and R resets the view.',
        (dragYaw, dragPitch) => {
            turn(dragYaw - dragged.yaw, shift ? 0 : dragPitch - dragged.pitch);
            dragged = { yaw: dragYaw, pitch: dragPitch };
        }
    );

    // The box, the button and the controls are HTML and take their styles
    // inline. The browser rings the focused SVG for the keyboard only.
    select(host).attr(
        'style',
        `position: relative; overflow: hidden; margin: 1.5rem 0; border: 1px solid ${LINE}; border-radius: 12px; background: ${PAPER}; color: ${INK}`
    );
    button.attr(
        'style',
        `position: absolute; top: 0.75rem; right: 0.75rem; padding: 0.35rem 0.9rem; border: 1px solid ${LINE}; border-radius: 8px; background: ${BUTTON}; color: ${INK}; font-size: 0.85rem; cursor: pointer`
    );
    group.attr('font-family', 'system-ui, sans-serif');

    // The name of the room under the pointer sits above every floor, so a
    // faded floor names its rooms too.
    const floorGroup = group.append('g');
    const hoverName = group.append('g').call(roomNames).append('text');

    const row = 'display: flex; align-items: center; gap: 0.5rem';
    host.insertAdjacentHTML(
        'beforeend',
        `<div style="display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 1.5rem; padding: 0.75rem; border-top: 1px solid ${LINE}; font-size: 0.85rem">
            <label style="${row}">spread <input name="spread" type="range" min="0" max="1" step="0.01"><output style="min-width: 2.5em; font-variant-numeric: tabular-nums"></output></label>
            <span style="${row}">occupancy <span style="color: ${MUTED}">0%</span><i style="width: 8rem; height: 0.6rem; border-radius: 3px; background: linear-gradient(to right, ${quantize(shade, 11).join(', ')})"></i><span style="color: ${MUTED}">100%</span></span>
            <p class="plan-inspector" aria-live="polite" style="flex: 1 1 16rem; margin: 0; min-height: 3em; line-height: 1.5; font-variant-numeric: tabular-nums"></p>
            <details style="flex-basis: 100%; line-height: 1.5">
                <summary style="cursor: pointer">Controls</summary>
                <dl style="display: grid; grid-template-columns: max-content 1fr; gap: 0.3rem 1rem; margin: 0.5rem 0 0">
                    ${CONTROLS.map(([input, effect]) => `<dt>${input}</dt><dd style="margin: 0; color: ${MUTED}">${effect}</dd>`).join('')}
                </dl>
                <p style="margin: 0.5rem 0 0; line-height: 1.5; color: ${MUTED}">The keys work while the figure has the focus: click it or tab to it.</p>
            </details>
        </div>`
    );

    const svg = select(host)
        .select<SVGSVGElement>('svg')
        .attr('tabindex', 0)
        .attr(
            'style',
            'display: block; width: 100%; height: auto; cursor: grab; touch-action: none'
        );
    const slider = host.querySelector('[name=spread]') as HTMLInputElement;
    const inspector = host.querySelector('.plan-inspector') as HTMLElement;

    /** Projects the floors and paints them back to front, the rooms on their slab. */
    function render(): void {
        camera
            .scale(SCALE * zoom)
            .rotateY(yaw + START_YAW)
            .rotateX(-pitch - START_TILT);

        const rooms = rooms3d.data(OUTLINES);
        const anchors = anchors3d.data(ANCHORS);
        const views: FloorView[] = slabs3d.data(SLABS).map((slab, f) => ({
            floor: f,
            slab,
            rooms: rooms.filter((d) => d[0].floor === f),
            labels: f === floor ? anchors.filter((d) => d.floor === f) : [],
            corner: least(slab, (p) => p.projected.x)!,
            centroid: slab.centroid
        }));

        // The slabs are parallel and share one footprint, so the depth of
        // their centres orders them exactly. The rooms of a floor lie in one
        // plane and never overlap, so they need no sort of their own. The
        // other floors fade, so the selected one shows through the floors
        // above it.
        const floors = floorGroup
            .selectAll<SVGGElement, FloorView>('g.floor')
            .data(views, (d) => d.floor)
            .join((enter) => {
                const g = enter.append('g').attr('class', 'floor');
                g.append('path')
                    .attr('class', 'slab')
                    .attr('stroke-linejoin', 'round')
                    .style('fill', SLAB)
                    .style('stroke', LINE);
                g.append('g').attr('class', 'rooms').attr('stroke-linejoin', 'round');
                g.append('g').attr('class', 'labels').call(roomNames);
                g.append('text')
                    .attr('class', 'floor-label')
                    .attr('font-size', 12)
                    .attr('font-weight', 600)
                    .attr('text-anchor', 'end')
                    .attr('dominant-baseline', 'central')
                    .style('fill', INK)
                    .text(
                        (d) => `${FLOORS[d.floor].name} · ${percent(occupancy(roomsOf(d.floor)))}`
                    );
                return g;
            })
            .attr('opacity', (d) => (floor === undefined || d.floor === floor ? 1 : 0.25))
            .sort(sort);

        floors.select('.slab').attr('d', (d) => slabs3d.draw(d.slab));

        // A stroke in the page color parts the rooms like a wall, and the
        // selected room is drawn round in ink.
        floors
            .select('.rooms')
            .selectAll<SVGPathElement, Polygon<RoomVertex>>('path')
            .data(
                (d) => d.rooms,
                (d) => d[0].room.id
            )
            .join((enter) =>
                enter
                    .append('path')
                    .attr('class', 'room')
                    .style('fill', (d) => shade(d[0].room.people / d[0].room.seats))
            )
            .attr('stroke-width', (d) => (d[0].room === room ? 2.5 : 1.5))
            .style('stroke', (d) => (d[0].room === room ? INK : PAPER))
            .attr('d', rooms3d.draw);

        // Only the selected floor names its rooms, so the labels never crowd.
        floors
            .select('.labels')
            .selectAll<SVGTextElement, Point<RoomVertex>>('text')
            .data(
                (d) => d.labels,
                (d) => d.room.id
            )
            .join((enter) => enter.append('text').text((d) => d.room.name))
            .attr('x', (d) => d.projected.x)
            .attr('y', (d) => d.projected.y);

        // The leftmost corner of a slab is always on its outline, so the
        // floor label beside it never covers its own floor.
        floors
            .select('.floor-label')
            .attr('text-decoration', (d) => (d.floor === floor ? 'underline' : null))
            .attr('x', (d) => d.corner.projected.x - 10)
            .attr('y', (d) => d.corner.projected.y);

        // The selected floor names its rooms already.
        const name = anchors.find((d) => d.room === hovered && d.floor !== floor);
        hoverName
            .attr('display', name ? null : 'none')
            .attr('x', name?.projected.x ?? 0)
            .attr('y', name?.projected.y ?? 0)
            .text(name?.room.name ?? '');
    }

    /** Selects a floor, a room on it, or nothing, and describes it. */
    function inspect(nextFloor: number | undefined, nextRoom?: Room): void {
        floor = nextFloor;
        room = nextRoom;
        inspector.textContent = describe(floor, room);
        render();
    }

    /** Turns the building, by the drag or by the keys. */
    function turn(dYaw: number, dPitch: number): void {
        yaw += dYaw;
        pitch += dPitch;
        render();
    }

    /** Zooms by a factor, within the limits. */
    function zoomBy(factor: number): void {
        zoom = clamp(zoom * factor, MIN_ZOOM, MAX_ZOOM);
        render();
    }

    /** Turns the building back to the start and zooms out. */
    function resetView(): void {
        yaw = 0;
        pitch = 0;
        zoom = 1;
        render();
    }

    /** Walks the selection by a floor or a room. The first step selects the ground floor. */
    function walk([up, next]: [number, number]): void {
        if (floor === undefined) {
            inspect(0);
        } else if (up) {
            inspect(clamp(floor + up, 0, FLOORS.length - 1));
        } else {
            const rooms = roomsOf(floor);
            const i = room ? rooms.indexOf(room) + next : next > 0 ? 0 : rooms.length - 1;
            inspect(floor, rooms[(i + rooms.length) % rooms.length]);
        }
    }

    /** Sets the spread, mirrors it on the slider and the button, and draws it. */
    function setSpread(amount: number): void {
        spread = amount;
        slider.valueAsNumber = amount;
        slider.nextElementSibling!.textContent = `${Math.round(amount * 100)}%`;
        button.text(amount < 0.5 ? 'spread' : 'stack');
        render();
    }

    /**
     * Stacks a spread building or spreads a stacked one. It tweens the
     * spread, not the paths, so a drag during the animation keeps turning
     * the building.
     */
    function toggleSpread(): void {
        const target = spread < 0.5 ? 1 : 0;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setSpread(target);
            return;
        }
        select(host)
            .transition('spread')
            .duration(DURATION)
            .ease(easeCubicInOut)
            .tween('spread', () => {
                const amount = interpolateNumber(spread, target);
                return (t) => setSpread(amount(t));
            });
    }

    button.on('click', toggleSpread);

    slider.addEventListener('input', () => {
        select(host).interrupt('spread');
        setSpread(slider.valueAsNumber);
    });

    // A room path carries its room on every vertex, a slab and its label
    // their floor. d3.drag swallows the click that ends a drag, so turning
    // the building never selects anything.
    svg.on('click', (event: MouseEvent) => {
        const target = event.target as Element;
        const picked = roomAt(target);
        if (picked) {
            inspect(picked.floor, picked);
            return;
        }
        inspect(
            target.matches('.slab, .floor-label')
                ? select<Element, FloorView>(target).datum().floor
                : undefined
        );
    });

    // The room under the pointer names itself. A drag turns the building and
    // names nothing. Every pointer event also tells the drag about Shift.
    svg.on('pointerdown', (event: PointerEvent) => {
        shift = event.shiftKey;
    })
        .on('pointermove', (event: PointerEvent) => {
            shift = event.shiftKey;
            const next = event.buttons === 0 ? roomAt(event.target as Element) : undefined;
            if (next !== hovered) {
                hovered = next;
                render();
            }
        })
        .on('pointerleave', () => {
            hovered = undefined;
            render();
        });

    // Ctrl or ⌘ with the wheel zooms, and so does a pinch on a trackpad,
    // which the browser reports as a wheel with Ctrl. The plain wheel still
    // scrolls the page. The step is the one of d3-zoom, lines turned into
    // pixels and a pinch ten times as fast, capped so that one notch of a
    // mouse wheel with Ctrl does not jump.
    svg.on(
        'wheel',
        (event: WheelEvent) => {
            if (!event.ctrlKey && !event.metaKey) {
                return;
            }
            event.preventDefault();
            const step =
                -event.deltaY * (event.deltaMode ? 0.05 : 0.002) * (event.ctrlKey ? 10 : 1);
            zoomBy(2 ** clamp(step, -0.5, 0.5));
        },
        { passive: false }
    );

    /** What the other keys do while the figure has the focus. */
    const actions: Record<string, () => void> = {
        escape: () => inspect(undefined),
        '+': () => zoomBy(1.25),
        '=': () => zoomBy(1.25),
        '-': () => zoomBy(0.8),
        s: toggleSpread,
        r: resetView
    };

    // The arrow keys walk the selection, and with Shift they turn the
    // building. A key with Ctrl, ⌘ or Alt is left to the browser.
    svg.on('keydown', (event: KeyboardEvent) => {
        if (event.ctrlKey || event.metaKey || event.altKey) {
            return;
        }
        const step = STEPS[event.key];
        const action = step
            ? () => (event.shiftKey ? turn(step[1] * TURN, -step[0] * TURN) : walk(step))
            : actions[event.key.toLowerCase()];
        if (!action) {
            return;
        }
        event.preventDefault();
        action();
    });

    inspector.textContent = describe(floor, room);
    setSpread(spread);

    return () => {
        select(host).interrupt('spread').attr('style', null);
        host.innerHTML = '';
    };
}
