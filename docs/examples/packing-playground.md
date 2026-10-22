---
title: Packing playground
---

# Packing playground

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { mountPackingPlayground } from './packingPlayground';

const host = ref(null);
let dispose;

onMounted(() => {
    if (host.value) dispose = mountPackingPlayground(host.value);
});

onBeforeUnmount(() => {
    if (dispose) dispose();
});
</script>

<div ref="host"></div>

**Pick a box** in the tray under the figure and **click the floor** or **the
top of a box** to place it: the see-through ghost shows where it lands. In
**move** mode, **drag a box** to slide it across the floor at its height;
Shift switches the mode for one click or drag. **Drag the background** to
rotate the figure, and flick it to let it spin out. With the figure
focused, the keys <kbd>1</kbd> to <kbd>5</kbd> pick a size and <kbd>R</kbd>
turns it, the arrow keys walk a cursor over the floor and <kbd>Enter</kbd>
places the box there. <kbd>[</kbd> and <kbd>]</kbd> select a box. Then the
arrow keys move it, <kbd>Page Up</kbd> and <kbd>Page Down</kbd> lift and
lower it, <kbd>D</kbd> drops it, <kbd>R</kbd> turns it, <kbd>Delete</kbd>
removes it and <kbd>Escape</kbd> lets it go. A cell that two boxes share is
red.

## Where a box lands

