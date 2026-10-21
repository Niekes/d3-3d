---
title: Sphere
---

# Sphere

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { mountSphere } from './sphere';

const host = ref(null);
let dispose;

onMounted(() => {
    if (host.value) dispose = mountSphere(host.value);
});

onBeforeUnmount(() => {
    if (dispose) dispose();
});
</script>

<div ref="host" class="sphere"></div>

**Drag the figure** to rotate it. The button picks a new random radius and
morphs the sphere into it.

## A sphere is a list of triangles

The figure cuts the sphere into 25 bands from pole to pole and every band
into 25 quads. Every quad becomes two triangles, so `triangles3D` gets a
plain list of 1250 point triples:

```ts
const triangles = triangles3D()
    .scale(1)
    .origin({ x: 480, y: 250 })
    .rotateY(Math.PI / 4)
    .rotateX(-Math.PI / 4);

const facets = triangles.data(sphere(radius));
```

Every triangle comes back with its `centroid` and the `ccw` flag, which
tells whether it is turned towards the camera.

## A key for the join

`data` returns new arrays, so a property set on an input triangle does not
survive the projection. The figure stamps the index on after it, and the
index is the key of the join:

```ts
const facets = triangles.data(mesh).map((d, i) => Object.assign(d, { id: i }));
const paths = group.selectAll('path').data(facets, (d) => d.id);
```

The key matters because the [`sort`](/api/#utility-functions) utility
reorders the paths in the DOM. Without it, a path would be bound to whatever
triangle sits at its new position, and the transition of the button would
morph triangles across the sphere instead of growing them in place.

The index also gives the color: the triangles are built band by band, so
`Math.floor(id / 50)` is the band of a triangle and picks its step on the
ramp. The fill is a CSS `light-dark()` of two ramps - PiYG on a light page,
the cool ramp on a dark one, where the white middle of PiYG would glare - so
a theme switch recolors the sphere without a redraw:

```ts
.style('fill', (d) => `light-dark(${interpolatePiYG(t)}, ${interpolateCool(t)})`);
```

## The painter's algorithm

The triangles are half transparent, so the back of the sphere shows through
the front. The sort runs after every draw and paints them back to front:

```ts
group.selectAll('path').sort(sort);
```

## The whole source

The figure lives in
[docs/examples/sphere.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/sphere.ts)
in the repository, the SVG and the drag it shares with the surface plot in
[docs/examples/rotatingFigure.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/rotatingFigure.ts).
The complete file, ready to copy:

<<< @/examples/sphere.ts

<style>
.sphere {
    --sp-stroke: #1b1e21;
    --sp-button: #f0f1f1;
    --sp-button-ink: #1b1e21;
    --sp-button-line: #c4c7c9;
    --sp-bg: #ffffff;
    margin: 1.5rem 0;
    position: relative;
    overflow: hidden;
    border: 1px solid var(--sp-button-line);
    border-radius: 12px;
    background: var(--sp-bg);
}

.dark .sphere {
    --sp-stroke: #e6e8e9;
    --sp-button: #17181a;
    --sp-button-ink: #e6e8e9;
    --sp-button-line: #3d4144;
    --sp-bg: #0c0d0e;
}

.sphere .sphere-svg {
    display: block;
    width: 100%;
    height: auto;
    cursor: grab;
    touch-action: none;
}

.sphere .sphere-svg:active {
    cursor: grabbing;
}

.sphere .facet {
    stroke: var(--sp-stroke);
    stroke-opacity: 0.25;
    stroke-width: 0.5;
}

.sphere .sphere-button {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    padding: 0.35rem 0.9rem;
    border: 1px solid var(--sp-button-line);
    border-radius: 8px;
    background: var(--sp-button);
    color: var(--sp-button-ink);
    font-size: 0.85rem;
    cursor: pointer;
}

.sphere .sphere-button:hover {
    border-color: var(--sp-button-ink);
}
</style>
