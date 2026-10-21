---
title: Mesh inspector
---

# Mesh inspector

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { mountMeshInspector } from './meshInspector';

const host = ref(null);
let dispose;

onMounted(() => {
    if (host.value) dispose = mountMeshInspector(host.value);
});

onBeforeUnmount(() => {
    if (dispose) dispose();
});
</script>

<div ref="host" class="mesh-inspector"></div>

**Drag the figure** to rotate it and **click a face** to inspect it, or type
its number. The checkboxes show and hide the faces, the edges, the normals
and the back faces. The button resets them and clears the selection.

## A vase of triangles

The vase is a profile turned around the y axis: a list of rings from the
foot to the lip, each a height and a radius. Between two rings every quad
becomes two triangles, and the foot is a fan around its centre. The top is
left open, so the inside of the vase shows:

```ts
const a = ring(PROFILE[k], j);
const b = ring(PROFILE[k], j + 1);
const c = ring(PROFILE[k + 1], j + 1);
const d = ring(PROFILE[k + 1], j);
triangles.push([a, d, c], [a, c, b]);
```

The order of the three points is the point of it: every triangle runs
counter-clockwise when it is seen from outside the vase.

## Front or back

[`triangles3D`](/api/#shapes) hands back every triangle with a `ccw` flag:
whether its points run counter-clockwise on the screen after the rotation.
A triangle that is counter-clockwise from outside is clockwise from inside,
so with every triangle wound the same way, `ccw` tells a face that looks at
the camera from one that looks away. Uncheck **back faces** and the figure
hides the faces that look away, without taking them out of the data:

```ts
.attr('visibility', (d) => (isShown(d) ? null : 'hidden'))
```

The vase is open, so its inside is all back faces: you look at the faces of
the far wall from behind. With the back faces hidden, the inside of the vase
is gone. The blue faces are the outside, the orange ones the inside.

The flag is the sign of one number. The normal of a face, turned with the
mesh, points at the viewer exactly when `ccw` is true. Its z is the cosine
between the normal and the line of sight, so it also shades the face, from
dark when it is seen edge-on to light when it is seen head-on:

```ts
.style('fill', (d) =>
    !faces.checked ? 'none' : (d.ccw ? OUTSIDE : INSIDE)(Math.abs(d.nz))
)
```

The inspector shows both for the selected face, and they agree at every
angle.

## Normals with lines3D

A normal is a segment from the centroid of its face, a quarter of a unit
along the face's normal. The normals are computed once in model space and go
through [`lines3D`](/api/#shapes). Both renderers get the same scale and
origin once, and every render turns both by the same angles, so a normal
stays on its face:

```ts
const renderers = [faces3d, normals3d];
for (const renderer of renderers) {
    renderer.rotateY(yaw + START_YAW).rotateX(-pitch - START_TILT);
}
```

## One painter's list

Hiding the back faces is not enough to draw the vase. Its neck is narrower
than its belly and its lip, so faces that all look at the camera still
cover each other. The faces and the normals go into one group, and the
[`sort`](/api/#utility-functions) utility orders both by the depth of their
centroid. It only reads `centroid.z`, which `triangles3D` and `lines3D` both
set:

```ts
group.selectAll('path, line').sort(sort);
```

A normal is painted after the faces behind it and before the faces in front
of it. A normal that points away from the camera ends up under its own face,
and a normal of the far wall disappears behind the near wall.

## Picking a face

`data` returns new arrays, so the index of every triangle is stamped on
after the projection and is the key of the join:

```ts
.map((d, i) => Object.assign(d, { id: i, nz: normal(d.map((p) => p.rotated)).z }))
```

A click reads the face under the pointer from the datum of its path. The
faces take `pointer-events="visible"`, so with the faces unchecked the
wireframe can still be clicked, while a hidden back face cannot. The normals
take no pointer events, so a click goes through them to the face. The drag
swallows the click that ends it, so turning the vase never selects a face.

The number field selects without a pointer. A face selected there can be a
hidden back face; the inspector says so.

## No stylesheet

The figure brings its own styles, so the module is all there is to copy.
The colors are `light-dark()` pairs set with `style`, as in the
[floor-plan explorer](/examples/floor-plan#no-stylesheet).

## The whole source

The figure lives in
[docs/examples/meshInspector.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/meshInspector.ts)
in the repository, the SVG and the drag in
[docs/examples/rotatingFigure.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/rotatingFigure.ts)
and the ends of the normals in
[docs/examples/segments.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/segments.ts).
The figure, ready to copy:

<<< @/examples/meshInspector.ts
