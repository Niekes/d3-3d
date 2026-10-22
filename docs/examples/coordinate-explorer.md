---
title: Coordinate explorer
---

# Coordinate explorer

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { mountCoordinateExplorer } from './coordinateExplorer';

const host = ref(null);
let dispose;

onMounted(() => {
    if (host.value) dispose = mountCoordinateExplorer(host.value);
});

onBeforeUnmount(() => {
    if (dispose) dispose();
});
</script>

<div ref="host"></div>

**Move the sliders** to place the point, **drag the figure** to turn it
and press **front view** to look at it with every angle at zero. With the
figure focused, the arrow keys turn it by 15° and <kbd>Home</kbd> returns
to the front view. The checkbox reads y as −y.

The axes, the walk, the box, the point and the labels hang on one
`camera3D`: `lines3D` draws the segments and `points3D` the point and the
anchors of the labels.

## Right, down and towards you

Press **front view**. The button sets the yaw and the pitch of the figure
to zero, so every angle of the camera is exactly zero. The rotated point is
then the point the accessors read, and the projection keeps its x and its
y: x runs to the right and y runs down, because the screen y grows
downwards, as in SVG.

The z axis has no length on the screen at all. It points straight at you,
and the projection drops z. Which way it points follows from the view
direction, the direction from the scene towards the viewer:
[`.viewDirection()`](/api/#viewdirection) is the third row of the rotation
matrix, and with every angle at zero that row is 0, 0, 1. The positive z
axis points at the reader.

x to the right, y down and z towards you make a left-handed frame: curl the
fingers of the left hand from x to y, and the thumb points along z. The
textbooks mostly draw a right-handed one, with y up. In the front view the
depth survives only in the rotated z, the number that `sort` orders the
shapes by, back to front.

When an axis points almost at you, one unit of it is shorter than 20 pixels
on the screen, and its tick labels would pile up on the origin. The figure
hides them and keeps the name of the axis: in the front view, +z sits on
the origin, where the z axis points at you.

## A coordinate is a walk

The x, y and z of the point are the lengths of three legs, each parallel to
its axis. The walk leads from the origin along x, then along y, then along
z, and a negative coordinate walks the other way:

```ts
function walkTo(p) {
    const onX = { x: p.x, y: 0, z: 0 };
    const onXY = { x: p.x, y: p.y, z: 0 };
    return [
        segment('x', { x: 0, y: 0, z: 0 }, onX),
        segment('y', onX, onXY),
        segment('z', onXY, p)
    ].filter(hasLength);
}
```

A coordinate of zero has no leg, so the walk leaves it out. Every leg is a
`lines3D` segment in world units, as the axes are, so the walk turns with
the camera and stays parallel to its axes from every side.

The faint box has the origin and the point at opposite corners. Each of
its twelve edges runs along an axis and is as long as one coordinate. The
three edges that end in the point are its drop lines, straight to the
three planes of the axes. In an orthographic view a point far behind the
screen is drawn as large as one in front of it, so its place on the screen
does not tell how deep it lies. The box does: turn the figure a little,
and the edges along z show the depth.

## Four numbers for one point

The table follows the point through `transform`, the step that every
`.data()` runs. It reads the point through the accessors, rotates it and
projects it:

```ts
const startPoint = {
    x: options.x(point),
    y: options.y(point),
    z: options.z(point)
};

const rotated = rotate(m, startPoint, options.rotateCenter);

const projected = perspective(rotated, {
    scale: options.scale,
    origin: options.origin,
    rotateCenter: options.rotateCenter,
    distance: options.perspective ?? Infinity
});
```

The transformed point keeps the data it came from, so the four rows all
come from one datum:

- **data**: the point as the sliders write it.
- **read by the accessors**: the numbers that `.x()`, `.y()` and `.z()`
  hand to the rotation. The accessors are where the frame of the data
  becomes the frame of the library.
- **rotated**: the point after the rotation around the world origin. Its z
  is the depth, towards you.
- **projected**: the pixel on the screen.

The checkbox gives every renderer one accessor that negates y:

```ts
const yDown = (d) => d.y;
const yUp = (d) => -d.y;

for (const renderer of renderers) {
    renderer.y(flipped ? yUp : yDown);
}
```

Now y points up, and x, y and z make a right-handed frame. The library does
not change: the data row stays as it is, and the minus shows up in the read
row. The labels are data too, so the +y label moves to the top with its
axis. The [scatter plot](./scatter-plot) reads its data the same way: its
data z points up, so its accessors negate it into the y of the library:

```ts
renderer
    .camera(camera)
    .x((d) => scales.x(d.x))
    .y((d) => -scales.z(d.z))
    .z((d) => scales.y(d.y));
```

The figure never sets a perspective, so the projection is orthographic. The
projected point is the origin plus the scale times the rotated x and y, and
the projected row writes it out with the numbers of the moment: here
`480 + 60 × rotated x` and `250 + 60 × rotated y`. The rotated z drops out.
The circle is drawn from the same datum, so the table cannot drift from the
figure.

This page holds every other setting still. The
[projection playground](./projection-playground) moves them: the rotation
around three axes, the scale, the origin, the rotation center and the
perspective, for the eight corners of a cube.

## The whole source

The figure and its styles live in
[docs/examples/coordinateExplorer.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/coordinateExplorer.ts)
in the repository: the figure adds the styles and its class to the element
it mounts into, so it needs no stylesheet. The SVG and the drag live in
[docs/examples/rotatingFigure.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/rotatingFigure.ts)
and the placing of the segments in
[docs/examples/segments.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/segments.ts).
The figure, ready to copy:

<<< @/examples/coordinateExplorer.ts
