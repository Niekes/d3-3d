---
title: Voxel builder
---

# Voxel builder

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { mountVoxelBuilder } from './voxelBuilder';

const host = ref(null);
let dispose;

onMounted(() => {
    if (host.value) dispose = mountVoxelBuilder(host.value);
});

onBeforeUnmount(() => {
    if (dispose) dispose();
});
</script>

<div ref="host"></div>

**Click the floor** to place a cube, **click a face** to place one against
it and **shift-click a cube** to remove it, or switch to erase mode. **Drag
the figure** to rotate it, and flick it to let it spin out. With the figure
focused, the arrow keys walk a cursor over the floor, <kbd>Enter</kbd>
builds on top of it, or erases its top cube in erase mode, <kbd>Delete</kbd>
takes the top cube away, the keys
<kbd>1</kbd> to <kbd>6</kbd> pick a color and <kbd>E</kbd> switches between
building and erasing.

## The floor is one plane

The floor is a single plane and its grid lines, not 64 cells. A click on a
face can tell which cube it hit, because every face is an element with the
cube on its vertices. A click on the floor has nothing like that: no
element per cell, and no depth on the screen at all. An orthographic
projection drops the depth, so a screen point stands for a whole line of
points behind it.

[`unproject`](https://github.com/niekes/d3-3d#unprojectpoint-planepoint-planenormal) answers the question the other way round: it takes the
screen point back into the scene and returns the point where that line
meets a plane. The floor is the plane through the origin whose normal points
along `y`:

```ts
const [x, y] = pointer(event, group.node());
const point = cubes.unproject({ x, y }, { x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 });

const column = Math.floor(point.x + 4);
const row = Math.floor(point.z + 4);
```

The renderer already knows its scale, origin, rotation and pivot, so the
call takes only the point and the plane. The readout under the figure shows
`point` while the pointer moves: at a crossing of two grid lines it reads
whole numbers, however the floor is turned. `unproject` returns `null` for a
plane seen edge on; the camera never gets there, because the tilt stays
between 10 and 85 degrees above the floor.

## A face knows its neighbor

Over a cube the face under the pointer names the cell. cubes3D names every
face, and the name is all it takes to find the cell behind it:

```ts
const STEPS = {
    front: [0, 0, 1],
    back: [0, 0, -1],
    left: [-1, 0, 0],
    right: [1, 0, 0],
    top: [0, 1, 0],
    bottom: [0, -1, 0]
};
```

The steps are in column, layer and row. A click on a top face builds one
layer up, a click on a side face builds next to the cube, and a click in
erase mode takes the cube itself. No coordinates are involved.

## Faces nobody can see

A face that touches another cube, or rests on the floor, can never be seen,
so the face join drops it before it reaches the DOM:

```ts
function isOpen(cell, face) {
    const [dc, dl, dr] = STEPS[face];
    return (
        cell.layer + dl >= 0 &&
        !built.has(keyOf({ column: cell.column + dc, layer: cell.layer + dl, row: cell.row + dr }))
    );
}
```

The count under the figure shows what that saves: a solid 2 × 2 × 2 block is
8 cubes and 48 faces, of which 20 are drawn. The faces that turn away from
the camera are a different matter: they change with every frame of a drag,
so they keep their elements and are only hidden.

## Stable cubes

The cubes are joined by their cell, the faces by their name. A drag only
moves the paths of the build; one of its elements comes or goes only when a
cube is placed or erased, or a face is covered or uncovered.

The ghost, the see-through cube that shows where the next click lands, is
one more cube in the same join, under the key `ghost`, so it is sorted with
the others and hides behind them where it should. It is the one cube whose
elements come and go as it moves from cell to cell. It takes no pointer
events: the pointer always finds the face or the floor behind it. The
target is picked again after every frame of a glide, so the ghost stays
under a resting pointer while the scene spins out.

The click that ends a drag never arrives: `d3.drag` swallows it once the
pointer has moved, so turning the scene never builds.

## The whole source

The figure and its styles live in
[docs/examples/voxelBuilder.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/voxelBuilder.ts)
in the repository: the figure adds the styles and its class to the element
it mounts into, so it needs no stylesheet. The SVG and the drag live in
[docs/examples/rotatingFigure.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/rotatingFigure.ts),
the camera and the floor in
[docs/examples/floorView.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/floorView.ts),
the cube join, the face join and the neighbor steps in
[docs/examples/cubeFaces.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/cubeFaces.ts)
and the grid lines in
[docs/examples/segments.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/segments.ts).
The figure, ready to copy:

<<< @/examples/voxelBuilder.ts
