---
title: Solar system
---

# Solar system

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { mountSolarSystem } from './solarSystem';

const host = ref(null);
let dispose;

onMounted(() => {
    if (host.value) dispose = mountSolarSystem(host.value);
});

onBeforeUnmount(() => {
    if (dispose) dispose();
});
</script>

<div ref="host" class="solar-system"></div>

**Drag the figure** to rotate it. The button pauses and resumes the orbits.
Nothing is to scale: the sizes, the distances and the periods are picked so
that all eight planets fit on the page and Neptune still moves.

## Every body is a sphere of triangles

A body is a half circle from pole to pole, turned around the y axis by
`lathe`. Between two rings every quad becomes two triangles, and next to a
pole, where the ring has no radius, one. So a body is a plain list of point
triples built around the origin - the sun from 16 bands, the moon from 6:

```ts
lathe([{ x: 0, y: radius }, ...halfCircle, { x: 0, y: -radius }], segments);
```

`lathe` winds every triangle counter-clockwise as seen from outside, so
the `ccw` flag of a projected triangle tells the near side of a body from
the far side. The far side is hidden, which halves the painted paths.

## One join for all bodies

On every frame each body gets its place on its orbit, a circle in the x-z
plane around the sun, or around the earth for the moon. Its triangles are
moved there and all of them go through a single `triangles3D`:

```ts
const facets = triangles.data(mesh).map((d, i) => Object.assign(d, { id: i, fill: fills[i] }));
const paths = group.selectAll('path').data(facets, (d) => d.id);
```

`data` returns new arrays, so the index is stamped on after the projection
and is the key of the join. One `data` call matters for the painter's
algorithm: the `sort` utility orders the
triangles of all bodies together, so the sun hides a planet behind it and a
planet in front hides the sun.

```ts
group.selectAll('path').sort(sort);
```

## Lit by the sun

The side of a planet that faces the sun is bright, the other side dark. The
light of a triangle is the cosine between its `normal` and the way to the
sun, taken in world space before the projection, so the drag does not
change it:

```ts
const n = normal(triangle);
const cos = -dot(n, center) / length(center);
const fill = interpolateRgb('#000', body.color)(Math.max(NIGHT, cos));
```

## The animation

A d3 `timer` moves the clock on by the time since the last frame, and the
angle of a body is its share of the period:

```ts
const angle = (t / body.period) * Math.PI * 2;
```

The orbits are `lineStrips3D` circles that share the rotation of the
triangles. `sort` orders a strip by its middle, so a whole orbit would sit at
the depth of the sun. `strips` cuts every orbit into short pieces that go
into the painter's list with the triangles, so an orbit passes in front of
the sun and behind it:

```ts
strips(orbitPoints, ORBIT_STRIP);
group.selectAll('path').sort(sort);
```

With `prefers-reduced-motion` the figure starts paused.

## The whole source

The figure lives in
[docs/examples/solarSystem.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/solarSystem.ts)
in the repository, the SVG, the drag and the play button it shares with the
trajectory explorer in
[docs/examples/rotatingFigure.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/rotatingFigure.ts)
and the join of the triangles it shares with the Möbius strip in
[docs/examples/facets.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/facets.ts).
The complete file, ready to copy:

<<< @/examples/solarSystem.ts

<style>
.solar-system {
    --ss-orbit: #8a96a3;
    --ss-button: #17181a;
    --ss-button-ink: #e6e8e9;
    --ss-button-line: #3d4144;
    margin: 1.5rem 0;
    position: relative;
    overflow: hidden;
    border: 1px solid var(--ss-button-line);
    border-radius: 12px;
    /* Space stays dark in both themes. */
    background: #05070a;
}

.solar-system .solar-system-svg {
    display: block;
    width: 100%;
    height: auto;
    cursor: grab;
    touch-action: none;
}

.solar-system .solar-system-svg:active {
    cursor: grabbing;
}

.solar-system .facet {
    stroke: #000;
    stroke-opacity: 0.2;
    stroke-width: 0.5;
}

.solar-system .orbit {
    fill: none;
    stroke: var(--ss-orbit);
    stroke-opacity: 0.3;
}

.solar-system .solar-system-button {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    padding: 0.35rem 0.9rem;
    border: 1px solid var(--ss-button-line);
    border-radius: 8px;
    background: var(--ss-button);
    color: var(--ss-button-ink);
    font-size: 0.85rem;
    cursor: pointer;
}

.solar-system .solar-system-button:hover {
    border-color: var(--ss-button-ink);
}
</style>
