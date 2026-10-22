---
title: Linked views
aside: false
---

# Linked views

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { mountLinkedViews } from './linkedViews';

const host = ref(null);
let dispose;

onMounted(() => {
    if (host.value) dispose = mountLinkedViews(host.value);
});

onBeforeUnmount(() => {
    if (dispose) dispose();
});
</script>

<div ref="host"></div>

**Drag the free view** to rotate it, **click a sample** to select it and
**shift-click** to add one or take it out. **Brush a rectangle on the top
view** to select the samples inside it, with <kbd>Shift</kbd> to add them.
A click on the background of either view clears the selection, and the
buttons select a whole cluster. With the free view focused, the arrow keys
rotate it, <kbd>[</kbd> and <kbd>]</kbd> walk through the samples,
<kbd>Enter</kbd> or <kbd>Space</kbd> selects one or takes it out and
<kbd>Esc</kbd> clears the selection.

## One selection, two views

The two views share the data and the selection, and nothing else. The
selection is one set of ids:

```ts
let selected = new Set();
let hovered;
let area;
```

A click, a brush, a key or a button only writes the set, and one `render`
draws both views from it. Each view gives every circle a class from the set,
so a selected sample gets a ring in both, and everything else steps back
while anything is selected:

```ts
const state = (d) => (selected.has(d.id) ? 'is-selected' : selected.size ? 'is-dimmed' : null);
```

The circles are joined by id, so the same sample keeps its element in each
view, and the sample under the pointer, `hovered`, grows in both. The views
never talk to each other. A third view would draw the same set and need no
wiring at all.

## A camera per view

A renderer holds exactly one view: `.camera()` makes it give up its own and
share the view of the camera. So each view gets its own `camera3D` and its
own renderers hung on it, a `points3D` for the samples and a `lines3D` for
the overlay:

```ts
function view(svg, camera) {
    const root = select(svg);
    return {
        svg: root,
        camera,
        points: points3D().camera(camera),
        lines: lines3D().camera(camera),
        floor: floorGrid(root, 'lv', camera, 10)
    };
}
```

The data array is shared, and every render projects it anew through each
camera. The free camera turns on drag, around the middle of the scene. The
top camera is turned once, a quarter turn about x, and never moves:

```ts
turnCamera(top.camera, 0, 0, { tilt: Math.PI / 2 });
```

Its view direction is then 0, −1, 0, straight up out of the floor, because
up is a negative y. World x runs across the map and world z down it, and
the samples are sorted by their depth, so the higher of two samples at one
place is drawn on top. Neither camera has a perspective: the map keeps one
scale everywhere, so every sample sits over its own place on the floor
grid, whatever its height.

## Brushing the floor

The top view brushes with d3's `brush` over the whole view box. Its keys
are off, so <kbd>Shift</kbd> does not lock the rectangle to one axis and
only adds to the selection. The brush reports pixels. Both corners go back
onto the floor through the top camera with `.unproject()`, the plane through
the origin with the normal up:

```ts
const [a, b] = corners.map(([x, y]) => top.camera.unproject({ x, y }, ORIGIN, UP));
const rect = {
    x0: Math.min(a.x, b.x),
    x1: Math.max(a.x, b.x),
    z0: Math.min(a.z, b.z),
    z1: Math.max(a.z, b.z)
};
selected = new Set([...base, ...SAMPLES.filter((d) => within(rect, d)).map((d) => d.id)]);
```

The selection compares world x and z, not pixels. The same rectangle is the
one the free view draws: four segments on its floor, through its own
camera, around the feet of the samples it picked. A camera that looks
straight down sees the floor face on, so two corners are enough. A map
turned about the vertical would need all four corners and a test against
the polygon they make.

`base` is the selection at the start of the brush with <kbd>Shift</kbd>
held, and empty without it. An empty brush, a click on the map, selects
only `base`, so a plain click clears the selection. A selection from
anywhere else clears the brush, so the rectangle always shows the samples
it picked.

## Where the other camera is

The map shows where the free view looks from. `.viewDirection()` of the free
camera is the unit vector from the scene towards its viewer. With its y set
to zero it lies on the floor, and the arrow follows it out of the middle of
the map:

```ts
function arrow({ x, z }) {
    const length = Math.hypot(x, z);
    if (length < FLAT) {
        return [];
    }
    const [dx, dz] = [x / length, z / length];
    const at = (along, across) => ({
        x: along * dx - across * dz,
        y: 0,
        z: along * dz + across * dx
    });
    const tip = at(ARROW, 0);
    return [
        [at(0, 0), tip],
        [tip, at(ARROW - 0.7, 0.4)],
        [tip, at(ARROW - 0.7, -0.4)]
    ];
}
```

Turn the free view by 90 degrees and the arrow turns by 90 degrees. The
flattened direction shrinks as the free camera rises: from straight above it
has no direction on the floor at all, and the arrow goes. The free camera
stays between 10 and 85 degrees above the floor, so it never gets quite
there.

The free view turns by the change of the drag since its last report, so the
arrow keys can turn it too, and the turn keeps the tilt within its limits.
The top camera has none of that: rotating the free view never moves the
map, and brushing the map never turns the free view.

## The whole source

The figure and its styles live in
[docs/examples/linkedViews.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/linkedViews.ts)
in the repository: the figure adds the styles and its class to the element
it mounts into, so it needs no stylesheet. The drag and `turnCamera` live in
[docs/examples/rotatingFigure.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/rotatingFigure.ts),
the tilt limits and the floor in
[docs/examples/floorView.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/floorView.ts)
and the segments in
[docs/examples/segments.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/segments.ts).
The figure, ready to copy:

<<< @/examples/linkedViews.ts
