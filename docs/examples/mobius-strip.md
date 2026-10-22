---
title: Möbius strip
---

# Möbius strip

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { mountMobiusStrip } from './mobiusStrip';

const host = ref(null);
let dispose;

onMounted(() => {
    if (host.value) dispose = mountMobiusStrip(host.value);
});

onBeforeUnmount(() => {
    if (dispose) dispose();
});
</script>

<div ref="host"></div>

**Drag the figure** to rotate it. The slider sets the half-twists of the
strip, from a flat ring at 0 to five, and **show winding** paints every
triangle by its `ccw` flag. The button plays and pauses the walker. With the
figure focused, the left and right arrow keys walk it, <kbd>Space</kbd> plays
and pauses, <kbd>+</kbd> and <kbd>−</kbd> change the half-twists and
<kbd>W</kbd> shows the winding. With `prefers-reduced-motion` the walker
starts paused after one lap.

## A strip of triangles

The strip runs around a circle of radius R = 1 and across it from −w to w,
with w = 0.35. With k half-twists, the segment across turns by k · u / 2 on
the way around:

```ts
function surface(k: number, u: number, v: number): Point3D {
    const r = RADIUS + v * Math.cos((k * u) / 2);
    return { x: r * Math.cos(u), y: v * Math.sin((k * u) / 2), z: r * Math.sin(u) };
}
```

For an odd k, the point at u + 2π and v is the point at u and −v. That is the
one side, in one line: a lap around the strip ends on the other face of where
it started.

The mesh samples 96 steps around and 4 across, and every quad of the
parameter grid becomes two triangles, 768 in all. Every triangle is wound in
the order of its parameters, from (i, j) along u and then along v:

```ts
const [a, b, c, d] = [grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]];
return [
    [a, b, c],
    [a, c, d]
];
```

The mesh is rebuilt only when the slider moves, and the `normal` of every
triangle is computed with it, once, in model space.

## Lit from either side

The light sits at the camera, a headlight. A face is lit by the cosine
between its `normal` and the direction towards the viewer, which
[`.viewDirection()`](/api/#viewdirection) returns in world coordinates. Both
are unit vectors, so the cosine is their dot product.

A face that turns away has a negative cosine. A closed shape hides those faces,
as the [solar system](/examples/solar-system) does, and a
[surface plot](/examples/surface-plot) shades them darker. A strip with one
side has no back to hide or darken: the same face is seen from one side here
and from the other side half a lap later. The absolute value lights a face
alike from both:

```ts
const view = camera.viewDirection();
const light = AMBIENT + (1 - AMBIENT) * Math.abs(dot(normals[i], view));
```

A face seen edge-on still gets the ambient quarter of the light, so it never
paints as a black sliver. The camera keeps the default orthographic
projection, so one view direction holds for every face. In perspective the
direction towards the eye differs per face, and the headlight would take
that instead.

## The seam

The winding is a choice the mesh makes, and `ccw` reports it: whether the
points of a projected triangle run counter-clockwise on the screen. Check
**show winding** and the triangles with `ccw` set turn blue, the others
orange:

```ts
const ramp = !winding ? STRIP : d.ccw ? FRONT : BACK;
```

With 2 half-twists the band has two sides, and the winding is consistent all
the way round: each side keeps one color at every rotation. With 1 half-twist
no winding is consistent. The triangles next to u = 0 and the ones next to
u = 2π lie side by side, wound in opposite directions, and a seam runs across
the strip there, where the colors swap. The seam is where the parameters
wrap, not a property of the shape: the light, which ignores the winding,
shows no seam at all.

## Two laps to come home

The walker runs along the centre line, at v = 0, and carries an arrow along
the normal of the surface. The arrow is the `normal` of a tiny triangle in
the same parameter order as the mesh:

```ts
function arrowAt(k: number, s: number): Point3D {
    return normal([surface(k, s, 0), surface(k, s + EPSILON, 0), surface(k, s, EPSILON)]);
}
```

The parameter s runs from 0 to 4π and is not wrapped at 2π, so the formula
stays continuous and the arrow follows the surface without a jump. On a
Möbius strip it comes back after one lap pointing the other way, and only a
second lap brings it home. The readout compares the arrow with the one at
the same place on the first lap:

```ts
const isFlipped = () => dot(arrowAt(twists, s), arrowAt(twists, s % TAU)) < 0;
```

The walker goes into the painter's list with the triangles. Its dot sits
0.02 above the surface along its arrow, so it sorts on its own side of the
strip and hides while it walks underneath.

## One edge

The boundary is drawn with `lineStrips3D`. For an odd k it is a single loop:
it starts at v = w, and after one lap it has reached the other border, so it
takes two laps to close. For an even k the borders at v = w and v = −w are
two loops of one lap each:

```ts
const loops = k % 2 ? [loop(HALF_WIDTH, 2)] : [loop(HALF_WIDTH, 1), loop(-HALF_WIDTH, 1)];
return loops.flatMap((points) => strips(points, EDGE_PIECE));
```

`sort` orders a line strip by its middle, so one long loop would sit at one
depth and be painted wrongly half of the time. `strips` cuts every loop into
pieces of six samples that share their end points, and every piece sorts
with the triangles on its own depth:

```ts
group.selectAll('path, line, circle').sort(sort);
```

The count of edges is the quickest proof of one side: the readout says one
side and one edge for an odd count of half-twists, two of each for an even
one.

## The whole source

The figure and its styles live in
[docs/examples/mobiusStrip.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/mobiusStrip.ts)
in the repository: the figure adds the styles and its class to the element
it mounts into, so it needs no stylesheet. The SVG, the drag and the play
button live in
[docs/examples/rotatingFigure.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/rotatingFigure.ts),
the join of the triangles in
[docs/examples/facets.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/facets.ts)
and the arrow in
[docs/examples/segments.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/segments.ts).
The figure, ready to copy:

<<< @/examples/mobiusStrip.ts
