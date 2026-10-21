---
title: Surface plot
---

# Surface plot

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { mountSurfacePlot } from './surfacePlot';

const host = ref(null);
let dispose;

onMounted(() => {
    if (host.value) dispose = mountSurfacePlot(host.value);
});

onBeforeUnmount(() => {
    if (dispose) dispose();
});
</script>

<div ref="host" class="surface-plot"></div>

**Drag the figure** to rotate it. The button samples a new wave with a
random amplitude and fades it in.

## A surface is a grid of quads

The figure samples a function over a field of 32 by 32 points and hands the
flat point list to `gridPlanes3D`. The `rows` accessor tells the renderer how
many points one row holds, and `data` cuts the rows into quads:

```ts
const surface = gridPlanes3D()
    .scale(10)
    .origin({ x: 480, y: 250 })
    .rotateY(Math.PI / 4)
    .rotateX(-Math.PI / 4)
    .rows(32);

const quads = surface.data(points);
```

Every quad comes back with three extra properties: a stable `plane` key, its
`centroid` and the `ccw` flag, which tells whether the quad is turned
towards the camera.

## Shading without a light

There is no lighting model in the figure. The height of a quad colors it and
the `ccw` flag shades it: a quad that faces the camera gets the spectral
ramp at its mean height, a quad that faces away gets a darker tint of the
same color, so the two sides of the surface are told apart at a glance:

```ts
function colorize(d) {
    const height = (d[0].y + d[1].y + d[2].y + d[3].y) / 4;
    const base = interpolateSpectral(colorScale(height));
    return d.ccw ? base : rgb(base).darker(2.5).formatHex();
}
```

The height is read from the transformed points themselves. A transformed
point keeps the properties of its input, so `d[0].y` is still the height of
the sample, not a screen coordinate.

## The painter's algorithm

The quads are drawn as flat SVG paths, so their order decides which one
wins. The [`sort`](/api/#utility-functions) utility orders the paths by the
depth of their rotated centre, and the painter's algorithm does the rest:

```ts
group.selectAll('path').sort(sort);
```

The sort runs after every draw: the drag changes the depth of every quad,
so the order has to be recomputed with every frame.

## One join for the whole life of the figure

The paths are joined on the stable `plane` key, so all 961 quads are created
once and never enter or exit again. A rotation only updates the `d`
attribute and the fill of the existing paths, and the new surface fades in
through the same transition:

```ts
const quads = group.selectAll('path').data(planes, (d) => d.plane);

quads
    .enter()
    .append('path')
    .attr('class', 'quad')
    .attr('fill', colorize)
    .attr('opacity', 0)
    .merge(quads)
    .transition()
    .duration(duration)
    .attr('opacity', 1)
    .attr('fill', colorize)
    .attr('d', surface.draw);
```

## The whole source

The figure lives in
[docs/examples/surfacePlot.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/surfacePlot.ts)
in the repository. The complete file, ready to copy:

<<< @/examples/surfacePlot.ts

<style>
.surface-plot {
    --sp-stroke: #1b1e21;
    --sp-button: #f0f1f1;
    --sp-button-ink: #1b1e21;
    --sp-button-line: #c4c7c9;
    --sp-bg: #ffffff;
    margin: 1.5rem 0;
    padding: 1.25rem 1.25rem 1rem;
    border: 1px solid var(--sp-button-line);
    border-radius: 12px;
    background: var(--sp-bg);
}

.dark .surface-plot {
    --sp-stroke: #e6e8e9;
    --sp-button: #17181a;
    --sp-button-ink: #e6e8e9;
    --sp-button-line: #3d4144;
    --sp-bg: #0c0d0e;
}

.surface-plot .surface-svg {
    display: block;
    width: 100%;
    height: auto;
    cursor: grab;
    touch-action: none;
}

.surface-plot .surface-svg:active {
    cursor: grabbing;
}

.surface-plot .quad {
    stroke: var(--sp-stroke);
    stroke-opacity: 0.25;
    stroke-width: 0.5;
}

.surface-plot .surface-button {
    margin-top: 0.75rem;
    padding: 0.35rem 0.9rem;
    border: 1px solid var(--sp-button-line);
    border-radius: 8px;
    background: var(--sp-button);
    color: var(--sp-button-ink);
    font-size: 0.85rem;
    cursor: pointer;
}

.surface-plot .surface-button:hover {
    border-color: var(--sp-button-ink);
}
</style>
