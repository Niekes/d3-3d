---
title: Rotation order
aside: false
---

# Rotation order

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { mountRotationOrder } from './rotationOrder';

const host = ref(null);
let dispose;

onMounted(() => {
    if (host.value) dispose = mountRotationOrder(host.value);
});

onBeforeUnmount(() => {
    if (dispose) dispose();
});
</script>

<div ref="host"></div>

**Move a slider** and both copies of the block turn by the same angle,
**pick an order** for the right copy or **pick a preset**. **Play** turns
both copies from rest, one axis after the other, each in its own order. The
line under the figures gives the largest distance between matching
vertices of the two copies: zero means the same pose.

Each copy carries its own x, y and z axes, which turn with it. The arrows
in the corner are the world axes, which never move: x points right, y
points down and z points at you. Every face has the color of its name,
front, back, left, right, top or bottom, so the pose reads even in a view
straight from the front.

## Three turns, two results

Turns do not commute. The left copy turns around z, then y, then x, the
right one, at first, around x, then y, then z, and the same three angles
leave them in two different poses.

Quarter turns differ the most. The quarter turns preset turns both copies
90° around x and 90° around y: the left copy ends with its bottom faces
towards you, the right copy with its left faces.

Small angles nearly agree. At 5° on every axis the copies stay within a few
hundredths of a unit of each other, whatever the order. Two turns commute
up to terms of the second order in their angles, and 5° is 0.09 radians,
whose square is less than a hundredth.

## One order is built in

The renderer turns a point around z first, then around y, then around x,
all around world axes through the rotation center. As a matrix, that is
R = Rx · Ry · Rz, read from right to left: the turn next to the point comes
first. [`rotationMatrix`](https://github.com/niekes/d3-3d/blob/master/src/rotation.ts#L14)
builds it once for every `.data()` call.

The right copy turns in any order, through three calls of `transform` with
one angle each:

```ts
function chain(points, order, angles) {
    const [a, b, c] = order;
    const first = transform(
        points,
        turn(a, angles[a], (point) => point)
    );
    const second = transform(
        first,
        turn(b, angles[b], (point) => point.rotated)
    );
    return transform(
        second,
        turn(c, angles[c], (point) => point.rotated)
    );
}
```

`turn` sets one angle and leaves the other two at zero, and a rotation with
two angles at zero is a turn around the third axis alone. Every call turns
around the same rotation center. The first call reads the points, the next
two the `rotated` of the call before: `transform` spreads its input into its
result, so the accessors see the pose of the call before, and the result
replaces it with its own. The renderers of the right copy have every angle
at zero and read `rotated`, so they only project.

The code under each figure shows its turns and its matrix. Pick the
library's order preset, z, y, x on the right: the distance drops to zero,
and the two copies paint every face in the same order. The renderer does
nothing more than these three turns.

## Fixed axes and own axes

Turning around z, then around the world y, then around the world x is the
same as turning around the copy's own x, then its own y, then its own z.
Both read the same matrix, one from the right and one from the left.

In the library's order the x turn comes last, around the world axis: the
x slider always tips the copy towards you around the horizontal axis of
the screen, however the copy is turned. The z turn comes first, and the z
slider spins the copy around its own z axis, wherever that axis points.

Every rotating figure of these examples feels like a turntable for the same
reason. `turnCamera` sets the yaw with `rotateY` and the tilt with
`rotateX`, so the tilt comes last, around the horizontal axis of the
screen, and the yaw turns the scene around its own vertical axis.

The gimbal lock preset sets y to 90°. The copy's own z axis then lies on
the world x axis, and the x and the z sliders turn the left copy the same
way: x 30° with z 0° is the same pose as x 0° with z 30°. Three sliders
are left with two ways to turn the copy.

The [projection playground](/examples/projection-playground) shows the
rest of what a renderer does with a point: the scale, the origin, the
rotation center and the perspective.

## The whole source

The figure lives in
[docs/examples/rotationOrder.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/rotationOrder.ts)
in the repository, the face join in
[docs/examples/cubeFaces.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/cubeFaces.ts)
and the axis segments in
[docs/examples/segments.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/segments.ts).
The file carries its own styles and puts them into the element it mounts
into, so it needs no stylesheet: copy it with the two helpers, change the
import of `../../index` to `d3-3d` and call `mountRotationOrder(element)`.

```ts
const dispose = mountRotationOrder(document.querySelector('#rotation-order'));
```

The figure, ready to copy:

<<< @/examples/rotationOrder.ts
