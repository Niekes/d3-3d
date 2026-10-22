---
title: Perspective street
---

# Perspective street

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { mountPerspectiveStreet } from './perspectiveStreet';

const host = ref(null);
let dispose;

onMounted(() => {
    if (host.value) dispose = mountPerspectiveStreet(host.value);
});

onBeforeUnmount(() => {
    if (dispose) dispose();
});
</script>

<div ref="host" class="perspective-street"></div>

**Drag the street** to look at it from another side, and **point at the
street** to find the tile under the pointer. The slider moves the eye, from
twelve units in front of the rotation center to infinitely far away at its
right end, and **dolly out** and **dolly in** glide it to either end. Point
above the horizon to see the ray miss the floor. The toggles switch the
renderer, SVG, a 2D canvas or WebGL, and the test that hides the faces.

All three renderers hang on one `camera3D`. Every frame draws the same
street from the same camera, so switching shows the same picture.

## One number moves the eye

```ts
const camera = camera3D().scale(44).origin({ x: 480, y: 290 }).perspective(20);
```

`.perspective(distance)` puts an eye `distance` model units in front of the
rotation center, on the axis that points at the reader. A rotated point is
scaled around the center by `distance / (distance − (z − center.z))`: by 1
in the plane of the center, by more in front of it and by less behind it.
The default, `Infinity`, scales everything by 1: the orthographic
projection.

The plane of the center keeps the `scale`, so the dolly zoom needs no code
of its own. It moves the eye evenly in 1 / distance, and the middle of the
street keeps its size while the near end swells and the far end shrinks
into the vanishing point, or the other way round on the way out. A film camera has to drive towards the scene and
zoom out at the same time for this effect.

## SVG sorts as always

```ts
const houses = cubes.data(HOUSES).map((cube) =>
    Object.assign(cube, {
        centroid: cube.faces.find((face) => face.face === 'bottom').centroid
    })
);

houseGroup
    .selectAll('g.house')
    .data(houses, (d) => d[0].house)
    .join('g')
    .sort(sort);
```

The eye sits on the rotated z axis, so the rotated z is still the depth
along the line of sight, and `sort` paints the far houses first, as in an
orthographic view. The houses stand on one floor and sort by the centroid
of their bottom face, as the [mini city](./mini-city) does: the centre of a
tall house sits high up and would paint over a short house in front of it.

A projective map keeps straight lines straight, so every face is still a
polygon and the paths are exact.

## Faces that only the perspective shows

Look straight down the street and the walls that face it are edge-on in an
orthographic view: they run along the view direction. In perspective the
eye sits between the rows, and it sees the wall of every house that faces
the street.

`ccw` tells them apart, because it reads the winding of the `projected`
points: a face whose corners run counter-clockwise on the screen faces the
eye. Switch the toggle to **viewDirection** to see the orthographic test
instead:

```ts
const facesTheCamera = dot(normal(face), camera.viewDirection()) > 0;
```

It asks whether the face turns towards a direction, but in perspective it
has to turn towards a point, the eye at
`rotationCenter + perspective · viewDirection`. The walls along the street
vanish, a few walls that turn away are drawn, and the readout counts both.
At the right end of the slider the two tests agree again.

## The pointer casts a ray from the eye

```ts
const hit = camera.unproject(pointer, { x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 });
```

`unproject` maps a screen point back onto a plane, here the floor. In an
orthographic view the ray runs along the view direction; in perspective it
starts at the eye and runs through the screen point. Above the horizon that
ray climbs away from the floor and meets the plane only behind the eye, and
`unproject` returns `null` there. The tile and the dot are drawn on an SVG
over every renderer, so the picking works the same on the canvas and with
WebGL.

## Text at a rotated point

```ts
const roof = house.faces.find((face) => face.face === 'top');
const at = perspective(roof.centroid, view);
const growth = 1 / (1 - (roof.centroid.z - center.z) / distance);

text.attr('x', at.x)
    .attr('y', at.y)
    .attr('font-size', 13 * growth);
```

The house numbers sit on the roofs. `perspective(point, options)` is the
projection itself: it maps the rotated centroid of the roof to the screen,
as `orthographic` does in the [bar chart](./bar-chart). A text or a circle
keeps its size on the screen, so the growth of the roof scales the font
too. The dot under the pointer shrinks the same way. The numbers are SVG
text; the canvas and WebGL draw only the houses.

## Canvas: the matrix and a division by w

```ts
projectPositions(POSITIONS, camera.matrix(), screen);
```

The canvas keeps every corner of the street in one `Float32Array` and
projects it with one call per frame. In perspective the matrix has a w, and
`projectPositions` divides x and y by it. The depth stays the rotated z, so
the houses sort by the depth of their footprints as in SVG, and a face is
filled where its corners wind counter-clockwise on the screen, the sum
`ccw` takes.

## WebGL: the GPU divides

```ts
gl.uniformMatrix4fv(location, false, camera.matrix({ width: 960, height: 500, depth: 10 }));
gl.enable(gl.DEPTH_TEST);
```

Given the size of the canvas and the radius of the scene, the matrix maps
to clip space, and the GPU does the rest: it divides by w, interpolates in
perspective and keeps the nearest face at every pixel. WebGL needs no sort
and no face test, so the toggle is off.

## Where it ends

SVG and a 2D canvas cannot clip a polygon that reaches behind the eye, and
a point there has no place on the screen. The scene has to lie in front of
the eye: the street fits in a ball of radius 10 around the rotation center,
and the slider stops at 12. The `depth` of the WebGL matrix is that radius,
and it has to be less than the distance of the eye too.

`iso3D` stays orthographic whatever the camera says. An isometric view is
orthographic by definition, and the SVG matrix of a face is affine, which
the image of a plane in perspective is not.

## The whole source

The figure lives in
[docs/examples/perspectiveStreet.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/perspectiveStreet.ts)
and its styles in
[docs/examples/perspectiveStreet.css](https://github.com/niekes/d3-3d/blob/master/docs/examples/perspectiveStreet.css).
It borrows `linkProgram` and `attribute` from the canvas figures and the
drag from the rotating figures of these examples.
