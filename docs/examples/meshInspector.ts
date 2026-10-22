import { format, interpolateLab, select } from 'd3';
import { lines3D, sort, triangles3D } from '../../index';
import type { HasCentroid, Line, Point3D, ShapeInstance, Triangle } from '../../index';
import { rotatingFigure } from './rotatingFigure';
import { placeSegments } from './segments';

/*
 * A mesh inspector: a low-poly vase of triangles drawn with triangles3D and
 * the normal of every face drawn with lines3D. Every triangle is wound the
 * same way, so after the rotation `ccw` tells a face that looks at the camera
 * from one that looks away, and the inside of the open vase is all back
 * faces. The faces and the normals are painted back to front in one list.
 * The figure brings its own styles, so the module works without a stylesheet.
 */

const ORIGIN = { x: 480, y: 250 };
const SCALE = 160;
const START_YAW = Math.PI / 6;
const START_TILT = Math.PI / 5;
// The faces around the vase, and the length of a normal in model units.
const SEGMENTS = 12;
const NORMAL = 0.25;

// The profile of the vase from the foot to the lip: the height and the
// radius of every ring. The screen y grows downwards, so the lip has the
// smallest y.
const PROFILE: [number, number][] = [
    [1, 0.45],
    [0.7, 0.8],
    [0.3, 0.95],
    [-0.1, 0.75],
    [-0.45, 0.38],
    [-0.75, 0.4],
    [-1, 0.65]
];

// The colors of both themes. `light-dark()` follows the color-scheme of the
// page, so a theme switch recolors the figure without a redraw. It is CSS,
// not an SVG attribute value, so the colors are set with `style`.
const INK = 'light-dark(#1b1e21, #e6e8e9)';
const MUTED = 'light-dark(#5f6468, #a3a8ab)';
const LINE = 'light-dark(#c4c7c9, #3d4144)';
const PAPER = 'light-dark(#ffffff, #0c0d0e)';
const BUTTON = 'light-dark(#f0f1f1, #17181a)';
const ACCENT = 'light-dark(#c2255c, #f783ac)';

// The outside of the vase in blue, the inside in orange, from a face seen
// edge-on to one seen head-on. Both read on either page color.
const OUTSIDE = interpolateLab('#0d366b', '#86b6ef');
const INSIDE = interpolateLab('#5a2207', '#f4a261');

// The checkboxes: the name, the label and whether it starts checked.
const TOGGLES: [string, string, boolean][] = [
    ['faces', 'faces', true],
    ['edges', 'edges', true],
    ['normals', 'normals', false],
    ['backs', 'back faces', true]
];

/** A projected face with the index it was built at, the key of the join, and the z of its normal. */
type Facet = Triangle<Point3D> & { id: number; nz: number };

const minus = (a: Point3D, b: Point3D): Point3D => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });

/**
 * The unit normal on the side a triangle is wound counter-clockwise from.
 * The frame is left-handed - x to the right, y down, z towards the viewer -
 * so it is the second edge crossed with the first.
 */
function normal([a, b, c]: Point3D[]): Point3D {
    const u = minus(c, a);
    const v = minus(b, a);
    const n = { x: u.y * v.z - u.z * v.y, y: u.z * v.x - u.x * v.z, z: u.x * v.y - u.y * v.x };
    const length = Math.hypot(n.x, n.y, n.z);
    return { x: n.x / length, y: n.y / length, z: n.z / length };
}

/**
 * The vase: the profile turned around the y axis, two triangles per quad
 * between two rings and a fan for the foot. Every triangle runs
 * counter-clockwise when it is seen from outside.
 */
function lathe(): Point3D[][] {
    const ring = ([y, r]: [number, number], j: number): Point3D => {
        const phi = (j / SEGMENTS) * Math.PI * 2;
        return { x: r * Math.cos(phi), y, z: r * Math.sin(phi) };
    };
    const foot = { x: 0, y: PROFILE[0][0], z: 0 };

    const triangles: Point3D[][] = [];
    for (let j = 0; j < SEGMENTS; j += 1) {
        triangles.push([foot, ring(PROFILE[0], j), ring(PROFILE[0], j + 1)]);
        for (let k = 0; k < PROFILE.length - 1; k += 1) {
            const a = ring(PROFILE[k], j);
            const b = ring(PROFILE[k], j + 1);
            const c = ring(PROFILE[k + 1], j + 1);
            const d = ring(PROFILE[k + 1], j);
            triangles.push([a, d, c], [a, c, b]);
        }
    }
    return triangles;
}

