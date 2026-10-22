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

With the pointer:

| Input                                                      | Does                                                       |
| ---------------------------------------------------------- | ---------------------------------------------------------- |
| Hover the curve                                            | Shows a ghost point where a double-click adds one          |
| Double-click the curve                                     | Adds a point there                                         |
| Drag a point                                               | Moves it across the screen                                 |
| <kbd>Shift</kbd> + drag a point                            | Changes only its height                                    |
| <kbd>Alt</kbd> (<kbd>Option</kbd> on macOS) + drag a point | Moves it only across the floor                             |
| Hold <kbd>Shift</kbd> or <kbd>Alt</kbd> over a point       | Shows the line or the plane the drag will follow           |
| Click a point                                              | Selects it; a click on the background clears the selection |
| Drag the background                                        | Rotates the scene; a flick lets it spin out                |

With the figure focused, after a click on it or with <kbd>Tab</kbd>:

| Key                                         | Does                                                     |
| ------------------------------------------- | -------------------------------------------------------- |
| <kbd>[</kbd> and <kbd>]</kbd>               | Pick the previous and the next point                     |
| Arrow keys                                  | Move the selected point across the floor                 |
| <kbd>Page Up</kbd> and <kbd>Page Down</kbd> | Move it up and down                                      |
| <kbd>A</kbd>                                | Adds a point halfway to the next one                     |
| <kbd>Delete</kbd> or <kbd>Backspace</kbd>   | Removes the selected point; the curve keeps at least two |
| <kbd>Escape</kbd>                           | Clears the selection                                     |

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

Every renderer knows that direction:
[`.viewDirection()`](/api/#viewdirection) returns it as a unit vector in
world coordinates, pointing from the scene towards the viewer. The camera
looks along the z axis of the screen, and the inverse of a rotation is its
transpose, so it is the third row of the rotation matrix:

```ts
const normal = dots.viewDirection();
```

It is the same direction `unproject` follows from the screen into the
scene, so this plane is never seen edge-on.

## Only up, only across

The plane that faces you moves a point in two directions at once, and
neither of them is up or along the floor. Two more planes split them:

- **<kbd>Shift</kbd>** takes the upright plane that faces the camera, with
  the view direction flattened onto the floor as its normal,
  `{ x: v.x, y: 0, z: v.z }`. The drag keeps the x and z of
  the start and takes only the new height.
- **<kbd>Alt</kbd>** takes the floor plane through the point, with the
  normal `{ x: 0, y: 1, z: 0 }`. The drag keeps the height and takes only
  the new x and z.

Hold <kbd>Shift</kbd> or <kbd>Alt</kbd> with the pointer on a point, and the
figure draws the path before the drag starts: the upright line through the
point from the floor to the top of the editing space, or the outline of the
plane at the point's height. Both are `lines3D` segments in world units, so
they turn with the scene, and the guide stays until the drag ends:

```ts
const guided = grab?.knot ?? knots.find((k) => k.id === hovered);
previewGroup
    .selectAll('.guide')
    .data(lines.data(guided ? guideOf(guided, grab?.mode ?? held) : []))
    .join('line')
    .attr('class', 'guide')
    .call(placeSegments);
```

The keys reach the page when the figure has no focus, so the window listens
for them, and the figure stops listening when it is removed.

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

The curve is `catmullRom(knots, 20)`: the uniform Catmull–Rom spline
through the points, with the end points doubled, sampled at 20 steps per
segment and drawn with `lineStrips3D`. It passes through every point, so moving a point moves the
curve through it. A double-click on the curve adds a point at the sample
nearest the pointer. Hovering the curve finds that sample with the same
function and draws a ghost there, with its own drop line, so the new point
lands where the ghost stands. The readout shows the length of the curve as
the sum of the distances between its samples.

## The whole source

The figure and its styles live in
[docs/examples/splineEditor.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/splineEditor.ts)
in the repository: the figure adds the styles and its class to the element
it mounts into, so it needs no stylesheet. The SVG and the drag live in
[docs/examples/rotatingFigure.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/rotatingFigure.ts),
the camera and the keys in
[docs/examples/floorView.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/floorView.ts),
the handles of the points in
[docs/examples/handles.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/handles.ts)
and the grid and drop lines in
[docs/examples/segments.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/segments.ts).
The figure, ready to copy:

<<< @/examples/splineEditor.ts
