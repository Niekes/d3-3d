---
title: Depth-ordering lab
---

# Depth-ordering lab

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { mountDepthOrdering } from './depthOrdering';

const host = ref(null);
let dispose;

onMounted(() => {
    if (host.value) dispose = mountDepthOrdering(host.value);
});

onBeforeUnmount(() => {
    if (dispose) dispose();
});
</script>

<div ref="host"></div>

**Pick a scene and an order** under the figure. The faces are painted back
to front in that order. Where a pair is painted the wrong way round, its
overlap is outlined in red. Where a pair crosses, its overlap is hatched in
amber. **Drag the figure** to rotate it, and flick it to let it spin out.
With the figure focused, the arrow keys turn it, the keys <kbd>1</kbd> to
<kbd>5</kbd> pick an order, <kbd>[</kbd> and <kbd>]</kbd> pick a scene,
<kbd>O</kbd> writes the paint order on the faces, <kbd>P</kbd> switches the
projection and <kbd>R</kbd> resets the view.

Each scene starts from a view where it breaks the order it names. Turn it
and the failure can come and go, because which faces overlap depends on the
view. The button brings the starting view back.

## One number per face

`sort` compares the depth of two centroids, and `centroid()` is the mean of
the rotated vertices of a face. That is one number per face. The other
simple orders compare one number too, just a different one:

```ts
const COMPARE = {
    data: () => 0, // a stable sort keeps the data order
    centroid: sort,
    farthest: (a, b) => a.far - b.far, // the rotated z of the farthest corner
    nearest: (a, b) => a.near - b.near // the rotated z of the nearest corner
};
```

A face that spans a range of depths does not fit in one number. The wall of
the first scene runs through the whole depth of the scene, so its centroid
sits in the middle, nearer than every face of the cube. The cube stands in
front of the far end of the wall, but the centroid order paints the wall
last and buries the cube under it.

The farthest corner gets that scene right, since the wall reaches farther
back than the cube, and fails on the next one. The ramp reaches far back,
so it is painted first, and the tile under its near end is painted over
it. The nearest corner gets the ramp right and buries the cube again. Every
one of these numbers is right for some scene and wrong for another. The
data order is right only where the data happens to list the faces back to
front.

## Near is a larger z

The rotated depth grows towards the viewer.
[`.viewDirection()`](/api/#viewdirection) is the unit vector from the scene
towards the viewer, and the rotated z of a point `p` is
`dot(viewDirection, p − center) + center.z`. So an ascending `sort` paints
the far faces first, and the [area chart](./area-chart) relies on it. The
lab checks the sign itself: in the first scene the cube wins every pair it
forms with the wall, and turned half way round the wall wins every pair.

In perspective the eye sits on the rotated z axis, at
`rotationCenter + perspective · viewDirection`. The rotated z is still the
depth along the line of sight, and the same sort applies, as the
[perspective street](./perspective-street) explains. Switch to perspective
and the four simple orders paint the faces in the same sequence as before.

What changes is the overlaps. Faces near the eye grow and faces far from it
shrink, so a scene can fail in one projection and not in the other. In the
first scene the far end of the wall shrinks more than the cube in front of
it, and the right face of the cube slides off the end of the wall. The
centroid order still buries the cube, but it now paints two pairs wrong,
not three. The eye sits four times as far from the pivot as the farthest
corner of any scene, so every face stays well in front of it.

## Asking the pixel

The lab needs a ground truth to judge the orders by, and it asks the
screen. Two faces that overlap on the screen are clipped against each other,
which is a few lines for convex polygons, and a pair whose overlap covers
less than a square pixel is skipped. The samples are the centroid of the
overlap and its corners, pulled a fifth of the way towards the centroid.

At every sample, [`.unproject()`](/api/#unproject) finds the point of each
face's plane under the screen point. The plane runs through a corner of
the face, with the normal from `normal()`. The hit with the larger dot
product with the view direction is the nearer one:

```ts
const v = camera.viewDirection();
const depth = (face, x, y) => {
    const hit = camera.unproject({ x, y }, face.corner, face.normal);
    return hit && hit.x * v.x + hit.y * v.y + hit.z * v.z;
};
```

Both hits lie on one ray: along the view direction in an orthographic view,
from the eye in perspective, where `.unproject()` casts its rays from the
eye. The dot product grows along such a ray towards the viewer, so the test
holds in both projections. A plane seen edge-on has no hit, and its sample
is skipped.

If every sample puts the same face in front, that face covers the other.
If the samples disagree, the pair crosses. A pair is wrong when an order
paints the covered face after the one that covers it. The test uses no
order at all, so it judges all five fairly. A handful of samples can miss
a thin sliver where two faces cross; a grid of samples would catch it at a
few times the cost.

## Cycles and crossings

**By overlap** builds its order from the winners of the pair tests: every
face is painted after every face it covers. That is Newell's ordering
without the split. A depth-first search does it, Tarjan's, and it finds the
cycles on the way. It gets the first two scenes right, and it is right
exactly where an order of whole faces exists. That takes two things:

- **No cycle.** In the three sticks, each stick lies over the next and under
  the previous one. Stick A covers B, B covers C and C covers A, and every
  order of the three paints at least one pair wrong. The lab keeps the
  centroid order for the faces of a cycle and names the cycle in the
  readout.
- **No crossing.** The crossing planes cut through each other, and each is
  in front for half of the overlap. Such a pair has no winner, so it adds
  nothing to the order, and whichever face is painted last is wrong for
  half of the overlap.

Past that, no order of whole faces is right, whatever number it compares.
The faces have to be split along the line where they cross or along a
plane that cuts the cycle, or a depth buffer has to decide per pixel, as
WebGL does in the [bar field](./bar-field). The
[area chart](./area-chart) shows the other way out: geometry built so that
planes separate it, which gives an exact order without a test per pair.

## The whole source

The figure and its styles live in
[docs/examples/depthOrdering.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/depthOrdering.ts)
in the repository: the figure adds the styles and its class to the element
it mounts into, so it needs no stylesheet. The SVG and the drag live in
[docs/examples/rotatingFigure.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/rotatingFigure.ts).
The figure, ready to copy:

<<< @/examples/depthOrdering.ts
