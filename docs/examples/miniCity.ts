import { format, polygonHull, randomInt, randomLcg, range, select } from 'd3';
import { box, camera3D, cubes3D, normal, polygons3D, sort } from '../../index';
import type { CubeFace, Point3D, Polygon } from '../../index';
import { rotatingFigure, turnCamera } from './rotatingFigure';
import './miniCity.css';

/*
 * A mini city: sixteen low-poly buildings on a grid of streets, lit by a sun
 * that the slider moves across the sky. Every piece of a building is one
 * cubes3D hexahedron - a box, a tapered shaft, a gable roof or a spire,
 * depending on where its four top vertices sit. Every face is shaded by the
 * angle it makes with the sun, and every building casts its shadow on the
 * ground. Every vertex carries its building through the projection, so a
 * click on a face knows which building's stats to show.
 */

const ORIGIN = { x: 480, y: 290 };
const SCALE = 20;
const START_YAW = Math.PI / 6;
const START_TILT = Math.PI / 6;
// The lots along every street, the size of a lot and the width of a street,
// in model units. A storey is 0.4 units and a unit is 8 m, so a storey is 3.2 m.
const N = 4;
const LOT = 4;
const STREET = 1.6;
const STOREY = 0.4;
const METRES = 8;
const ROOF = 0.8;
const SPIRE = 2;

// The day: the sun rises at 6:00 and sets at 20:00, never lower than 10°,
// so the shadows stay finite, and 60° high at noon.
const DAWN = 6;
const DUSK = 20;
const LOW_SUN = (10 * Math.PI) / 180;
const HIGH_SUN = (60 * Math.PI) / 180;
const START_HOUR = 16;
// The light a face gets that turns away from the sun, and how warm the
// light is at the lowest sun, in percent.
const AMBIENT = 0.45;
const WARM = 45;

/** What a kind of building looks like and who it holds. */
type Kind = {
    name: 'house' | 'office' | 'tower';
    floors: [number, number];
    size: number;
    // The floor space per occupant, in square metres.
    space: number;
    people: 'Residents' | 'Jobs';
};

// The floors run from the first number up to, but not including, the second.
// Nothing is lower than 16 m, a house of three storeys under its roof:
// anything flatter looks odd next to the towers.
const KINDS: Record<string, Kind> = {
    h: {
        name: 'house',
        floors: [3, 5],
        size: 2.6,
        space: 40,
        people: 'Residents'
    },
    o: {
        name: 'office',
        floors: [5, 11],
        size: 3.2,
        space: 12,
        people: 'Jobs'
    },
    t: {
        name: 'tower',
        floors: [10, 25],
        size: 2.8,
        space: 30,
        people: 'Residents'
    }
};

// The city, street by street: h is a house, o an office and t a tower, so
// the towers make a downtown in the middle.
const LAYOUT = ['hoho', 'otth', 'htto', 'ohoh'];
const STREETS = ['Harbor Street', 'Mill Lane', 'Station Road', 'Park Avenue'];

type Part = 'body' | 'roof' | 'crown' | 'spire';

/** A building and its stats. Its pieces are the hexahedra cubes3D draws. */
type Building = {
    id: string;
    name: string;
    kind: Kind;
    row: number;
    col: number;
    cx: number;
    cz: number;
    floors: number;
    height: number;
    occupants: number;
    year: number;
    pieces: CityVertex[][];
};

/** One vertex of a piece: a point that carries its building and its part. */
type CityVertex = Point3D & { building: Building; part: Part };

/** One building after the projection, sorted by the depth of its lot. */
type BuildingView = {
    building: Building;
    faces: CubeFace<CityVertex>[];
    centroid: Point3D;
};

// The stats are random, but seeded, so the city is the same on every load.
const int = randomInt.source(randomLcg(7));

