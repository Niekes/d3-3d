---
title: Terrain plot
---

# Terrain plot

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { mountTerrainPlot } from './terrainPlot';

const host = ref(null);
let dispose;

onMounted(() => {
    if (host.value) dispose = mountTerrainPlot(host.value);
});

onBeforeUnmount(() => {
    if (dispose) dispose();
});
</script>

<div ref="host" class="terrain-plot"></div>

**Drag the figure** to rotate it, **hover a quad** to read the sample under
it. The sliders reshape the terrain, the picker swaps the color ramp, the
checkbox strips the surface down to a wireframe and the button picks a
random terrain and morphs the surface into it.

The grid of quads, the shading by height and the painter's algorithm are
the ones of the [surface plot](/examples/surface-plot): both figures draw
through the same surface figure. This page is about what the terrain adds.

## A terrain is one sampled function

The terrain is y = A · sin(f · x) · cos(f · z): a sine along x times a
cosine along z, A units high. The amplitude slider sets A, the frequency
slider sets f, and every input event samples the function again and draws
it without a transition:

```ts
function terrain(amplitude, frequency) {
    return (x, z) => amplitude * Math.sin(frequency * x) * Math.cos(frequency * z);
}

function update(duration) {
    show(sample(terrain(amplitude.valueAsNumber, frequency.valueAsNumber)), duration);
}

amplitude.addEventListener('input', () => update(0));
frequency.addEventListener('input', () => update(0));
```

The frequency stops at 0.6. The field is sampled at whole units, so a faster
wave gets fewer samples per hill, and the quads start to show as zig-zags.

## One color function, four ramps

The surface figure asks for one function: the color of a mean height. The
terrain hands it the ramp the picker selects, through a color scale that
spans the whole amplitude range, from -12 to 12, not the heights of the
current samples. A low terrain stays in the middle of the ramp, so the
amplitude reads in the colors as well as in the shape:

```ts
const colorScale = scaleLinear().domain([-12, 12]);

const { group, button, show } = surfaceFigure(
    host,
    'terrain',
    'A terrain plot. Drag the figure to rotate it.',
    (height) => RAMPS[ramp.value](colorScale(height))
);
```

The surface figure still gives the quads that face away from the camera a
darker tint, in every ramp.

## Reading the original coordinates

A transformed point keeps the properties of its input next to its `rotated`
and `projected` coordinates, so `d[0].y` is still the height of the sample,
not a screen coordinate. The tooltip needs no lookup table: one listener on
the group of quads takes the quad under the pointer from the event target,
reads the sample straight off its first corner and hides while a button is
pressed, so it does not trail behind a drag:

```ts
function showTooltip(event) {
    tooltip.hidden = event.buttons !== 0;
    if (tooltip.hidden) {
        return;
    }
    const d = select(event.target).datum();
    const [left, top] = pointer(event, host);
    tooltip.textContent = `x ${d[0].x}, z ${d[0].z}, y ${d[0].y.toFixed(2)}`;
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.classList.toggle('is-left', left > host.clientWidth / 2);
}

group.on('pointermove', showTooltip).on('pointerleave', () => {
    tooltip.hidden = true;
});
```

The listener sits on the group, not on the quads, so the join the terrain
shares with the surface plot needs no hook for it.

## A wireframe is a class

The checkbox toggles a class on the figure and nothing else. A CSS rule
beats the `fill` attribute of the paths, so the wireframe needs no redraw,
and `pointer-events: all` keeps the hollow quads hoverable:

```css
.terrain-plot.is-wireframe .quad {
    fill: none;
    stroke-opacity: 0.6;
    pointer-events: all;
}
```

## The whole source

The figure lives in
[docs/examples/terrainPlot.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/terrainPlot.ts)
in the repository, its styles in
[docs/examples/terrainPlot.css](https://github.com/niekes/d3-3d/blob/master/docs/examples/terrainPlot.css).
It shares the grid of quads, the shading and the join with the
[surface plot](/examples/surface-plot), that part lives in
[docs/examples/surfaceFigure.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/surfaceFigure.ts),
and the SVG and the drag in
[docs/examples/rotatingFigure.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/rotatingFigure.ts).
Both files, ready to copy:

The shared parts:

<<< @/examples/surfaceFigure.ts

The figure itself:

<<< @/examples/terrainPlot.ts
