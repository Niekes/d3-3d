---
title: Bar field
---

# Bar field

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { mountBarField } from './barField';

const host = ref(null);
let dispose;

onMounted(() => {
    if (host.value) dispose = mountBarField(host.value);
});

onBeforeUnmount(() => {
    if (dispose) dispose();
});
</script>

<div ref="host" class="bar-field"></div>

**Drag the field** to rotate it, also from below. The picker sets the number
of bars, from 2,500 to 40,000, and the toggle switches between a 2D canvas
and WebGL. The counter in the corner shows the frames per second. The
height of a bar is also its color: one blue, darker for the higher bars on
a light page and lighter on a dark one.

## One matrix, two renderers

The field is a 3D bar chart of a height map: a square grid of bars over the
floor from -1 to 1. Both renderers take its projection from
[`.matrix()`](/api/#matrix) of a [`camera3D`](/api/#camera), which the drag
turns like any shape. Neither builds the bars with `.data()`: every frame
that would build an object for every corner of every bar. The corners stay
in one `Float32Array` instead, eight per bar.

## WebGL: the depth buffer sorts

WebGL holds one unit bar, twelve triangles, and draws it once per bar: an
instance. Every instance brings the position, the height and the color of
its bar, and the vertex shader stretches the unit bar to it:

```glsl
vec3 world = vec3(
    a_bar.x + a_corner.x * u_width,
    -a_corner.y * a_bar.z,
    a_bar.y + a_corner.z * u_width
);
vec4 p = u_matrix * vec4(world, 1.0);
gl_Position = vec4(p.x / u_size.x * 2.0 - 1.0, 1.0 - p.y / u_size.y * 2.0, -p.z / 2.0, 1.0);
```

The z of the matrix is the depth that [`sort`](/api/#sort) reads, and a
larger depth is nearer the viewer. Clip space wants the near end smaller,
so the shader turns it around. With `gl.enable(gl.DEPTH_TEST)` the GPU then
keeps, for every pixel, the face nearest to the viewer. Nothing is sorted,
and forty thousand bars cost one call:

```ts
gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, field.n * field.n);
```

That holds for opaque bars. See-through bars blend with what lies behind
them, and those would have to be sorted in WebGL too.

## Canvas: the loop is the sort

A 2D canvas paints over what it painted before, so the bars have to come
from the back to the front. `sort` orders by the centroid, and with bars of
different heights that order can break: a tall bar right behind a low one
has its centroid high up, and seen from above, height brings a point
nearer. `sort` then paints the tall bar last, over the top of the low bar
in front of it.

On a grid the order needs no sort at all. The rows go from the far end to
the near one, and so do the bars in a row. Which end is near tells
[`.viewDirection()`](/api/#viewdirection) of the camera, the direction
towards the viewer: the high end of x is near where it points along +x, the
high end of z where it points along +z. The top is the high end of y, which
points to -y, so it is near where the view direction points along -y:

```ts
const v = camera.viewDirection();
const near = [v.x > 0, v.y < 0, v.z > 0];
const [i0, di] = near[0] ? [0, 1] : [n - 1, -1];
const [k0, dk] = near[2] ? [0, 1] : [n - 1, -1];

for (let row = 0, k = k0; row < n; row += 1, k += dk) {
    for (let column = 0, i = i0; column < n; column += 1, i += di) {
        drawBar(k * n + i);
    }
}
```

## Three faces per bar

A box shows at most three faces: one along each axis, the one on the side
of the camera. All bars face the same way, so the view direction tells
that side once per frame, with the same `near`: the top shows where it
points up, the side at +x where it points along +x. The three faces of a box never overlap each
other, so a bar paints them in any order:

```ts
projectPositions(field.corners, matrix, screen);

for (const corner of faces[axis]) {
    const at = 24 * bar + 3 * corner;
    context.lineTo(screen[at], screen[at + 1]);
}
context.fillStyle = styles[3 * bar + axis];
context.fill();
```

The canvas pays for every face it fills. On the machine this page was
written on, ten thousand bars, thirty thousand faces, run at about a
hundred frames a second, and forty thousand bars drop to some twenty.
WebGL draws all of them in the time of a frame.
[`cubes3D`](/api/#cubes3d) with `ccw` and `Path2D(cubes.draw(face))` draws
on a canvas too and does well for a few hundred bars, as long as the bars
are painted in the grid order above and not with `sort`.

## The whole source

The figure lives in
[docs/examples/barField.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/barField.ts)
in the repository, the canvases, the controls and the loop it shares with
the [point cloud](/examples/point-cloud) in
[docs/examples/canvasFigure.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/canvasFigure.ts).
The figure, ready to copy:

<<< @/examples/barField.ts