The container holds 6 × 4 × 4 cells. Its floor is the plane y = 0, with no
element per cell, so the cell under the pointer comes from
[`unproject`](https://github.com/niekes/d3-3d#unprojectpoint-planepoint-planenormal),
exactly as in the [voxel builder](./voxel-builder). Over the top face of a
box, the face names the cell instead, because every vertex of a cube
carries its cell. The footprint of the tray box is centred on that cell,
and the box falls into the container from above until something is under
its footprint:

```ts
function dropLayer(cells, box, from, self) {
    const blocked = (layer) =>
        cellsOf({ ...box, layer, height: 1 }).some((cell) =>
            (cells.get(keyOf(cell)) ?? []).some((id) => id !== self)
        );
    let layer = from;
    while (layer > 0 && !blocked(layer - 1)) layer -= 1;
    return layer;
}
```

A placement falls from the top of the container, so the box lands on the
highest box under its footprint: a 2 × 2 × 1 box placed over a single cube
lands one layer up, on top of the cube. <kbd>D</kbd> drops the selected box
from its own layer instead, so it comes to rest on the first box beneath
it, even under an overhang. Where the footprint leaves the container, or
the stack is too high for the box, there is no ghost and a click places
nothing.

## Moving in a plane

A screen drag has two numbers, and a box on the grid moves in two: a column
and a row, at its own height. So a drag moves the box in the horizontal
plane through its base, and `unproject` returns the point of that plane
under the pointer:

```ts
const baseAt = (x, y, piece) => {
    const hit = cubes.unproject({ x, y }, { x: 0, y: -piece.layer, z: 0 }, { x: 0, y: 1, z: 0 });
    return hit && { column: hit.x + 3, row: hit.z + 2 };
};

drag()
    .on('start', (event) => {
        const at = baseAt(event.x, event.y, piece) ?? piece;
        grab = { piece, column: piece.column - at.column, row: piece.row - at.row };
    })
    .on('drag', (event) => {
        const at = baseAt(event.x, event.y, grab.piece);
        if (!at) return;
        piece.column = clamp(Math.round(at.column + grab.column), 6 - piece.width);
        piece.row = clamp(Math.round(at.row + grab.row), 4 - piece.depth);
        render();
    });
```

The grab offset keeps the box where it was grabbed, as in the
[spline editor](./spline-editor), which moves its points in the plane that
faces the camera. The point of the box the pointer pressed on and the
point of the base plane under it lie on one line of sight. An
orthographic view shifts both by the same amount on the screen when the
box moves sideways, so the spot you grabbed stays under the pointer, up to
the half cell that the rounding to whole cells takes. The camera stays at
least 10 degrees above the floor, so the plane is never seen edge on; if
it were, `unproject` would return `null` and the box would keep its cell.

A move may push a box into another one: only a placement from the tray
lands on top of what is there. In move mode, `d3.drag` on the boxes stops
the press before it reaches the drag of the figure, so moving a box never
turns the scene. In place mode, the filter of that drag lets the press
through, and a press on a box turns the scene.

## Boxes made of cubes

`sort` paints shapes back to front by the depth of their centres, one
number per shape, and boxes of different sizes do not fit in one number
each. Take the long 3 × 2 × 1 box and a cube in front of its left end. Seen
from the front right, more from the right than from the front, the cube
stands in front of the box, yet its centre lies farther back than the
middle of the box, so a sort by the centres paints the box over the cube.
The [depth-ordering lab](./depth-ordering) takes this apart for faces: no
order of whole shapes by one number each is right for every scene.

Equal unit cubes on a grid are the case that `sort` gets right, as the
[cellular automaton](./cellular-automaton) explains, so every box is cut
into unit cubes. A face between two cubes of the same box is dropped before
the face join, so the DOM only holds the surface of the box, as in the
voxel builder:

```ts
function isOpen(cell, face) {
    const next = neighborOf(cell, face);
    const mine = cells.get(keyOf(cell));
    const theirs = cells.get(keyOf(next)) ?? [];
    return next.layer >= 0 && (mine.length > 1 ? theirs.length < 2 : !theirs.includes(mine[0]));
}
```

A face against its own box, on the floor or between two red cubes is
never seen. Each face is stroked in its own fill at 85% opacity, so the
seams between the cubes of a box stay faint, the box still reads as one,
and the boxes behind it show through.

The container is drawn as one `cubes3D` box in two halves. The walls that
turn away from the camera, the floor and the far sides seen from inside,
are painted before the boxes. The edges of the walls that turn towards it
are painted after them, dashed. The camera is always outside the container,
so a far wall is behind everything in it and a near edge in front of it,
and neither needs a place in the sort.

## One map of cells

Every render builds one map from the key of a cell to the ids of the boxes
that cover it, the ghost included:

```ts
const cells = new Map();
for (const piece of pieces) {
    for (const cell of cellsOf(piece)) {
        const key = keyOf(cell);
        cells.set(key, [...(cells.get(key) ?? []), piece.id]);
    }
}
```

The same map answers every question the figure asks:

- **What to draw.** A cell with one box is a cube of that box, keyed by the
  box and the place of the cell in it, so a moved box keeps its elements.
  A cell with two or more boxes is one red cube, keyed by the cell. A
  rotation adds or removes no element, and a drag only where cells start
  or stop overlapping.
- **The volume.** The occupied volume is the number of keys: one
  2 × 2 × 2 box in the empty container reads 8 of 96 cells, or 8%. The
  bar is a native `<meter>`, which screen readers announce with no drawing
  code.
- **The overlaps.** A key with more than one id is an overlapping cell. A
  2 × 1 × 1 box pushed half onto a single cube covers 2 cells, and 1 of
  them overlaps.
- **Where a box lands.** The drop above asks the same kind of map, built
  without the ghost, whether a cell under the footprint holds a box.

The ghost never shares a cell, since it always lands on top, so the
volume leaves its cells out. The live region under the figure announces
every edit with the volume and the overlap count.

## The whole source

The figure and its styles live in
[docs/examples/packingPlayground.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/packingPlayground.ts)
in the repository: the figure adds the styles and its class to the element
it mounts into, so it needs no stylesheet. The SVG and the drag live in
[docs/examples/rotatingFigure.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/rotatingFigure.ts),
the camera, the floor and the pointer over it in
[docs/examples/floorView.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/floorView.ts),
the cube join, the face join and the neighbor steps in
[docs/examples/cubeFaces.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/cubeFaces.ts)
and the lines in
[docs/examples/segments.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/segments.ts).
The figure, ready to copy:

<<< @/examples/packingPlayground.ts