function makeBuilding(row: number, col: number): Building {
    const kind = KINDS[LAYOUT[row][col]];
    const floors = int(...kind.floors)();
    const building = {
        id: `lot-${row}-${col}`,
        name: `${2 * col + 1} ${STREETS[row]}`,
        kind,
        row,
        col,
        cx: (col - (N - 1) / 2) * (LOT + STREET),
        cz: (row - (N - 1) / 2) * (LOT + STREET),
        floors,
        occupants: Math.round((floors * (kind.size * METRES) ** 2) / kind.space),
        year: int(1890, 2025)()
    } as Building;

    /**
     * One piece: a hexahedron centred on the lot, w × d at the height y0 and
     * topW × topD at the height y1. A top of zero width is a ridge, a top of
     * zero size an apex. The screen y grows downwards, so up is negative.
     */
    const piece = (
        part: Part,
        y0: number,
        y1: number,
        w: number,
        d: number,
        topW = w,
        topD = d
    ): CityVertex[] =>
        box({
            x: building.cx,
            y: -y0,
            z: building.cz,
            width: w,
            height: y1 - y0,
            depth: d,
            topWidth: topW,
            topDepth: topD
        }).map((corner) => ({ ...corner, building, part }));

    const s = kind.size;
    const h = floors * STOREY;
    if (kind.name === 'house') {
        // A box under a gable roof, whose ridge runs along x or along z.
        const eave = s + 0.3;
        const [ridgeW, ridgeD] = (row + col) % 2 ? [eave, 0] : [0, eave];
        building.pieces = [
            piece('body', 0, h, s, s),
            piece('roof', h, h + ROOF, eave, eave, ridgeW, ridgeD)
        ];
    } else if (kind.name === 'office') {
        // A box whose top storey is set back.
        building.pieces = [
            piece('body', 0, h - STOREY, s, s),
            piece('crown', h - STOREY, h, 0.6 * s, 0.6 * s)
        ];
    } else {
        // A tapered shaft under a spire.
        building.pieces = [
            piece('body', 0, h, s, s, 0.8 * s, 0.8 * s),
            piece('spire', h, h + SPIRE, 0.4 * s, 0.4 * s, 0, 0)
        ];
    }
    // The top of the last piece is the top of the building.
    building.height = Math.round(-building.pieces[building.pieces.length - 1][0].y * METRES);
    return building;
}

/** The buildings, street by street, then lot by lot. */
const BUILDINGS = range(N).flatMap((row) => range(N).map((col) => makeBuilding(row, col)));

/** A square on the ground. */
const square = (cx: number, cz: number, half: number): Point3D[] => [
    { x: cx - half, y: 0, z: cz - half },
    { x: cx + half, y: 0, z: cz - half },
    { x: cx + half, y: 0, z: cz + half },
    { x: cx - half, y: 0, z: cz + half }
];

/** The streets, one square under the whole city, and a lot under every building. */
const GROUND = [
    square(0, 0, ((N - 1) / 2) * (LOT + STREET) + LOT / 2 + STREET),
    ...BUILDINGS.map((b) => square(b.cx, b.cz, LOT / 2))
];

/**
 * The way to the sun at an hour of the day, as a unit vector. Seen before a
 * drag, the sun rises in front of the city on the right, stands over the
 * left shoulder of the camera at noon and sets behind the city on the left.
 * So the walls the camera sees are in the sun most of the day, and the
 * evening shadows reach towards the camera.
 */
function sunAt(hour: number): Point3D {
    const t = (hour - DAWN) / (DUSK - DAWN);
    const elevation = LOW_SUN + (HIGH_SUN - LOW_SUN) * Math.sin(Math.PI * t);
    const azimuth = START_YAW + Math.PI / 4 + Math.PI * t;
    return {
        x: Math.cos(elevation) * Math.cos(azimuth),
        y: -Math.sin(elevation),
        z: Math.cos(elevation) * Math.sin(azimuth)
    };
}

/**
 * The cosine between a face and the way to the sun. `normal` sums over
 * every edge, so the doubled vertex of a gable or a spire does no harm, and
 * a face without area, the top of a roof, gets no light.
 */
function facing(face: Point3D[], sun: Point3D): number {
    const n = normal(face);
    return n.x * sun.x + n.y * sun.y + n.z * sun.z;
}

