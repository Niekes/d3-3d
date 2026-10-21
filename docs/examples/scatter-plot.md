---
title: Scatter plot
---

# Scatter plot

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { mountScatterPlot } from './scatterPlot';

const host = ref(null);
let dispose;

onMounted(() => {
    if (host.value) dispose = mountScatterPlot(host.value);
});

onBeforeUnmount(() => {
    if (dispose) dispose();
});
</script>

<div ref="host" class="scatter-plot"></div>

**Drag the figure** to rotate it, **hover a point** to read its values. The
picker switches the dataset, the legend toggles a series, the slider sets
the auto-rotation and the button samples the dataset again and glides the
points to their new positions.

The figure recreates the
[3D scatter plot of matterviz](https://matterviz.janosh.dev/plot/scatter-plot-3d)
by Janosh Riebesell, a WebGL component, with d3-3d and SVG. The first five
datasets are the point demos of that page; its surfaces, reference planes
and the 3,000-point demo are left out, the
[surface plot](/examples/surface-plot) covers the surfaces. The last one,
random heights, is a field of 400 samples whose heights the button samples
again: the ids stay, so every point glides to its new height.

## One box, three renderers

The box, the points and the line segments come from three renderers:
`axes3D`, `points3D` and `lines3D`. All three read the data through the
same accessors, and the accessors map every axis through its own scale onto
the box from -1 to 1. The box is described in data units like the points:
the domain and the ticks of each scale.

```ts
const renderers = [box3d, points3d, segments3d];
for (const renderer of renderers) {
    renderer
        .scale(SCALE)
        .origin(ORIGIN)
        .x((d) => scales.x(d.x))
        .y((d) => -scales.z(d.z))
        .z((d) => scales.y(d.y));
}

const axis = (a) => ({ domain: scales[a].domain(), ticks: scales[a].ticks(TICKS) });
spec = { x: axis('x'), y: axis('y'), z: axis('z') };
```

Data z is up, as in matterviz. The screen y grows downwards, so the
vertical accessor negates it.

## The back walls face away from the camera

[`axes3D`](/api/#axes) returns the six walls of the box, each with its
gridlines and the `ccw` flag that tells whether the wall faces the camera.
Only the walls that face away are drawn. That is why the walls jump to the
other side when the rotation crosses an axis plane, and why they never
cover a point. `draw` turns a wall into one path, the outline and the
gridlines:

```ts
wallGroup
    .selectAll('path')
    .data(box3d.data(spec).filter((wall) => !wall.ccw))
    .join('path')
    .attr('d', box3d.draw);
```

## The axes run along the outline

`axes` puts every axis on an edge of the outline, an edge between a wall
that faces the camera and one that does not, and prefers the edges below
the box, then the ones left of it. An edge is the list of its ticks, and a
tick keeps its value under the axis key. The `normal` points away from the
box, square to the edge, and the ticks and the labels are pushed along it,
so the labels of two axes that meet in a corner part ways:

```ts
axisGroup
    .selectAll('text.tick-label')
    .data(ticksOf)
    .join('text')
    .attr('class', 'tick-label')
    .attr('text-anchor', (d) =>
        d.edge.normal.x > 0.3 ? 'start' : d.edge.normal.x < -0.3 ? 'end' : 'middle'
    )
    .attr('x', (d) => d.tick.projected.x + d.edge.normal.x * 10)
    .attr('y', (d) => d.tick.projected.y + d.edge.normal.y * 10)
    .text((d) => scales[d.edge.axis].tickFormat(TICKS)(d.tick[d.edge.axis]));
```

## A curve is cut into segments

The painter's algorithm sorts every element by one depth. A whole curve
drawn as one line strip would share a single depth and paint above or
below every point. Cut into segments, one per pair of consecutive samples,
each piece sorts on its own and the curves weave between the points:

```ts
function segments() {
    return dataset.series
        .filter((s) => s.line)
        .flatMap((s) => {
            const run = shown.filter((p) => p.series === s.name);
            return run.slice(1).map((p, i) => [run[i], p]);
        });
}
```

## One loop for every motion

The auto-rotation redraws the scene on every frame. A d3 transition on the
circles would be cut off by the next frame, so the figure tweens the data
instead: the samples move from their old values to the new ones, and one
render loop advances the rotation and the tween and draws. The loop stops
itself when neither moves, and the figure stops it when the page is left:

```ts
function frame() {
    const now = performance.now();
    autoYaw += (now - lastFrame) * spin.valueAsNumber * SPIN;
    lastFrame = now;
    stepTween(now);
    drawScene();
    if (!tween && !spin.valueAsNumber && loop) {
        loop.stop();
        loop = undefined;
    }
}
```

The galaxy starts rotating on its own, unless the reader prefers reduced
motion.

## Reading the original values

A transformed point keeps the properties of its input next to its `rotated`
and `projected` coordinates. The tooltip reads the series, the position and
the value straight off the circle under the pointer, and a halo rings the
point while the rotation carries it along.

## The whole source

The figure lives in
[docs/examples/scatterPlot.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/scatterPlot.ts)
in the repository, its styles in
[docs/examples/scatterPlot.css](https://github.com/niekes/d3-3d/blob/master/docs/examples/scatterPlot.css),
and the SVG and the drag in
[docs/examples/rotatingFigure.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/rotatingFigure.ts).
The figure, ready to copy:

<<< @/examples/scatterPlot.ts
