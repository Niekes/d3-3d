---
title: Iso stack
---

# Iso stack

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { mountIsoStack } from './isoStack';

const host = ref(null);
let dispose;

onMounted(() => {
    if (host.value) dispose = mountIsoStack(host.value);
});

onBeforeUnmount(() => {
    if (dispose) dispose();
});
</script>

<div ref="host" class="iso-stack"></div>

**Click a cartridge** or press <kbd>1</kbd> to <kbd>5</kbd> to send a request
through the stack: it runs down the wire, the interpreter picks it up, a
worker lights while it works and the service answers.

## How the layering works

The figure is a single SVG that is built once. The depth of every slab comes
from the rotated centre of its box, and the boxes are sorted with the
[`sort`](/api/#utility-functions) utility of the library, so the painter
algorithm does the layering:

```ts
const iso = iso3D()
    .rotateX(Math.atan(Math.SQRT2))
    .rotateZ(Math.PI / 4)
    .scale(Math.sqrt(1.5));

const boxes = iso.data(solids);
const sorted = solids
    .map((spec, index) => ({ spec, box: boxes[index], centroid: boxes[index].centroid }))
    .sort(sort);
```

The three angles are the isometric view: they map the world axes onto the
120 degree screen axes, so the three axes of the scene keep their length and
meet at equal angles.

## How a face is drawn

A face is not a projected polygon but an affine frame. The library hands out
the SVG matrix of the face, and everything inside that group is drawn in the
local coordinates of the face:

```ts
const top = iso.plane({
    origin: { x: 200, y: 0, z: 42 },
    u: { x: 1, y: 0, z: 0 },
    v: { x: 0, y: 1, z: 0 }
});

svg += `<g transform="${top.matrix}">
  <rect class="detail" x="5" y="5" width="170" height="150" rx="3"/>
  <text class="label" x="12" y="148" font-size="8.5">WORKER 1</text>
</g>`;
```

Because the projection is orthographic, the image of a plane stays affine.
The browser rasterises the transform, the projection itself costs nothing at
runtime, and a label on the top face needs no trigonometry.

## What it costs

The scene is static. It is built once, the interaction only toggles classes,
so a running figure does no projection and writes nothing to the DOM per
frame. The whole figure is about 250 lines of SVG and a few dozen
elements.

<style>
.iso-stack {
    --iso-body: #ececeb;
    --iso-deck: #f3f3f2;
    --iso-line: #8e9397;
    --iso-detail: #c3c6c8;
    --iso-ink: #6a6f73;
    --iso-ink-hi: #16181a;
    --iso-accent: #ff7a1a;
    --iso-accent-hi: #ffb070;
    --iso-recess: #e2e4e4;
    --iso-panel: #f6f6f5;
    --iso-bg: #e9eaea;
    margin: 1.5rem 0;
    padding: 1.25rem;
    border: 1px solid var(--iso-line);
    border-radius: 12px;
    background: var(--iso-bg);
}

.dark .iso-stack {
    --iso-body: #17181a;
    --iso-deck: #1b1d1f;
    --iso-line: #3d4144;
    --iso-detail: #2b2e30;
    --iso-ink: #868b8f;
    --iso-ink-hi: #e6e8e9;
    --iso-recess: #0e0f10;
    --iso-panel: #141516;
    --iso-bg: #0c0d0e;
}

.iso-stack .iso-svg {
    display: block;
    width: 100%;
    height: auto;
}

.iso-stack .face {
    fill: var(--iso-body);
    stroke: var(--iso-line);
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
    stroke-linejoin: round;
}

.iso-stack .face.top {
    fill: var(--iso-deck);
}

.iso-stack .face.recess {
    fill: var(--iso-recess);
}

.iso-stack .detail {
    fill: none;
    stroke: var(--iso-detail);
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
}

.iso-stack .shadow {
    fill: none;
    stroke: var(--iso-detail);
    stroke-dasharray: 5 5;
    vector-effect: non-scaling-stroke;
}

.iso-stack .lead {
    stroke-dasharray: 3 3;
}

.iso-stack .label {
    fill: var(--iso-ink);
    font-family: var(--vp-font-family-mono, ui-monospace, monospace);
}

.iso-stack .cnt {
    fill: var(--iso-line);
    transition: fill 0.5s;
}

.iso-stack .cnt.hot {
    fill: var(--iso-accent);
}

.iso-stack .scr-accent {
    fill: var(--iso-accent);
}

.iso-stack .halo {
    fill: var(--iso-accent);
    opacity: 0;
    transition: opacity 0.4s;
}

.iso-stack .halo.hot {
    opacity: 0.22;
}

.iso-stack .slab .face {
    transition: fill 0.5s ease-out, stroke 0.5s ease-out;
}

.iso-stack .slab .label {
    transition: fill 0.5s ease-out;
}

.iso-stack .interp .face {
    stroke: var(--iso-ink);
}

.iso-stack .interp .label {
    fill: var(--iso-ink-hi);
}

.iso-stack .slab.hot .face {
    stroke: var(--iso-accent);
    transition: none;
}

.iso-stack .slab.hot .label {
    fill: var(--iso-accent-hi);
    transition: none;
}

.iso-stack .slab.hot {
    filter: url(#iso-soft);
}

.iso-stack .slab.on .face {
    fill: var(--iso-accent);
    stroke: var(--iso-accent-hi);
    transition: none;
}

.iso-stack .slab.on .face.top {
    fill: var(--iso-accent);
}

.iso-stack .slab.on .label {
    fill: var(--iso-panel);
    transition: none;
}

.iso-stack .slab.on .detail {
    stroke: var(--iso-accent-hi);
}

.iso-stack .slab.on {
    filter: url(#iso-soft);
}

.iso-stack .wire {
    fill: none;
    stroke: var(--iso-line);
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
    stroke-linecap: round;
    stroke-linejoin: round;
    transition: stroke 0.4s;
}

.iso-stack .wire.hot {
    stroke: var(--iso-accent);
}

.iso-stack .wire-under {
    fill: none;
    stroke: var(--iso-bg);
    stroke-width: 3.5;
    stroke-linecap: round;
    stroke-linejoin: round;
}

.iso-stack .pulse {
    fill: none;
    stroke: var(--iso-accent-hi);
    stroke-width: 2.2;
    stroke-linecap: round;
    vector-effect: non-scaling-stroke;
    stroke-dasharray: 70 1200;
    stroke-dashoffset: 70;
    opacity: 0;
}

.iso-stack .pulse.go {
    animation: iso-flow 0.55s linear;
}

@keyframes iso-flow {
    0% {
        stroke-dashoffset: 70;
        opacity: 1;
    }
    90% {
        opacity: 1;
    }
    100% {
        stroke-dashoffset: -1000;
        opacity: 0;
    }
}

.iso-stack .press {
    cursor: pointer;
    transition: transform 60ms ease-out;
}

.iso-stack .press.down {
    transform: translateY(3px);
}

.iso-stack .press .face {
    transition: fill 0.6s ease-out, stroke 0.6s ease-out;
}

.iso-stack .press.lit .face {
    fill: var(--iso-accent);
    stroke: var(--iso-accent-hi);
    transition: none;
}

.iso-stack .press.lit .face.top {
    fill: var(--iso-accent-hi);
}

.iso-stack .press:hover .face.top {
    stroke: var(--iso-ink);
}

@media (prefers-reduced-motion: reduce) {
    .iso-stack .press,
    .iso-stack .halo,
    .iso-stack .wire {
        transition: none;
    }
    .iso-stack .pulse.go {
        animation: none;
    }
}
</style>
