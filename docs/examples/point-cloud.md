---
title: Point cloud
---

# Point cloud

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { mountPointCloud } from './pointCloud';

const host = ref(null);
let dispose;

onMounted(() => {
    if (host.value) dispose = mountPointCloud(host.value);
});

onBeforeUnmount(() => {
    if (dispose) dispose();
});
</script>

<div ref="host" class="point-cloud"></div>

**Drag the galaxy** to rotate it. The picker sets the number of stars, from
ten thousand to a million, and the toggle switches between a 2D canvas and
WebGL. The counter in the corner shows the frames per second.

## Why not `points3D().data()` here

`.data()` returns an object per point with its `rotated` and `projected`
coordinates, which is what an SVG join needs. At a million points that is
millions of objects on every frame, and the garbage collector, not the
drawing, sets the frame rate. The galaxy keeps its stars in one
`Float32Array` instead, three numbers per star, built once:

```ts
const positions = new Float32Array(3 * n);
positions[3 * i] = x;
positions[3 * i + 1] = y;
positions[3 * i + 2] = z;
```

## One matrix, two renderers

Without a perspective, a rotation, a scale and an origin make one affine
map, and one 4×4 matrix carries all of it.
A [`camera3D`](/api/#camera) holds the settings without any data, and its
[`.matrix()`](/api/#matrix) returns that matrix, so the galaxy is turned
with the same calls as any other shape:

```ts
const camera = camera3D()
    .scale(SCALE)
    .origin({ x: WIDTH / 2, y: HEIGHT / 2 });
turnCamera(camera, spin + yaw, pitch, { tilt: TILT });
const matrix = camera.matrix();
```

## Canvas: project into a buffer

[`projectPositions`](/api/#projectpositions) runs the matrix over the packed
stars and writes screen x, screen y and depth into a buffer the figure
allocates once. The canvas then adds the light of every star straight into
the pixels of one `ImageData` and puts it on the canvas once per frame:

```ts
projectPositions(positions.subarray(0, 3 * count), matrix, screen);

for (let i = 0; i < count; i += 1) {
    const x = Math.round(screen[3 * i] * dpr);
    const y = Math.round(screen[3 * i + 1] * dpr);
    const j = 4 * (y * width + x);
    pixels[j] += r;
    pixels[j + 1] += g;
    pixels[j + 2] += b;
}

context.putImageData(image, 0, 0);
```

A `fillRect` per star would read better, but at a hundred thousand stars it
already takes about 19 milliseconds a frame, five times as long as the
pixels. The projection is the cheap part either way.

## WebGL: the GPU does the same multiply

WebGL takes the stars once, into a buffer on the GPU. Every frame only
sends the matrix, sixteen numbers, and the vertex shader does what
`projectPositions` does for every star at once. Given the size of the
canvas, [`.matrix()`](/api/#matrix) maps straight to clip space, so the
shader is one line:

```glsl
gl_Position = u_matrix * vec4(a_position, 1.0);
```

```ts
gl.uniformMatrix4fv(matrixLocation, false, camera.matrix({ width: WIDTH, height: HEIGHT }));
gl.drawArrays(gl.POINTS, 0, count);
```

Without a `depth` the matrix sets every z to 0. The galaxy has no use for
the depth: both renderers add the light of the stars, which gives the same
picture in any order, so nothing is sorted.

## Two canvases

A canvas keeps the first kind of context it hands out, so one canvas cannot
switch from `2d` to `webgl2`. The figure holds one canvas per renderer and
shows one of them. Both are sized for the device pixel ratio. The camera
projects to CSS pixels: the canvas multiplies by the ratio, and WebGL hands
the size in CSS pixels to `.matrix()`.

## The whole source

The figure lives in
[docs/examples/pointCloud.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/pointCloud.ts)
in the repository, the canvases, the controls and the loop it shares with
the [bar field](/examples/bar-field) in
[docs/examples/canvasFigure.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/canvasFigure.ts).
The figure, ready to copy:

<<< @/examples/pointCloud.ts
