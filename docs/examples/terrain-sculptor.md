---
title: Terrain sculptor
---

# Terrain sculptor

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { mountTerrainSculptor } from './terrainSculptor';

const host = ref(null);
let dispose;

onMounted(() => {
    if (host.value) dispose = mountTerrainSculptor(host.value);
});

onBeforeUnmount(() => {
    if (dispose) dispose();
});
</script>

<div ref="host"></div>

**Drag the terrain** to raise the ground under the brush, and hold
<kbd>Alt</kbd> (<kbd>⌥</kbd> on a Mac) or pick "lower" to dig it out again.
Hold the pointer still to keep sculpting. **Drag the background** to rotate
the scene. With the figure focused, the arrow keys move the brush,
<kbd>Enter</kbd> raises, <kbd>Shift</kbd> with <kbd>Enter</kbd> lowers and
<kbd>[</kbd> and <kbd>]</kbd> change the radius. The button brings the hills
back.

## Two drags in one figure

The scene turns with a drag on the SVG, the scaffold every rotating figure
shares. The terrain needs a drag of its own, so a second `d3.drag` sits on
the group of the quads:

```ts
group.call(
    drag()
        .on('start', (event) => {
            brush = brushAt(clientOf(event.sourceEvent));
            sculpting = timer((elapsed) => sculpt(elapsed - previous, invert));
        })
        .on('drag', (event) => {
            brush = brushAt(clientOf(event.sourceEvent));
        })
        .on('end', () => sculpting.stop())
);
```

A press on a quad reaches the drag of the group first, and `d3.drag` stops
it there: the drag of the SVG never hears of it. A press next to the
terrain only reaches the SVG. So the terrain sculpts and the background
turns, with no mode to switch.

The drag events only move the brush. A timer sculpts once per frame, so a
pointer that rests keeps raising the ground, like an airbrush.

## Unproject at the right height

The quad under the pointer tells which cell the brush is in, but not where
in the cell. [`unproject`](https://github.com/niekes/d3-3d#unprojectpoint-planepoint-planenormal)
answers that: it takes the pointer back into the scene and returns the point
where it meets a plane. The question is which plane.

The plane at `y = 0` is the obvious choice, and the wrong one. A screen
point stands for a whole line of points along the view, and that line meets
the ground at the height of the hill, not at the foot of it. At the default
tilt of 45 degrees the plane at `y = 0` lands as far beside the hill as the
hill is high: five cells for a hill five units high.

So the brush takes the plane at the height of the quad under the pointer:

```ts
const quad = select(hit).datum();
const height = (quad[0].y + quad[1].y + quad[2].y + quad[3].y) / 4;
const [x, y] = pointer(at, group.node());
const point = surface.unproject({ x, y }, { x: 0, y: height, z: 0 }, { x: 0, y: 1, z: 0 });
```

The hit test finds the cell, `unproject` the place inside it, and the brush
moves smoothly instead of jumping from cell to cell. The readout under the
figure shows where the brush is and how high the ground is there.

## A brush is a falloff

Every sample within the radius moves by the strength, weighted by a
Gaussian of its distance from the brush:

```ts
const d2 = (x - brush.x) ** 2 + (z - brush.z) ** 2;
p.y = clamp(p.y + step * Math.exp(-d2 / (2 * sigma * sigma)), -LIMIT, LIMIT);
```

The middle rises fastest and the edge hardly at all, so the brush raises a
soft hill, not a column. The screen `y` grows downwards, so raising the
ground lowers `y`. The ring around the brush lies on the terrain: every
point of it takes the height of the field where it stands, interpolated
from the four samples around it.

## Sixty frames a second

The brush writes the heights of the samples in place, and the scaffold draws
them again with a duration of zero:

```ts
show(points, 0);
```

Nothing is entered or removed: the join keys the quads by their plane, so
every frame only moves the 961 quads between the 32 × 32 samples and sorts
them back to front. The colors
follow the height, from deep water through sand and grass to rock and snow.

## The whole source

The figure lives in
[docs/examples/terrainSculptor.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/terrainSculptor.ts)
and its styles in
[docs/examples/terrainSculptor.css](https://github.com/niekes/d3-3d/blob/master/docs/examples/terrainSculptor.css).
The surface, its colors and the turning live in
[docs/examples/surfaceFigure.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/surfaceFigure.ts),
the drag and the glide in
[docs/examples/rotatingFigure.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/rotatingFigure.ts).
The figure, ready to copy:

<<< @/examples/terrainSculptor.ts