const MESH = lathe();

// The normals never change in model space: they turn with the mesh.
const NORMALS = MESH.map(normal);
const STEMS = MESH.map((triangle, i) => {
    const [a, b, c] = triangle;
    const n = NORMALS[i];
    const base = { x: (a.x + b.x + c.x) / 3, y: (a.y + b.y + c.y) / 3, z: (a.z + b.z + c.z) / 3 };
    return [base, { x: base.x + n.x * NORMAL, y: base.y + n.y * NORMAL, z: base.z + n.z * NORMAL }];
});

const fixed = format('.2f');
const vector = (p: Point3D) => `(${fixed(p.x)}, ${fixed(p.y)}, ${fixed(p.z)})`;

/**
 * Mounts the figure into `host` and returns a function that removes it.
 */
export function mountMeshInspector(host: HTMLElement): () => void {
    const faces3d = triangles3D<Point3D>();
    const normals3d = lines3D<Point3D>();

    // A normal starts on the centroid of its face, so as long as both
    // renderers share their settings it stays on the face as the mesh turns.
    const renderers: ShapeInstance<Point3D>[] = [faces3d, normals3d];
    for (const renderer of renderers) {
        renderer.scale(SCALE).origin(ORIGIN);
    }

    let yaw = 0;
    let pitch = 0;
    let selected: number | undefined;
    let hovered: number | undefined;

    const { group, button } = rotatingFigure(
        host,
        'mesh',
        `A vase of ${MESH.length} triangles. Drag it to rotate it and click a face to inspect it, or type the number of a face.`,
        (dragYaw, dragPitch) => {
            yaw = dragYaw;
            pitch = dragPitch;
            // The outlined face turns away from under the pointer.
            hovered = undefined;
            render();
        }
    );

    // The box, the button and the controls are HTML and take their styles
    // inline.
    select(host).attr(
        'style',
        `position: relative; overflow: hidden; margin: 1.5rem 0; border: 1px solid ${LINE}; border-radius: 12px; background: ${PAPER}; color: ${INK}`
    );
    button
        .text('reset')
        .attr(
            'style',
            `position: absolute; top: 0.75rem; right: 0.75rem; padding: 0.35rem 0.9rem; border: 1px solid ${LINE}; border-radius: 8px; background: ${BUTTON}; color: ${INK}; font-size: 0.85rem; cursor: pointer`
        );

    const row = 'display: flex; align-items: center; gap: 0.4rem';
    host.insertAdjacentHTML(
        'beforeend',
        `<div style="display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 1.5rem; padding: 0.75rem; border-top: 1px solid ${LINE}; font-size: 0.85rem">
            ${TOGGLES.map(([name, label]) => `<label style="${row}"><input name="${name}" type="checkbox">${label}</label>`).join('')}
            <label style="${row}">face <input name="face" type="number" min="0" max="${MESH.length - 1}" step="1" style="width: 4.5em; padding: 0.15rem 0.4rem; border: 1px solid ${LINE}; border-radius: 6px; background: ${BUTTON}; color: ${INK}"></label>
            <p style="flex-basis: 100%; margin: 0; min-height: 3em; line-height: 1.5; font-variant-numeric: tabular-nums"><span aria-live="polite"></span> <span style="color: ${MUTED}"></span></p>
        </div>`
    );

    const svg = select(host)
        .select<SVGSVGElement>('svg')
        .attr('style', 'display: block; width: 100%; height: auto; cursor: grab; touch-action: none');
    const [faces, edges, normals, backs] = TOGGLES.map(
        ([name]) => host.querySelector(`[name=${name}]`) as HTMLInputElement
    );
    const picker = host.querySelector('[name=face]') as HTMLInputElement;
    const [named, readout] = Array.from(host.querySelectorAll<HTMLElement>('p span'));

    /** A face that looks away is only painted while the back faces are on. */
    const isShown = (d: Facet) => d.ccw || backs.checked;

    /** Projects the faces and the normals, styles them from the toggles and paints them back to front. */
    function render(): void {
        for (const renderer of renderers) {
            renderer.rotateY(yaw + START_YAW).rotateX(-pitch - START_TILT);
        }

        // The projected triangles are new arrays, so the key and the normal
        // in view space are stamped on after the projection. Its z is the
        // cosine to the line of sight, which shades the face, and its sign
        // agrees with `ccw`.
        const facets: Facet[] = faces3d
            .data(MESH)
            .map((d, i) => Object.assign(d, { id: i, nz: normal(d.map((p) => p.rotated)).z }));

        // A face that turns away keeps its element and is only hidden, so a
        // drag never adds or removes one.
        group
            .selectAll<SVGPathElement, Facet>('path')
            .data(facets, (d) => d.id)
            .join((enter) =>
                enter
                    .append('path')
                    .attr('stroke-linejoin', 'round')
                    // Clickable without a fill, but not while hidden.
                    .attr('pointer-events', 'visible')
            )
            .attr('visibility', (d) => (isShown(d) ? null : 'hidden'))
            .style('fill', (d) =>
                !faces.checked ? 'none' : (d.ccw ? OUTSIDE : INSIDE)(Math.abs(d.nz))
            )
            .style('stroke', (d) =>
                d.id === selected || d.id === hovered ? ACCENT : edges.checked ? INK : 'none'
            )
            .attr('stroke-opacity', (d) =>
                d.id === selected ? 1 : d.id === hovered ? 0.6 : faces.checked ? 0.3 : 0.7
            )
            .attr('stroke-width', (d) => (d.id === selected ? 2.5 : d.id === hovered ? 2 : 1))
            .attr('d', faces3d.draw);

        // The normals keep the order of the faces, so the join goes by the
        // index. The normal of the selected face shows even with the normals
        // off.
        group
            .selectAll<SVGLineElement, Line<Point3D>>('line')
            .data(normals3d.data(STEMS))
            .join((enter) =>
                enter.append('line').attr('stroke-linecap', 'round').attr('pointer-events', 'none')
            )
            .call(placeSegments)
            .attr('visibility', (_, i) =>
                (normals.checked || i === selected) && isShown(facets[i]) ? null : 'hidden'
            )
            .style('stroke', (_, i) => (i === selected ? ACCENT : MUTED))
            .attr('stroke-width', (_, i) => (i === selected ? 2.5 : 1.25));

        // One painter's list: the faces and the normals both have a
        // centroid, so a normal that points away hides behind its face.
        group.selectAll<SVGElement, HasCentroid>('path, line').sort(sort);

        const d = selected === undefined ? undefined : facets[selected];
        if (!d) {
            readout.textContent = '';
            return;
        }
        const painted = facets.filter(isShown);
        readout.textContent = `${d.ccw ? 'Faces the camera' : 'Faces away'}: ccw ${d.ccw}, normal z in view ${fixed(d.nz)}, depth ${fixed(d.centroid.z)}. ${
            isShown(d)
                ? `Painted ${painted.filter((f) => sort(f, d) < 0).length + 1} of ${painted.length}.`
                : 'Hidden while the back faces are off.'
        }`;
    }

    /** Selects a face, or none, and describes the part of it that never changes. */
    function inspect(id: number | undefined): void {
        selected = id;
        picker.value = id === undefined ? '' : String(id);
        named.textContent =
            id === undefined
                ? 'Click a face or type its number to inspect it.'
                : `Face ${id} of ${MESH.length}: vertices ${MESH[id].map(vector).join(', ')}, outward normal ${vector(NORMALS[id])}.`;
        render();
    }

    /** Checks the toggles as they start and clears the selection. */
    function reset(): void {
        TOGGLES.forEach(([, , on], k) => {
            [faces, edges, normals, backs][k].checked = on;
        });
        inspect(undefined);
    }

    /** The id of the face an event targets, if any. */
    function faceAt(event: Event): number | undefined {
        const target = event.target as Element;
        return target.matches('path') ? select<Element, Facet>(target).datum().id : undefined;
    }

    // A click on the selected face or next to the vase clears the selection.
    // d3.drag swallows the click that ends a drag, so turning the vase never
    // selects a face.
    svg.on('click', (event: MouseEvent) => {
        const id = faceAt(event);
        inspect(id === selected ? undefined : id);
    });

    // A free pointer outlines the face a click would select. Every redraw
    // re-sorts the faces, and the browser drops a click whose face moved in
    // the DOM, so the outline never redraws while a button is down.
    svg.on('pointermove pointerleave', (event: PointerEvent) => {
        const id = faceAt(event);
        if (!event.buttons && id !== hovered) {
            hovered = id;
            render();
        }
    });

    picker.addEventListener('input', () => {
        const id = picker.valueAsNumber;
        inspect(Number.isInteger(id) && id >= 0 && id < MESH.length ? id : undefined);
    });
    for (const input of [faces, edges, normals, backs]) {
        input.addEventListener('change', render);
    }
    button.on('click', reset);

    reset();

    return () => {
        select(host).attr('style', null);
        host.innerHTML = '';
    };
}