/** How bright a surface is at a cosine to the sun, as the percentage CSS mixes in. */
const shade = (cos: number) => `${Math.round(100 * (AMBIENT + (1 - AMBIENT) * Math.max(0, cos)))}%`;

/**
 * The shadow of a building on the ground: every vertex slides down its
 * sunbeam to y = 0, and the hull of them all is the shadow.
 */
function shadowOf(building: Building, sun: Point3D): Point3D[] {
    const points = building.pieces
        .flat()
        .map((p): [number, number] => [p.x - (p.y / sun.y) * sun.x, p.z - (p.y / sun.y) * sun.z]);
    return polygonHull(points)!.map(([x, z]) => ({ x, y: 0, z }));
}

const clamp = (i: number) => Math.max(0, Math.min(N - 1, i));
const thousands = format(',');
const clock = (hour: number) =>
    `${Math.floor(hour)}:${String(Math.floor((hour % 1) * 60)).padStart(2, '0')}`;

/** How the arrow keys move the selection: by street and by lot. */
const STEPS: Record<string, [number, number]> = {
    ArrowUp: [-1, 0],
    ArrowDown: [1, 0],
    ArrowLeft: [0, -1],
    ArrowRight: [0, 1]
};

/** The stats of a building, or a hint. */
function describe(b: Building | undefined): string {
    if (!b) {
        return 'Click a building to see its stats.';
    }
    const rank = 1 + BUILDINGS.filter((other) => other.height > b.height).length;
    const stats: [string, string | number][] = [
        ['Kind', b.kind.name],
        ['Floors', b.floors],
        ['Height', `${b.height} m, #${rank} of ${BUILDINGS.length}`],
        [b.kind.people, thousands(b.occupants)],
        ['Built', b.year]
    ];
    return `<strong>${b.name}</strong><dl>${stats
        .map(([term, value]) => `<div><dt>${term}</dt><dd>${value}</dd></div>`)
        .join('')}</dl>`;
}

/**
 * Mounts the figure into `host` and returns a function that removes it.
 */
