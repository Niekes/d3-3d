---
title: Floor-plan explorer
---

# Floor-plan explorer

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { mountFloorPlan } from './floorPlan';

const host = ref(null);
let dispose;

onMounted(() => {
    if (host.value) dispose = mountFloorPlan(host.value);
});

onBeforeUnmount(() => {
    if (dispose) dispose();
});
</script>

<div ref="host" class="floor-plan"></div>

**Drag the figure** to rotate it, **move the slider** to spread or stack the
floors, **point at a room** to see its name and **click a room** or the
corridor of a floor to inspect it. **Drag a piece of furniture** to move it
across its floor, and press <kbd>T</kbd> to turn the selected one. The
button stacks or spreads the building in one go. **Controls** under the
figure lists the rest: hold <kbd>Shift</kbd> to rotate with the arrow keys
or to turn the building upright with the drag, zoom with <kbd>Ctrl</kbd> /
<kbd>⌘</kbd> and the wheel or with <kbd>+</kbd> and <kbd>−</kbd>, and press
<kbd>R</kbd> to reset the view.

## Floors are planes, rooms are polygons

Every floor is a slab of the same 12 × 8 footprint, drawn with
`planes3D`. A plane has exactly four vertices, and its
`draw` connects those four. The rooms on a slab are drawn with
`polygons3D`, which closes an outline of any length. Every
floor has one L-shaped room, and an L has six corners:

```ts
{
    name: 'Lobby',
    seats: 40,
    people: 12,
    plan: [[-6, -4], [-3, -4], [-3, 0.75], [-1, 0.75], [-1, 4], [-6, 4]]
}
```

The plan is written in `x` and `z`. Each vertex also carries its floor and
its room, so a room still knows itself after the projection:

```ts
const roomVertex =
    (room) =>
    ([x, z]) => ({ x, z, floor: room.floor, room });
const outlines = rooms.map((room) => room.plan.map(roomVertex(room)));
```

The corridor down the middle of each floor is left free. The slab shows
through there, and a click on it selects the floor.

## One accessor lifts the floors

No vertex has a `y`. The height of a floor comes from the `y` accessor,
which all four renderers share. The spread adds to the height of a storey,
and the floors are counted from the middle of the building, so the building
turns around its own centre:

```ts
const elevation = (f) => (f - 1.5) * (STOREY + GAP * spread);

for (const renderer of [slabs3d, rooms3d, anchors3d, items3d]) {
    renderer
        .scale(24)
        .origin({ x: 480, y: 250 })
        .y((d) => -elevation(d.floor));
}
```

The accessor runs before the rotation, so the floors move apart along the
building's own vertical axis, however the building is turned. The button
tweens the `spread` number, not the paths, so a drag keeps turning the
building while it comes apart.

## Layers sort by their slab

Every floor is one `g`, keyed by its index, with the slab, the rooms, the
furniture and the labels inside it. Only the floors are sorted, by the
depth of the centre of their slab:

```ts
const floors = group
    .selectAll('g.floor')
    .data(views, (d) => d.floor)
    .join(/* a slab, a group of rooms, of furniture and of labels, a floor label */)
    .classed('is-selected', (d) => d.floor === floor)
    .sort(sort);
```

For this building the order is exact. The slabs are parallel and share one
footprint, so whichever slab is nearer to the camera has the nearer centre,
from above and from below. The rooms of one floor lie in the plane of their
slab and never overlap each other, so they need no sort of their own: they
are painted after their slab, and the floors above paint over them.

## Labels at the area centroid

The `centroid` that the library sets on a polygon is the average of its
vertices, which is what the sort needs. For the label of an L it can fall
outside the room. The labels sit at the centroid of the area instead,
which d3's `polygonCentroid` computes on the plan, and they go through
`points3D` with the same accessors:

```ts
const anchors = rooms.map((room) => roomVertex(room)(polygonCentroid(room.plan)));
```

Only the selected floor shows the names of its rooms, so the labels never
crowd. A halo in the page color keeps a name legible on a light room and
on a dark one. The floor label sits beside the leftmost corner of its slab,
which is always on the outline, so it never covers its own floor.

The room under the pointer names itself at the same anchor. That one name
is drawn in a group above every floor, so it shows on a faded floor too.
`pointermove` reads the room from the path under the pointer, as the click
does, and renders only when the room changes. While a button is held, the
pointer is turning the building, so it names nothing:

