---
title: Spline editor
---

# Spline editor

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { mountSplineEditor } from './splineEditor';

const host = ref(null);
let dispose;

onMounted(() => {
    if (host.value) dispose = mountSplineEditor(host.value);
});

onBeforeUnmount(() => {
    if (dispose) dispose();
});
</script>

<div ref="host"></div>

**Drag a point** to move it across the screen, hold <kbd>Shift</kbd> to
change only its height and <kbd>Alt</kbd> (<kbd>Option</kbd> on macOS) to
move it only across the floor. **Double-click the curve** to add a point
and press <kbd>Delete</kbd> to remove the selected one. **Drag the
background** to rotate the scene, and flick it to let it spin out. With the
figure focused, <kbd>[</kbd> and <kbd>]</kbd> pick a point, the arrow keys
move it across the floor, <kbd>Page Up</kbd> and <kbd>Page Down</kbd> move
it up and down, <kbd>A</kbd> adds a point halfway to the next one and
<kbd>Escape</kbd> clears the selection.

## Two numbers for three

A drag on the screen moves the pointer by two numbers, and a point in space
has three. An orthographic projection drops the depth, so every pointer
position stands for a whole line of points behind it, and the drag alone
cannot say which one is meant.

A plane through the point picks one. The line behind the pointer meets the
plane in exactly one place, and
[`unproject`](https://github.com/niekes/d3-3d#unprojectpoint-planepoint-planenormal)
returns it. The renderer already knows its scale, origin, rotation and
pivot, so the call takes only the pointer and the plane:

```ts
const start = { x: knot.x, y: knot.y, z: knot.z };
const hit = dots.unproject({ x: event.x, y: event.y }, start, normal);
const offset = { x: start.x - hit.x, y: start.y - hit.y, z: start.z - hit.z };
```

The press rarely lands on the exact middle of the point, so the drag keeps
the difference between the point and the first hit, and adds it to every
hit after it. The point stays where it was grabbed instead of jumping under
the pointer. The plane stays the one from the start of the drag, and every
drag event asks `unproject` again:

```ts
const hit = dots.unproject({ x: event.x, y: event.y }, grab.start, grab.normal);
knot.x = clamp(hit.x + offset.x, -5, 5);
knot.y = clamp(hit.y + offset.y, -5, 0);
knot.z = clamp(hit.z + offset.z, -5, 5);
```

The drag on a point stops the press before it reaches the drag of the
figure, so moving a point never turns the scene.

## The plane that faces you

Which plane feels right? The one that faces the camera: a drag across it
moves the point across the screen, exactly under the pointer, and leaves
its depth alone. Its normal is the view direction, turned back into the
world.

The renderer turns a point around z, then y, then x, with the rotation
matrix of
[`rotationMatrix`](https://github.com/niekes/d3-3d/blob/master/src/rotation.ts).
The camera looks along the z axis of the screen, and the inverse of a
rotation is its transpose, so the view direction in the world is the third
row of that matrix. The figure never sets `rotateZ`, and with α the angle of
`rotateX` and θ the angle of `rotateY` the row reads:

```ts
const a = dots.rotateX();
const t = dots.rotateY();
const normal = { x: -Math.cos(a) * Math.sin(t), y: Math.sin(a), z: Math.cos(a) * Math.cos(t) };
```

It is the same direction `unproject` follows from the screen into the
scene, so this plane is never seen edge-on. A normal may point either way,
but the signs between its parts matter: with one of them wrong, the plane
tilts away from the screen and the point drifts away from the pointer.

## Only up, only across

The plane that faces you moves a point in two directions at once, and
neither of them is up or along the floor. Two more planes split them:

- **<kbd>Shift</kbd>** takes the upright plane that faces the camera, with
  the view direction flattened onto the floor as its normal,
  `{ x: -Math.sin(t), y: 0, z: Math.cos(t) }`. The drag keeps the x and z of
  the start and takes only the new height.
- **<kbd>Alt</kbd>** takes the floor plane through the point, with the
  normal `{ x: 0, y: 1, z: 0 }`. The drag keeps the height and takes only
  the new x and z.

The readout under the figure shows the change: a <kbd>Shift</kbd> drag moves
only the height, an <kbd>Alt</kbd> drag only x and z. The height is −y: the
screen y grows downwards, so the points rise towards a negative y, and the
drag keeps y between −5 and 0. A horizontal plane
seen from a low camera is close to edge-on, and a small move of the pointer
then becomes a long move along the floor. The camera stays between 10 and
85 degrees above the floor, and `unproject` returns `null` for a plane that
is exactly edge-on; the figure then keeps the last position.

## Depth without perspective

Without perspective, a point that is far away is drawn as large as one that
is near, and a point high above the back of the floor can sit on the screen
exactly where a low point at the front sits. The figure resolves that with
two cues that every point carries:

- a **drop line** from the point straight down to the floor, a `lines3D`
  segment from the point to the same x and z at height 0;
- a **shadow** at the foot of the drop line, the same point at height 0
  through `points3D`. A circle on the floor is seen from above as an ellipse
  squashed by the sine of the tilt, so the shadow is an ellipse with that
  ratio.

The shadow names the place on the floor, and the length of the line names
the height. Only the points are sorted by depth: they always paint above the
curve, because an editor has to keep its handles in reach.

The curve is a uniform Catmull–Rom spline through the points, with the end
points doubled, sampled at 20 steps per segment and drawn with
`lineStrips3D`. It passes through every point, so moving a point moves the
curve through it. A double-click on the curve adds a point at the sample
nearest the pointer, and the readout shows the length of the curve as the
sum of the distances between its samples.

## The whole source

The figure and its styles live in
[docs/examples/splineEditor.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/splineEditor.ts)
in the repository: the figure adds the styles and its class to the element
it mounts into, so it needs no stylesheet. The SVG and the drag live in
[docs/examples/rotatingFigure.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/rotatingFigure.ts),
the camera in
[docs/examples/floorView.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/floorView.ts)
and the grid and drop lines in
[docs/examples/segments.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/segments.ts).
The figure, ready to copy:

<<< @/examples/splineEditor.ts
