---
title: Bar chart
---

# Bar chart

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { mountBarChart } from './barChart';

const host = ref(null);
let dispose;

onMounted(() => {
    if (host.value) dispose = mountBarChart(host.value);
});

onBeforeUnmount(() => {
    if (dispose) dispose();
});
</script>

<div ref="host" class="bar-chart"></div>

**Drag the figure** to rotate it. The button samples a new set of depths and
the bars grow or shrink into it, their labels counting along.

## A bar is eight vertices

The chart has no bar primitive. Every bar is eight points - its footprint in
the x-z plane and two values for `y` - handed to `cubes3D` as one flat list.
[`box`](/api/#box) builds them in the order `cubes3D` expects, from where the
bar stands and how high it rises:

```ts
const cubes = cubes3D()
    .scale(20)
    .origin({ x: 480, y: 300 })
    .rotateY(Math.PI / 6)
    .rotateX(-Math.PI / 6);

const bars = cubes.data(
    data.map((d) => box({ x: d.x, y: 0, z: d.z, width: 2, height: d.height, depth: 2 }))
);
```

The renderer cuts those eight vertices into six faces and hands each one
back with three extra properties: a stable `face` name, its `centroid` and
the `ccw` flag that tells whether the face is turned towards the camera.

## Labels survive the projection

`cubes3D` returns fresh arrays, so properties set on the input array are
gone after the projection. Every _vertex_ keeps the properties of its input
though, so the example carries the `id` and the `height` of a bar on each of
its vertices and re-attaches them to the cube after every projection:

```ts
const bars = cubes
    .data(input)
    .map((cube) => Object.assign(cube, { id: cube[0].id, height: cube[0].height }));
```

The cube join is keyed by that `id`, so the bars are created once and never
enter or exit again - a new sample only changes the depth of each bar.

## Labels that count

The label of a bar sits on the centroid of its top face, which is the
average of the rotated vertices. The projection maps it onto the screen the
same way it maps the vertices themselves:

```ts
.attr('x', (d) => origin.x + scale * d.centroid.x)
.attr('y', (d) => origin.y + scale * d.centroid.y);
```

The number itself is a transition tween: it interpolates from the current
text to the new height and rewrites the text content on every tick, so the
label counts while the bar grows or shrinks:

```ts
.tween('text', function (d) {
    const that = select(this);
    const i = interpolateNumber(+that.text(), Math.abs(d.height));
    return function (t) {
        that.text(i(t).toFixed(1));
    };
});
```

## The painter's algorithm, twice

The bars do not overlap each other, but the six faces of one bar do. The
`sort` utility orders by the depth of a centroid,
so the chart sorts at two levels: the cube groups by the depth of their
footprint, and inside each group the faces and the label by the depth of
theirs. The bars stand on one floor, so the footprint is the right depth:
the centre of a tall bar sits high up, and seen from above it would paint
over a short bar in front of it. A cube has the centroid of its `bottom`
face at hand:

```ts
centroid: cube.faces.find((face) => face.face === 'bottom').centroid;
```

```ts
group.selectAll('g.cube').sort(sort);
cubes.selectAll('.d3-3d').sort(sort);
```

The sort runs after every draw: the drag changes the depth of every face, so
the order has to be recomputed with every frame.

## The box around the bars

`axes3D` draws the chart box from a spec of three axes, a
domain and the ticks for each. The bars grow towards a negative `y`, so the
height axis runs from `0` to `-8` and its labels drop the sign:

```ts
const box = axes3D().scale(20).origin({ x: 480, y: 300 });

box.data(spec).filter((wall) => !wall.ccw); // the back walls, with gridlines
box.axes(spec); // one axis per dimension, on the outline of the box
```

The walls and the axes are drawn before the bars, so the bars always sit in
front of them, and the box turns with the same drag as the bars.

## The whole source

The figure lives in
[docs/examples/barChart.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/barChart.ts)
in the repository, the drag it shares with the other rotating figures in
[docs/examples/rotatingFigure.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/rotatingFigure.ts).
The complete file, ready to copy:

<<< @/examples/barChart.ts

<style>
.bar-chart {
    --bc-stroke: #1b1e21;
    --bc-button: #f0f1f1;
    --bc-button-ink: #1b1e21;
    --bc-button-line: #c4c7c9;
    --bc-bg: #ffffff;
    margin: 1.5rem 0;
    position: relative;
    overflow: hidden;
    border: 1px solid var(--bc-button-line);
    border-radius: 12px;
    background: var(--bc-bg);
}

.dark .bar-chart {
    --bc-stroke: #e6e8e9;
    --bc-button: #17181a;
    --bc-button-ink: #e6e8e9;
    --bc-button-line: #3d4144;
    --bc-bg: #0c0d0e;
}

.bar-chart .bar-svg {
    display: block;
    width: 100%;
    height: auto;
    cursor: grab;
    touch-action: none;
}

.bar-chart .bar-svg:active {
    cursor: grabbing;
}

.bar-chart .bar-svg {
    color: var(--bc-stroke);
}

.bar-chart .bar-walls path {
    fill: var(--bc-stroke);
    fill-opacity: 0.04;
    stroke: var(--bc-stroke);
    stroke-opacity: 0.25;
    stroke-width: 0.5;
}

.bar-chart .axis-line {
    stroke-width: 1.5;
}

.bar-chart .tick-mark {
    stroke: currentColor;
    stroke-opacity: 0.6;
}

.bar-chart .tick-label,
.bar-chart .axis-title {
    font-family: system-ui, sans-serif;
    dominant-baseline: central;
}

.bar-chart .tick-label {
    font-size: 11px;
    fill: currentColor;
}

.bar-chart .axis-title {
    text-anchor: middle;
    font-size: 13px;
    font-weight: 600;
}

.bar-chart .text {
    font-size: 16px;
}

.bar-chart .bar-button {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    padding: 0.35rem 0.9rem;
    border: 1px solid var(--bc-button-line);
    border-radius: 8px;
    background: var(--bc-button);
    color: var(--bc-button-ink);
    font-size: 0.85rem;
    cursor: pointer;
}

.bar-chart .bar-button:hover {
    border-color: var(--bc-button-ink);
}
</style>
