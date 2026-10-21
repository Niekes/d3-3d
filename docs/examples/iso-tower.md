---
title: Office tower
---

# Office tower

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { mountIsoTower } from './isoTower';

const host = ref(null);
let dispose;

onMounted(() => {
    if (host.value) dispose = mountIsoTower(host.value);
});

onBeforeUnmount(() => {
    if (dispose) dispose();
});
</script>

<div ref="host" class="iso-tower"></div>

**Click a floor** to switch its lights on and off. <kbd>↑</kbd> and
<kbd>↓</kbd> move the cursor, <kbd>space</kbd> switches the floor under the
cursor, <kbd>n</kbd> starts the night shift from the lobby to the spire and
<kbd>o</kbd> switches everything off from the top down.

> The style of this figure is inspired by
> [isoglow.dev](https://isoglow.dev/), an isometric gallery of small machines
> and cities by April Zhu. The figure here is an original implementation with
> the `iso3D` renderer of this library.

## A building is not an exploded diagram

The [iso stack](/examples/iso-stack) sorts its slabs with the `sort` utility
of the library: the slabs stand apart, so the depth of their centre decides
the order. A building does not work that way. A floor band rests on the
facade it belongs to, so the centre of the band is _farther_ from the camera
than the centre of the tower. A global sort would swallow the lower floors.

The tower is therefore drawn in the order of its parts, from the city block
up to the beacon, and only the street trees are sorted — they stand next to
each other and the nearest one has to be drawn last.

## The same kernel, the other way round

The tower is the counterpart of the stack: where the stack explodes a
structure into floating slabs, the tower stacks a structure into a solid.
Both use the same three lines of setup, because the projection is the same:

```ts
const iso = iso3D()
    .rotateX(Math.atan(Math.SQRT2))
    .rotateZ(Math.PI / 4)
    .scale(Math.sqrt(1.5));
```

The difference is what the library hands out. The stack needs the frame of
a face to place its labels, the tower needs the projected point of the
spire to hang the beacon on it:

```ts
const beacon = iso.project([{ x: 104, y: 72, z: 336 }])[0];
```

## The whole source

The figure lives in
[docs/examples/isoTower.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/isoTower.ts)
in the repository. It shares the projection, the face frames and the filters
with the [iso stack](/examples/iso-stack), that part lives in
[docs/examples/isoCommon.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/isoCommon.ts).
Both files, ready to copy:

The shared parts:

<<< @/examples/isoCommon.ts

The figure itself:

<<< @/examples/isoTower.ts

<style>
.iso-tower {
    --iso-body: #ececeb;
    --iso-deck: #f3f3f2;
    --iso-line: #8e9397;
    --iso-detail: #c3c6c8;
    --iso-ink: #6a6f73;
    --iso-ink-hi: #16181a;
    --iso-accent: #ff7a1a;
    --iso-accent-hi: #ffb070;
    --iso-recess: #e2e4e4;
    --iso-glass: #dcdede;
    --iso-panel: #f6f6f5;
    --iso-bg: #e9eaea;
    margin: 1.5rem 0;
    position: relative;
    overflow: hidden;
    border: 1px solid var(--iso-line);
    border-radius: 12px;
    background: var(--iso-bg);
}

.dark .iso-tower {
    --iso-body: #17181a;
    --iso-deck: #1b1d1f;
    --iso-line: #3d4144;
    --iso-detail: #2b2e30;
    --iso-ink: #868b8f;
    --iso-ink-hi: #e6e8e9;
    --iso-recess: #0e0f10;
    --iso-glass: #0f1011;
    --iso-panel: #141516;
    --iso-bg: #0c0d0e;
}

.iso-tower .iso-svg {
    display: block;
    width: 100%;
    height: auto;
}

.iso-tower .iso-readout {
    margin: 0.75rem 0 0;
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--iso-ink);
}

.iso-tower .face {
    fill: var(--iso-body);
    stroke: var(--iso-line);
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
    stroke-linejoin: round;
}

.iso-tower .face.top {
    fill: var(--iso-deck);
}

.iso-tower .face.recess {
    fill: var(--iso-recess);
}

.iso-tower .detail {
    fill: none;
    stroke: var(--iso-detail);
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
}

.iso-tower .label {
    fill: var(--iso-ink);
    font-family: var(--vp-font-family-mono, ui-monospace, monospace);
}

.iso-tower .fl {
    cursor: pointer;
}

.iso-tower .fl .band {
    transition: fill 0.3s;
}

.iso-tower .fl:hover .band {
    stroke: var(--iso-ink);
}

.iso-tower .pn {
    fill: var(--iso-recess);
    stroke: var(--iso-detail);
    stroke-width: 0.6;
    vector-effect: non-scaling-stroke;
    transition: fill 0.25s, opacity 0.25s;
}

.iso-tower .fl.on .pn {
    fill: var(--iso-accent);
    stroke: var(--iso-accent-hi);
}

.iso-tower .fl.on .pn.hi {
    fill: var(--iso-accent-hi);
}

.iso-tower .fl.on .pn.dim {
    opacity: 0.45;
}

.iso-tower .fl.on .pn.off {
    fill: var(--iso-recess);
    stroke: var(--iso-detail);
}

.iso-tower .fl.on .win {
    filter: url(#iso-soft);
}

.iso-tower .halo {
    fill: var(--iso-accent);
    opacity: 0;
    transition: opacity 0.4s;
}

.iso-tower .fl.on .halo {
    opacity: 0.38;
}

.iso-tower .cur {
    fill: none;
    stroke: var(--iso-accent-hi);
    stroke-width: 1.6;
    vector-effect: non-scaling-stroke;
    opacity: 0;
    pointer-events: none;
}

.iso-tower .fl.cursor .cur {
    opacity: 1;
    filter: url(#iso-soft);
}

.iso-tower .beacon {
    fill: var(--iso-accent-hi);
    animation: tower-blink 1.4s steps(1) infinite;
}

.iso-tower .beacon-halo {
    fill: var(--iso-accent);
    opacity: 0.5;
    animation: tower-blink 1.4s steps(1) infinite;
}

.iso-tower .mast {
    fill: none;
    stroke: var(--iso-line);
    stroke-width: 1.2;
    vector-effect: non-scaling-stroke;
}

.iso-tower .lobby-glass {
    fill: var(--iso-glass);
    stroke: var(--iso-line);
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
    transition: fill 0.4s, stroke 0.4s;
}

.iso-tower.lit .lobby-glass {
    fill: var(--iso-accent);
    stroke: var(--iso-accent-hi);
    opacity: 0.85;
}

.iso-tower.lit .lobby-door {
    fill: var(--iso-accent-hi);
}

.iso-tower.lit .lobby-fx {
    filter: url(#iso-soft);
}

.iso-tower .lobby-door {
    fill: var(--iso-recess);
    stroke: var(--iso-line);
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
    transition: fill 0.4s;
}

@keyframes tower-blink {
    0% {
        opacity: 1;
    }
    45% {
        opacity: 0.08;
    }
}

@media (prefers-reduced-motion: reduce) {
    .iso-tower .beacon,
    .iso-tower .beacon-halo {
        animation: none;
    }
    .iso-tower .pn {
        transition: none;
    }
}
</style>
