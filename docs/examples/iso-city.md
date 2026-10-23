---
title: Neon city
---

# Neon city

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { mountIsoCity } from './isoCity';

const host = ref(null);
let dispose;

onMounted(() => {
    if (host.value) dispose = mountIsoCity(host.value);
});

onBeforeUnmount(() => {
    if (dispose) dispose();
});
</script>

<div ref="host" class="iso-city"></div>

**Hover a lot** to light it up. The traffic runs on its own.

## Three faces, three shades

An isometric picture reads as solid when every box has a bright top, a lit
side and a side in the shade. `iso3D` draws the visible wall of a box as one
path, but it also hands back the frame of every visible face: `frontPlane`
for the face on the left of the screen and `sidePlane` for the one on the
right. In its frame a face is a plain rectangle, `w` or `d` wide and `h`
high, with y running down the wall:

```ts
face(box.frontPlane, spec.w, spec.h, 'left', windows) +
    face(box.sidePlane, spec.d, spec.h, 'right', windows) +
    `<path class="top" d="${box.top}"/>`;
```

The stylesheet mixes the three shades from one neon hue per building, so a
building needs a single color:

```css
.iso-city .body {
    --left: color-mix(in srgb, var(--c) 50%, var(--ic-night));
    --right: color-mix(in srgb, var(--c) 28%, var(--ic-night));
    --top: color-mix(in srgb, var(--c) 70%, white);
}
```

## Windows live in the frame of their face

The frame of a face is one SVG matrix, so the windows on it are rectangles in
storeys and columns. Nothing projects them: the browser maps the whole group
onto the wall.

```ts
`<rect class="pane ${state}" x="${(col + 0.25) * pitch}" y="${row * STOREY + 1}" width="${pitch / 2}" height="${STOREY / 2}"/>`;
```

## Paint by the lot

A tower sorted by its own centre would paint over the low shop in front of
it: the centre of a tall box sits high up, and in this view high up is near
the camera. The lots never overlap, so the sidewalk under every building
orders them, and `sort` paints them back to front. On a lot the pieces stack
from the bottom up, a set-back top on its tower, a billboard on its shop, so
drawing them in order is enough.

The trees of a park are boxes too, with a corner radius of half their width,
which makes them round. They stand apart, so `sort` orders them like the
lots.

## Traffic is a dash

A light trail lies flat on the street. A flat thing on the ground can only be
hidden by what stands in front of it, never hide it, so the traffic is drawn
before every building and needs no sorting. Every lane is one `iso.path`
along a street, and CSS runs a dash along it:

```css
.iso-city .lane path {
    stroke-dasharray: 3 19 6 40;
    animation: iso-city-drive var(--t) linear var(--d) infinite;
}

@keyframes iso-city-drive {
    to {
        stroke-dashoffset: -68;
    }
}
```

## The whole source

The figure lives in
[docs/examples/isoCity.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/isoCity.ts)
in the repository, its styles in
[docs/examples/isoCity.css](https://github.com/niekes/d3-3d/blob/master/docs/examples/isoCity.css),
and the projection and the filters in
[docs/examples/isoCommon.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/isoCommon.ts).
The figure, ready to copy:

<<< @/examples/isoCity.ts
