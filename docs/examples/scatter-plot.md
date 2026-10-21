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

**Drag the figure** to rotate it. The button samples new heights for the
points and fades them in.

## Three renderers, one projection

The scene is three shapes that share the same projection: a checkered floor
of quads, a cloud of points and a y axis with its ticks. Every renderer
gets the same `origin`, `scale` and start rotation, so all three move as
one scene when the drag turns them:

```ts
const grid3d = gridPlanes3D()
    .scale(20)
    .origin({ x: 480, y: 250 })
    .rotateY(Math.PI / 4)
    .rotateX(-Math.PI / 4)
    .rows(20);

const points3d = points3D()
    .scale(20)
    .origin({ x: 480, y: 250 })
    .rotateY(Math.PI / 4)
    .rotateX(-Math.PI / 4);

const axis3d = lineStrips3D()
    .scale(20)
    .origin({ x: 480, y: 250 })
    .rotateY(Math.PI / 4)
    .rotateX(-Math.PI / 4);
```

## The floor is a grid of quads

`gridPlanes3D` cuts the flat list of floor points into quads, one quad per
cell of the field. The `rows` accessor tells the renderer how many points
one row holds. Every quad comes back with the `ccw` flag, which tells
whether it is turned towards the camera, and the floor is shaded with it: a
quad that faces the camera gets the lighter fill, a quad that faces away
the darker one:

```ts
.attr('class', (d) => 'd3-3d grid ' + (d.ccw ? 'grid-front' : 'grid-back'))
```

## Points keep their id

The samples carry a stable `id`, and the circles are joined on it. All 400
circles are created once and never enter or exit again: the button only
samples new heights, and the existing circles move to their new position
through the same transition:

```ts
const pointsJoin = group.selectAll('circle').data(points, (d) => d.id);

pointsJoin
    .enter()
    .append('circle')
    .attr('class', 'd3-3d point')
    .attr('opacity', 0)
    .merge(pointsJoin)
    .transition()
    .duration(duration)
    .attr('r', 3)
    .attr('fill', (d) => colorScale(d.id))
    .attr('cx', (d) => d.projected.x)
    .attr('cy', (d) => d.projected.y);
```

## An axis from a line strip

The y axis is a single line strip along the edge of the floor. The ticks
are the transformed points of that strip: a transformed point keeps the
properties of its input and adds `rotated` and `projected`, so `d.y` is
still the height on the axis while `d.projected` is where the tick lands on
the screen:

```ts
const ticks = axisStrips[0].filter((d) => d.y <= 0).map((d) => ({ ...d, centroid: d.rotated }));

tickJoin
    .enter()
    .append('text')
    .attr('class', 'd3-3d yText')
    .merge(tickJoin)
    .attr('x', (d) => d.projected.x)
    .attr('y', (d) => d.projected.y)
    .text((d) => d.y);
```

## One sort for the whole scene

The floor, the points and the ticks are flat SVG elements, so their order
decides which one wins. The [`sort`](/api/#utility-functions) utility
orders them by the depth of their rotated centre, and the painter's
algorithm does the rest. The sort runs after every draw, because the drag
changes the depth of every element:

```ts
group.selectAll('.d3-3d').sort(sort);
```

The ticks get a `centroid` that the sort reads - the renderers put one on
every datum they return, the ticks are plain points and carry the depth of
their rotated position instead.

## The whole source

The figure lives in
[docs/examples/scatterPlot.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/scatterPlot.ts)
in the repository. The complete file, ready to copy:

<<< @/examples/scatterPlot.ts

<style>
.scatter-plot {
    --sc-stroke: #1b1e21;
    --sc-grid-front: #eee;
    --sc-grid-back: #aaa;
    --sc-button: #f0f1f1;
    --sc-button-ink: #1b1e21;
    --sc-button-line: #c4c7c9;
    --sc-bg: #ffffff;
    margin: 1.5rem 0;
    position: relative;
    overflow: hidden;
    border: 1px solid var(--sc-button-line);
    border-radius: 12px;
    background: var(--sc-bg);
}

.dark .scatter-plot {
    --sc-stroke: #e6e8e9;
    --sc-grid-front: #3a3d40;
    --sc-grid-back: #17181a;
    --sc-button: #17181a;
    --sc-button-ink: #e6e8e9;
    --sc-button-line: #3d4144;
    --sc-bg: #0c0d0e;
}

.scatter-plot .scatter-svg {
    display: block;
    width: 100%;
    height: auto;
    cursor: grab;
    touch-action: none;
}

.scatter-plot .scatter-svg:active {
    cursor: grabbing;
}

.scatter-plot .grid {
    stroke: var(--sc-stroke);
    stroke-opacity: 0.3;
    stroke-width: 0.3;
    fill-opacity: 0.9;
}

.scatter-plot .grid-front {
    fill: var(--sc-grid-front);
}

.scatter-plot .grid-back {
    fill: var(--sc-grid-back);
}

.scatter-plot .yScale {
    stroke: var(--sc-stroke);
    stroke-width: 0.5;
    fill: none;
}

.scatter-plot .yText {
    font-family: system-ui, sans-serif;
    font-size: 10px;
    fill: var(--sc-stroke);
    text-anchor: middle;
}

.scatter-plot .scatter-button {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    padding: 0.35rem 0.9rem;
    border: 1px solid var(--sc-button-line);
    border-radius: 8px;
    background: var(--sc-button);
    color: var(--sc-button-ink);
    font-size: 0.85rem;
    cursor: pointer;
}

.scatter-plot .scatter-button:hover {
    border-color: var(--sc-button-ink);
}
</style>