```ts
svg.on('pointermove', (event) => {
    const next = event.buttons === 0 ? roomAt(event.target) : undefined;
    if (next !== hovered) {
        hovered = next;
        render();
    }
});
```

## Colored by occupancy

A room is colored by the share of its seats that are taken, on one blue
from light to dark. In the dark theme the ramp runs the other way, so an
empty room recedes into the page in both themes. `light-dark()` picks the
step, so a theme switch recolors the rooms without a redraw:

```ts
const light = piecewise(interpolateLab, BLUES);
const dark = piecewise(interpolateLab, [...BLUES].reverse());
const shade = (t) => `light-dark(${light(t)}, ${dark(t)})`;
```

The legend under the figure is a CSS gradient of the same `shade`.

## Selecting a floor or a room

The click listener sits on the SVG. A room path carries its room on every
vertex, a footprint its item, and a slab and its label carry their floor,
so the target of the click is enough:

```ts
const itemAt = (target) => (target.matches('.item') ? select(target).datum()[0].item : undefined);
const roomAt = (target) =>
    target.matches('.room') ? select(target).datum()[0].room : itemAt(target)?.room;

svg.on('click', (event) => {
    const target = event.target;
    const picked = roomAt(target);
    if (picked) {
        inspect(picked.floor, picked, itemAt(target));
        return;
    }
    inspect(target.matches('.slab, .floor-label') ? select(target).datum().floor : undefined);
});
```

`d3.drag` swallows the click that ends a drag, so turning the building
never selects anything. The selected floor stays opaque and the others fade,
so the selected floor shows through the floors above it. The inspector
under the figure reads out the seats and the occupancy of the floor or the
room.

## Moving furniture

Every room holds a few pieces of furniture, flat footprints in the plane of
their floor. A fourth renderer draws them, a `polygons3D` that shares the
accessors of the others, so a footprint rises and turns with its floor. A
piece is written down by its kind, its size in metres, its centre on the
plan and a turn of 0 or 90 degrees:

```ts
{ kind: 'desk', width: 1.5, depth: 1, x: 2, z: -3, turn: 0 }
```

The footprints of a floor are painted after its rooms and before their
names. They lie in the plane of their floor, so like the rooms they need no
sort of their own. Every corner carries its item, so a click on a footprint
selects the item and its room, and pointing at one names its room.

### The plane of a floor

