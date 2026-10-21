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

**Drag the figure** to rotate it, **hover a quad** to read the sample under
it. The pickers swap the shape and the color ramp, the sliders reshape the
surface, the checkboxes fit the ramp to the surface and strip it down to a
wireframe, and the button samples new data at the same amplitude and
frequency and morphs the surface into it.

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

## Two shapes, one sampled function

A shape is a function of the amplitude A, the frequency f and the phase φ
that returns the height at x and z. The ripple is y = A · cos(2f · r + φ),
the cosine of the distance r from the centre; the wave is
y = A · sin(f · x + φ) · cos(f · z + φ), a sine along x times a cosine
along z:

```ts
const SHAPES = {
    ripple: (amplitude, frequency, phase) => (x, z) =>
        amplitude * Math.cos(2 * frequency * Math.hypot(x, z) + phase),
    wave: (amplitude, frequency, phase) => (x, z) =>
        amplitude * Math.sin(frequency * x + phase) * Math.cos(frequency * z + phase)
};
```

The picker chooses the shape, the amplitude slider sets A and the frequency
slider sets f. Every input event samples the shape again and draws it
without a transition; a new shape morphs in:

```ts
function update(duration) {
    const points = sample(
        SHAPES[shape.value](amplitude.valueAsNumber, frequency.valueAsNumber, phase)
    );
    show(points, duration);
}

shape.addEventListener('change', () => update());
amplitude.addEventListener('input', () => update(0));
frequency.addEventListener('input', () => update(0));
```

The button leaves the sliders alone. It picks a random phase, which shifts
the rings and the hills to new places at the same height and spacing, and
morphs the surface into the new data:

```ts
button.on('click', () => {
    phase = randomUniform(0, 2 * Math.PI)();
    update();
});
```

The frequency stops at 0.6. The field is sampled at whole units, so a faster
wave gets fewer samples per hill, and the quads start to show as zig-zags.

## Shading without a light

There is no lighting model in the figure. The height of a quad colors it and
the `ccw` flag shades it: a quad that faces the camera gets the ramp at its
mean height, a quad that faces away gets a darker tint of the same color, so
the two sides of the surface are told apart at a glance:

```ts
function colorize(d) {
    const height = (d[0].y + d[1].y + d[2].y + d[3].y) / 4;
    const base = color(height);
    return d.ccw ? base : rgb(base).darker(2.5).formatHex();
}
```

The `color` function is the ramp the picker selects, through a color scale:

```ts
const colorScale = scaleLinear();

const { group, button, show } = surfaceFigure(
    host,
    'surface',
    'A surface plot. Drag the figure to rotate it.',
    (height) => RAMPS[ramp.value](colorScale(height))
);
```

The fit checkbox decides what the scale spans. Fitted, it spans the heights
of the current samples, so every surface runs through the whole ramp, from
its lowest quad to its highest. Unfitted, it spans the whole amplitude
range, from -12 to 12: a low surface stays in the middle of the ramp, so the
amplitude reads in the colors as well as in the shape:

```ts
colorScale.domain(fit.checked ? extent(points, (d) => d.y) : [-12, 12]);
```

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
attribute and the fill of the existing paths. The first surface fades in,
and every new wave morphs the surface through the same transition:

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

The listener sits on the group, not on the quads, so the join needs no hook
for it.

## A wireframe is a class

The checkbox toggles a class on the figure and nothing else. A CSS rule
beats the `fill` attribute of the paths, so the wireframe needs no redraw,
and `pointer-events: all` keeps the hollow quads hoverable:

```css
.surface-plot.is-wireframe .quad {
    fill: none;
    stroke-opacity: 0.6;
    pointer-events: all;
}
```

## The whole source

The figure lives in
[docs/examples/surfacePlot.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/surfacePlot.ts)
in the repository, its styles in
[docs/examples/surfacePlot.css](https://github.com/niekes/d3-3d/blob/master/docs/examples/surfacePlot.css).
The grid of quads, the shading and the join live in
[docs/examples/surfaceFigure.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/surfaceFigure.ts),
and the SVG and the drag in
[docs/examples/rotatingFigure.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/rotatingFigure.ts).
Both files, ready to copy:

The grid of quads, the shading and the join:

<<< @/examples/surfaceFigure.ts

The figure itself:

<<< @/examples/surfacePlot.ts
