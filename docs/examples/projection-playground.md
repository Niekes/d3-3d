---
title: Projection playground
aside: false
---

# Projection playground

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { mountProjectionPlayground } from './projectionPlayground';

const host = ref(null);
let dispose;

onMounted(() => {
    if (host.value) dispose = mountProjectionPlayground(host.value);
});

onBeforeUnmount(() => {
    if (dispose) dispose();
});
</script>

<div ref="host"></div>

**Move a slider** or **pick a preset** and the cube, the renderer call and
the vertex table all change together. The sliders set the rotation, the
scale, the origin and the rotation center of the renderer. The code shows
the call those settings make, and the lines the last change touched are
marked. **Hover a row** of the table to find its vertex in the figure. The
reset button puts every slider back.

Every renderer of d3-3d shares these settings. The playground hands them to
three renderers at once, `cubes3D` for the cube,
`lines3D` for the model axes and `points3D`
for the rotation center, so the three project into one scene:

```ts
for (const renderer of renderers) {
    renderer
        .rotateX(value('rotateX'))
        .rotateY(value('rotateY'))
        .rotateZ(value('rotateZ'))
        .scale(value('scale'))
        .origin(origin)
        .rotationCenter(center);
}
```

`.data()` runs every point through two steps: a rotation in model space,
then a projection onto the screen.

## Rotation turns around the rotation center

The rotation moves the point so that the rotation center sits at zero,
turns it around z, then around y, then around x, and moves it back:

```ts
export function rotateRzRyRx(point, angles) {
    const rc = angles.rotateCenter;
    const translated = { x: point.x - rc.x, y: point.y - rc.y, z: point.z - rc.z };

    const rz = rotateZ(translated, angles.z);
    const ry = rotateY(rz, angles.y);
    const rx = rotateX(ry, angles.x);

    return { x: rx.x + rc.x, y: rx.y + rc.y, z: rx.z + rc.z };
}
```

The order matters: z, then y, then x is not the same turn as x, then y,
then z. The angles are in radians.

The rotation center is a point in model units, the units of the data. A
rotation leaves it where it is: turn the rotation sliders and the orange
dot stays put while the cube swings around it. With the center at zero it
sits in the middle of the cube and the cube spins in place. Move it out of
the cube and the cube orbits it.

## Scale and origin place it on the screen

The projection is orthographic. It drops z and maps x and y to pixels:

```ts
export function orthographic(d, options) {
    return {
        x: options.origin.x + options.scale * d.x,
        y: options.origin.y + options.scale * d.y
    };
}
```

The scale is the number of pixels per model unit, the origin the pixel
where the model point zero lands. The origin is a screen point, so the
figure draws the crosshair where it is and does not project it. Changing
the origin slides the whole picture without turning it, and the cube grows
and shrinks around the origin with the scale.

The screen y grows downwards, as in SVG, so the y axis of the model points
down until a rotation turns it.

## A transformed point keeps everything

A transformed point is the input point with two fields added: `rotated`,
the point after the rotation, and `projected`, the point on the screen.
The table shows those three, one row per vertex:

```ts
return {
    ...point,
    rotated,
    projected
};
```

The cube draws its faces from `projected`. `rotated.z` is the depth that
survives the projection: the faces carry a `centroid` of their rotated
corners, and the `sort` utility orders them by
its z, back to front.

## Presets are slider values

A preset sets a few sliders and puts the others back to their defaults,
nothing more:

```ts
function applyPreset(preset) {
    for (const slider of sliders) {
        slider.value = String(preset.values[slider.name] ?? slider.defaultValue);
    }
    draw();
}
```

The isometric preset is two rotations: π/4 around y turns an edge of the
cube to the front, then arctan(1/√2) ≈ 0.62 around x tips it until the three
axes are equally short. The pixel art preset takes π/6 for the second
angle instead, so the edges climb one pixel for every two across.

The hinge and the pivot presets move the rotation center onto the cube.
Every rotation turns around an axis through the rotation center, and the
points on that axis stay put. With the center on an edge that runs along
y, `rotateY` swings the cube on that edge. With the center on a corner,
every rotation keeps the corner where it is. These presets also move the
origin, so the hinge lands in the middle of the figure.

## The whole source

The figure lives in
[docs/examples/projectionPlayground.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/projectionPlayground.ts)
in the repository. The file carries its own styles and puts them into the
element it mounts into, so it needs no stylesheet: copy it, change the
import of `../../index` to `d3-3d` and call
`mountProjectionPlayground(element)`.

```ts
const dispose = mountProjectionPlayground(document.querySelector('#playground'));
```

The figure, ready to copy:

<<< @/examples/projectionPlayground.ts