A drag on a footprint needs the point under the pointer on the floor the
footprint lies on. Every floor is a plane at its own height, and that height
is the one the `y` accessor gives the floor at the current spread. The plane
runs through that height, and its normal points up.
[`unproject`](https://github.com/niekes/d3-3d#unprojectpoint-planepoint-planenormal)
returns the point where the ray behind the pointer meets it:

```ts
const pointOnFloor = (pointer, f) =>
    items3d.unproject(pointer, { x: 0, y: -elevation(f), z: 0 }, { x: 0, y: 1, z: 0 });
```

The `x` and `z` accessors are the defaults, so the `x` and `z` of the hit
are already plan coordinates. A raised, spread or zoomed floor needs nothing
more: the renderer knows its scale and its rotation, and `elevation` knows
the spread.

The press rarely lands on the centre of a footprint, so the drag keeps the
offset between the centre and the first hit, and adds it to every hit after
it. The footprint stays where it was grabbed instead of jumping under the
pointer. Every drag event asks for the plane again, at the current spread,
so a floor that moves with the button during a drag keeps up:

```ts
.on('start', (event, d) => {
    const target = d[0].item;
    const hit = pointOnFloor(event, target.room.floor) ?? target;
    grab = { item: target, dx: target.x - hit.x, dz: target.z - hit.z, refused: false };
})
.on('drag', (event) => {
    const hit = pointOnFloor(event, grab.item.room.floor);
    if (hit) {
        grab.refused = !place(grab.item, { x: snap(hit.x + grab.dx), z: snap(hit.z + grab.dz) });
    }
});
```

A floor seen edge-on has no point under the pointer, and `unproject`
returns `null`, so the footprint stays where it is. The centre snaps to a
quarter metre, and the sizes are multiples of half a metre, so every corner
lands on a quarter metre, where the walls are. The drag on a footprint stops
the press before it reaches the drag of the figure, so moving furniture
never turns the building, and a drag on a room or the background still does.

### Where furniture fits

A footprint fits where all four corners lie inside one room of its floor
and it overlaps no other footprint in that room. d3's `polygonContains`
tests the corners against the plan of the room. A corner that lies exactly
on a wall could count as inside or outside, so the test pulls the corners
5 cm towards the centre first:

```ts
const inner = footprint({ ...target, ...changes }, 0.05);
const home = roomsOf(target.room.floor).find((r) =>
    inner.every((corner) => polygonContains(r.plan, corner))
);
const fits =
    home !== undefined &&
    !items.some((d) => d !== target && d.room === home && overlaps(inner, footprint(d)));
```

Four corners are enough even in an L. The L lacks one corner of its
bounding box, and a rectangle with all four corners in the L stays clear of
that corner as a whole. The footprints are all axis-aligned, so two of them
overlap exactly where their extents overlap along both axes.

A move that does not fit is refused. The footprint stays at its last valid
place and is drawn dashed in red until the pointer reaches a place where it
fits. The room that holds it is its room from then on, so a desk can move
to the room next door or across the corridor, but never into the corridor.
With a piece selected, the arrow keys move it by a quarter metre and
<kbd>T</kbd> turns it about its centre, both under the same check. The
first <kbd>Escape</kbd> lets go of the piece and keeps its room.

### The free area

The inspector reads out the floor area a room has left. d3's `polygonArea`
is signed by the winding of the outline, so the area of the room is its
absolute value, less the footprints that stand in the room:

```ts
const area = Math.abs(polygonArea(room.plan));
const free = area - sum(items, (d) => (d.room === room ? d.width * d.depth : 0));
```

A drag describes its piece on every event, so the free area follows it. The
inspector is a live region, and its text is only written when it changes,
so a screen reader hears every place once.

## The drag and the keys share one rotation

The scaffold reports the drag as a total, the distance of every drag so
far. If the figure took that total as its rotation, the next drag would
undo every turn of the keys. It turns by the change since the last report
instead, so the drag and the keys add up. With <kbd>Shift</kbd> held, the
change of the tilt is dropped, and the building turns about its own axis
and stays upright:

```ts
(dragYaw, dragPitch) => {
    turn(dragYaw - dragged.yaw, shift ? 0 : dragPitch - dragged.pitch);
    dragged = { yaw: dragYaw, pitch: dragPitch };
};
```

The drag does not pass on its events, so every pointer event over the SVG
records whether <kbd>Shift</kbd> is down. The arrow keys walk the selection,
and with <kbd>Shift</kbd> they call the same `turn`, 15° per press. A key
held with <kbd>Ctrl</kbd>, <kbd>⌘</kbd> or <kbd>Alt</kbd> is left to the
browser, so <kbd>⌘</kbd> <kbd>R</kbd> still reloads the page.

The zoom is a factor on the scale of all four renderers. The wheel zooms
only with <kbd>Ctrl</kbd> or <kbd>⌘</kbd>, so a plain wheel still scrolls
past the figure. A pinch on a trackpad arrives as a wheel with
<kbd>Ctrl</kbd>, so it zooms too.

## No stylesheet

The figure carries its own styles, so the module is all there is to copy.
The SVG marks get theirs in the join, next to the data they show, and every
render sets the ones that follow the selection:

```ts
.attr('opacity', (d) => (floor === undefined || d.floor === floor ? 1 : 0.25))
```

The box, the button and the controls are HTML and take an inline `style`.
Every color is a `light-dark()` pair, so the figure follows the theme of the
page. `light-dark()` is CSS and not an SVG attribute value, so the colors
are set with `style`, not `attr`:

```ts
const INK = 'light-dark(#1b1e21, #e6e8e9)';
const PAPER = 'light-dark(#ffffff, #0c0d0e)';
```

A page that sets no `color-scheme` gets the light colors.

## The whole source

The figure lives in
[docs/examples/floorPlan.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/floorPlan.ts)
in the repository, and the SVG and the drag in
[docs/examples/rotatingFigure.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/rotatingFigure.ts).
The figure, ready to copy:

<<< @/examples/floorPlan.ts
