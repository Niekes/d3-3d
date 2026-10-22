---
title: Particle text morph
---

# Particle text morph

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { mountParticleTextMorph } from './particleTextMorph';

const host = ref(null);
let dispose;

onMounted(() => {
    if (host.value) dispose = mountParticleTextMorph(host.value);
});

onBeforeUnmount(() => {
    if (dispose) dispose();
});
</script>

<div ref="host"></div>

**Pick a preset**, or **type your own text** and press <kbd>Enter</kbd>, and
the 1500 particles fly into it. **Drag the figure** to rotate it, during a
flight too; a flick lets it spin out. The button steps to the next preset.

## Text into data

The figure has no font parser. It draws the text onto a canvas of 320 × 100
pixels that is never on the page, in a bold `system-ui` that shrinks until
the text fits, and reads the pixels back. Every pixel with an alpha above
127 becomes a point of the model, with the canvas spread over x from −1.6
to 1.6 and y from −0.5 to 0.5. The canvas y grows downwards like the screen
y, so the text stands upright:

```ts
if (data[4 * i + 3] > 127) {
    const column = i % CANVAS_WIDTH;
    const row = (i - column) / CANVAS_WIDTH;
    pixels.push({ x: (column + 0.5) * PIXEL - 1.6, y: (row + 0.5) * PIXEL - 0.5, z: 0 });
}
```

There are always 1500 particles. A word with more opaque pixels gives up a
sample of them, shuffled by the seeded `randomLcg` of d3, so the same text
always gives the same particles. A short one, such as a single dot, repeats
its pixels, each repeat jittered within its pixel. Every particle gets a
depth of up to 0.06 to either side, so a turn shows a slab and not a sheet.
The figure reads the canvas back for every text, so it asks for the context
with `willReadFrequently`.

The canvas is the sampler, so any font the browser has works, and every
platform samples its own `system-ui`: the letters differ a little between
systems. The sphere, the torus and the helix are sampled at 1500 points too,
the sphere as a Fibonacci spiral and the tube of the torus by the golden
angle.

## Morph the data, not the picture

A morph never interpolates on the screen. It keeps where every particle
was when the morph began and where it goes, both in the model, and every
frame of a d3 `timer` mixes the two and projects the result again:

```ts
const k = Math.min(1, Math.max(0, (t - goal.tone * STAGGER) / (1 - STAGGER)));
const e = easeCubicInOut(k);
const x = start.x + (goal.x - start.x) * e;
```

`tone` is the x of the target, from 0 at the left to 1 at the right, so a
particle sets off later the further right it lands, by up to 30 % of the 1.4
seconds: the stagger of the [pixel space](/examples/pixel-space). A drag
during a flight changes only the turn, and the next frame projects whatever
positions it holds, so the particles turn with the scene and none of them
jumps. A morph that starts during another one begins at the current
positions. With `prefers-reduced-motion` the particles jump to their
targets.

The pixel space does the same with up to 160,000 points on a canvas; here
the points are SVG elements that keep their identity. Every particle flies
to the point of the new shape with its rank in x, so the leftmost particle
lands on the leftmost point and the morph reads from left to right:

```ts
const ranked = [...target].sort((a, b) => a.x - b.x);
range(COUNT)
    .sort((a, b) => particles[a].x - particles[b].x)
    .forEach((id, rank) => {
        const { x, y, z } = ranked[rank];
        goals[id] = { id, x, y, z, tone: (x - left) / width };
    });
```

The ranks ignore y and z, so paths cross where two shapes differ in height
or depth. An assignment by nearest neighbor would untangle them; an optimal
one costs the cube of 1500.

## The same circles all the way

The circles are joined by the index of their particle, and the index never
changes. After the first frame the enter and the exit selections stay
empty, so no particle ever enters or leaves: a morph is an update and
nothing else. [`sort`](/api/#sort) paints them back to front.

```ts
group
    .selectAll('circle')
    .data(dots.data(particles), (d) => d.id)
    .join((enter) => enter.append('circle').attr('r', DOT))
    .attr('cx', (d) => d.projected.x)
    .attr('cy', (d) => d.projected.y)
    .sort(sort);
```

The figure has one renderer, so the renderer is the camera, and the drag
turns it. The fill of a circle mixes the two ends of a ramp by its tone with
`color-mix`. The ends are CSS variables, so the dark theme recolors the
particles without a redraw.

## Your own text

The field is the one place where the page takes text from outside. It holds
12 characters, and the code caps the text again: it trims it and cuts it to
12 characters, counted by code point, so an emoji is never cut in half:

```ts
const text = Array.from(field.value.trim()).slice(0, MAX_LENGTH).join('');
```

The text never becomes markup. The canvas draws it with `fillText`, and the
status line shows it with `textContent`, never with `innerHTML`: typed tags
are drawn as letters. An empty text says "Type at least one character.", and
a text without an opaque pixel, such as a zero-width space, says "Nothing to
draw for that text."; both keep the current shape. The focus stays in the
field, and a polite live region announces every morph.

## The whole source

The figure and its styles live in
[docs/examples/particleTextMorph.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/particleTextMorph.ts)
in the repository: the figure adds the styles and its class to the element
it mounts into, so it needs no stylesheet. The SVG and the drag live in
[docs/examples/rotatingFigure.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/rotatingFigure.ts).
The figure, ready to copy:

<<< @/examples/particleTextMorph.ts