export function mountMiniCity(host: HTMLElement): () => void {
    // The state: every source of motion writes it, and `render` reads it.
    let yaw = 0;
    let pitch = 0;
    let hour = START_HOUR;
    let selected: Building | undefined;

    // The buildings and the ground hang on one camera, so turning it turns both.
    const camera = camera3D().scale(SCALE).origin(ORIGIN);
    const cubes = cubes3D<CityVertex>().camera(camera);
    const flat = polygons3D<Point3D>().camera(camera);

    const { group, button } = rotatingFigure(
        host,
        'city',
        'A mini city of sixteen low-poly buildings on a grid of streets, lit by the sun. Drag it to rotate it and click a building to see its stats, or focus it and move the selection with the arrow keys.',
        (dragYaw, dragPitch) => {
            yaw = dragYaw;
            pitch = dragPitch;
            render();
        }
    );

    // The slider sets the time, so the scaffold's button has nothing to do.
    button.remove();

    // The ground and the shadows on it lie under every building, so they
    // are drawn first and never sorted. The shadows are cut to the ground
    // they fall on.
    const groundGroup = group.append('g');
    const outline = group.append('clipPath').attr('id', 'mini-city-ground').append('path');
    const shadowGroup = group
        .append('g')
        .attr('class', 'shadows')
        .attr('clip-path', 'url(#mini-city-ground)');
    const buildingGroup = group.append('g');

    host.insertAdjacentHTML(
        'beforeend',
        `<div class="city-controls">
            <label>time <input name="hour" type="range" min="${DAWN}" max="${DUSK}" step="any"><output></output></label>
            <div class="city-stats" aria-live="polite"></div>
        </div>`
    );

    const svg = select(host).select<SVGSVGElement>('svg').attr('tabindex', 0);
    const slider = host.querySelector('[name=hour]') as HTMLInputElement;
    const stats = host.querySelector('.city-stats') as HTMLElement;

    /** Projects the city, lights it and paints the buildings back to front. */
    function render(): void {
        turnCamera(camera, yaw, pitch, { yaw: START_YAW, tilt: START_TILT });
        const sun = sunAt(hour);

        // A low sun shines warmer, and the CSS mixes that in everywhere.
        host.style.setProperty(
            '--mc-warm',
            `${Math.round(WARM * (1 + sun.y / Math.sin(HIGH_SUN)))}%`
        );

        // The ground faces straight up, so its cosine to the sun is the height of the sun.
        const ground = flat.data(GROUND);
        outline.attr('d', flat.draw(ground[0]));
        groundGroup
            .style('--mc-shade', shade(-sun.y))
            .selectAll<SVGPathElement, Polygon<Point3D>>('path')
            .data(ground)
            .join((enter) => enter.append('path').attr('class', (_, i) => (i ? 'lot' : 'street')))
            .attr('d', flat.draw);

        // ponytail: the shadows fall on the ground only, never on another
        // building. Cast them onto the faces too if the gap shows.
        shadowGroup
            .selectAll<SVGPathElement, Polygon<Point3D>>('path')
            .data(flat.data(BUILDINGS.map((b) => shadowOf(b, sun))))
            .join('path')
            .attr('d', flat.draw);

        // A building is sorted by the centre of its lot, not by its own
        // centroid: the centroid of a tall tower sits high up, nearer to the
        // camera, and would paint the tower over a house in front of it.
        const views: BuildingView[] = BUILDINGS.map((building) => {
            const pieces = cubes.data(building.pieces);
            return {
                building,
                faces: pieces.flatMap((p) => p.faces!),
                centroid: pieces[0].faces!.find((f) => f.face === 'bottom')!.centroid
            };
        });

        // The pieces of a building stack from the bottom up, so painting them
        // in order is right, and the faces of a piece that face the camera
        // never overlap. A face that turns away, or has no area like the top
        // of a gable roof, keeps its element and is only hidden.
        buildingGroup
            .selectAll<SVGGElement, BuildingView>('g.building')
            .data(views, (d) => d.building.id)
            .join((enter) =>
                enter.append('g').attr('class', (d) => `building kind-${d.building.kind.name}`)
            )
            .classed('is-selected', (d) => d.building === selected)
            .sort(sort)
            .selectAll<SVGPathElement, CubeFace<CityVertex>>('path')
            .data((d) => d.faces)
            .join((enter) => enter.append('path').attr('class', (d) => `face part-${d[0].part}`))
            .attr('visibility', (d) => (d.ccw ? null : 'hidden'))
            .style('--mc-shade', (d) => shade(facing(d, sun)))
            .attr('d', cubes.draw);
    }

    /** Selects a building, or none, and shows its stats. */
    function inspect(building: Building | undefined): void {
        selected = building;
        stats.innerHTML = describe(building);
        render();
    }

    /** Sets the time of day, mirrors it on the slider, and draws it. */
    function setHour(next: number): void {
        hour = next;
        slider.valueAsNumber = next;
        slider.nextElementSibling!.textContent = clock(next);
        render();
    }

    slider.addEventListener('input', () => setHour(slider.valueAsNumber));

    // The face under the pointer knows its building: every vertex carries it.
    // A click on the selected building or on the ground clears the selection.
    // d3.drag swallows the click that ends a drag, so turning the city never
    // selects a building.
    svg.on('click', (event: MouseEvent) => {
        const target = event.target as Element;
        const building = target.matches('.face')
            ? select<Element, CubeFace<CityVertex>>(target).datum()[0].building
            : undefined;
        inspect(building === selected ? undefined : building);
    });

    // The first key selects the first lot, the next ones walk from there.
    svg.on('keydown', (event: KeyboardEvent) => {
        const step = STEPS[event.key];
        if (event.key === 'Escape') {
            inspect(undefined);
        } else if (step) {
            event.preventDefault();
            const [dr, dc] = selected ? step : [0, 0];
            const row = clamp((selected?.row ?? 0) + dr);
            inspect(BUILDINGS[row * N + clamp((selected?.col ?? 0) + dc)]);
        }
    });

    stats.innerHTML = describe(undefined);
    setHour(START_HOUR);

    return () => {
        host.style.removeProperty('--mc-warm');
        host.innerHTML = '';
    };
}
