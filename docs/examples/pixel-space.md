---
title: Pixel space
---

# Pixel space

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { mountPixelSpace } from './pixelSpace';

const host = ref(null);
let dispose;

onMounted(() => {
    if (host.value) dispose = mountPixelSpace(host.value);
});

onBeforeUnmount(() => {
    if (dispose) dispose();
});
</script>

<div ref="host" class="pixel-space"></div>

Every pixel of Van Gogh's *The Starry Night* is a point. **Pick a layout**,
and the pixels move from the painting on the floor to a relief of their
lightness, into the RGB cube or into the HSL cylinder. **Hold Space and
drag** to orbit; a plain drag leaves the figure still. **Hover** a pixel to
read its position and its color, and **click** one to pick its color: every
pixel of another color fades. The pick stays when the
layout changes, so a cluster picked in the cylinder shows where it lies in
the painting. The sliders turn the hues, scale the saturation and the
lightness and spread the lightness away from the middle gray for the
contrast, and in the relief and the color spaces the cloud moves with them.

## From custom elements to typed arrays

A [gist from 2018](https://gist.github.com/Niekes/74a509b574e9e30b0e67d2c8cbd70699)
drew 22,500 pixels on a canvas and kept the data join of d3: it bound the
pixels to detached `custom` elements, let a d3 transition change their
attributes and drew the canvas from those elements on every tick of a timer.
That keeps the API of d3, but every pixel is still a node, and every frame
reads its attributes back as strings.

Here no pixel is a node, nor an object. A layout is one `Float32Array` of
packed x, y, z, built once when the layout or the colors change:

```ts
out[at] = (rgbs[at] / 255 - 0.5) * SIDE;
out[at + 1] = (0.5 - rgbs[at + 1] / 255) * SIDE;
out[at + 2] = (rgbs[at + 2] / 255 - 0.5) * SIDE;
```

## One transition for every pixel

A change of the layout keeps the positions on the screen in `from` and
places the pixels in `targets`. Each frame then interpolates between the
two, with an easing and a delay that grows across the painting, so the
pixels set off in a wave:

```ts
const delay = ((column / w + row / h) / 2) * STAGGER;
const e = easeCubicInOut(clamp((t - delay) / (1 - STAGGER)));
current[k] = from[k] + (targets[k] - from[k]) * e;
```

This is the transition the gist had d3 run for every element, as one loop
over a buffer. A slider that moves while the pixels travel only changes
`targets`, and the pixels turn towards the new place.

## Depth and picking from one buffer

[`projectPositions`](/api/#projectpositions) projects the packed points with
the matrix of a [`camera3D`](/api/#camera) into a buffer of screen x,
screen y and depth. Points in a color space overlap in any order, so the
canvas keeps a depth for every screen pixel, the way a GPU does. A point
writes its square of pixels only where it is nearer than what is there, and
it writes its own index beside its color:

```ts
if (depth > depths[p]) {
    depths[p] = depth;
    colors[p] = painted[i];
    ids[p] = i;
}
```

No sort is needed, and the index buffer answers the pointer: the pixel of
the painting under it is `ids[y * width + x]`, one read for the hover and
one for the click, at any number of points. The frame is drawn with one
`putImageData`.

## The frames of the color spaces

The RGB cube is a [`box`](/api/#box), whose eight corners come in the order
of `cubes3D`. The faces never move, so their [`normal`](/api/#normal)s are
computed once. A face looks at the camera where its normal points along the
[`viewDirection`](/api/#viewdirection) of the camera, so the canvas strokes
the back faces dashed and the front faces over them:

```ts
const v = camera.viewDirection();
const front = dot(normals[f], v) > 0;
```

The HSL cylinder gets a ring of hues at half the lightness, so a cluster
sits beside the hue it has. The same test splits the ring: a point of the
ring, seen from the axis, is its own normal, and the half that points
towards the viewer is drawn bright, the half behind the cloud faint. Both
frames are projected with the matrix of the pixels and drawn after
`putImageData`, as lines over the points.

## The whole source

The figure lives in
[docs/examples/pixelSpace.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/pixelSpace.ts)
in the repository, the canvas, the controls and the loop it shares with the
[point cloud](/examples/point-cloud) in
[docs/examples/canvasFigure.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/canvasFigure.ts).
The figure, ready to copy:

<<< @/examples/pixelSpace.ts

The painting is
[*The Starry Night*](https://commons.wikimedia.org/wiki/File:Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg)
by Vincent van Gogh (1889), in the public domain, from Wikimedia Commons.
