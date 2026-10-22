---
title: Rotation pivot
---

# Rotation pivot

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { mountRotationPivot } from './rotationPivot';

const host = ref(null);
let dispose;

onMounted(() => {
    if (host.value) dispose = mountRotationPivot(host.value);
});

onBeforeUnmount(() => {
    if (dispose) dispose();
});
</script>

<div ref="host"></div>

**Press play** and the scene spins around the orange pivot. **Drag the
pivot** across the floor, or set it with the sliders, and **click a corner**
of the box to show or hide its orbit. The readout names the pivot and the
radius of the orbit toggled last.

With the pointer:

| Input               | Does                                                                     |
| ------------------- | ------------------------------------------------------------------------ |
| Drag the pivot      | Moves it across the floor at its height                                  |
| Click a corner      | Shows or hides its orbit                                                 |
| Drag the background | Rotates the scene; a flick lets it spin out                              |
| The button          | Spins the scene around the pivot, or with reduced motion turns it by 30° |

With the figure focused, after a click on it or with <kbd>Tab</kbd>:

| Key                                         | Does                                    |
| ------------------------------------------- | --------------------------------------- |
| Arrow keys                                  | Move the pivot across the floor         |
| <kbd>Page Up</kbd> and <kbd>Page Down</kbd> | Move it up and down                     |
| <kbd>Home</kbd>                             | Puts it back at the world origin        |
| <kbd>[</kbd> and <kbd>]</kbd>               | Pick the previous and the next corner   |
| <kbd>Enter</kbd>                            | Shows or hides the orbit of that corner |

## The point a turn leaves alone

The floor, the box, the orbits and the marks hang on one `camera3D`, and the
rotation center of that camera is the pivot. Every render turns the camera
and hands it the pivot:

```ts
turnCamera(camera, dragYaw + spinYaw, dragPitch, FLOOR_TURN);
camera.rotationCenter(pivot);
```

The rotation moves a point so that the center sits at zero, turns it, and
moves it back:

```ts
export function rotate(m, point, center) {
    const x = point.x - center.x;
    const y = point.y - center.y;
    const z = point.z - center.z;

    return {
        x: m[0] * x + m[1] * y + m[2] * z + center.x,
        y: m[3] * x + m[4] * y + m[5] * z + center.y,
        z: m[6] * x + m[7] * y + m[8] * z + center.z
    };
}
```

For the center itself, x, y and z are zero, and the rotation hands the
center back unchanged, whatever the matrix. So the pivot stands still on
the screen while the scene spins around it. So does every point straight
above or below it. Press the right arrow twice and the up arrow twice, and
the pivot sits under a bottom corner of the box: that corner and the top
corner above it keep their place through the whole spin. The top one turns
into a ring, and the bottom one hides under the pivot.

The [projection playground](./projection-playground) shows the same with a
single cube: its edge hinge and corner pivot presets put the rotation
center on the cube, and its orbit preset puts it behind the cube.

## Orbits are circles in the world

The figure never sets `rotateZ`, so its rotation is a tilt applied after a
yaw. Write θ for the angle around y, the yaw, and α for the angle around x,
which `turnCamera` sets from the tilt.
[`rotationMatrix`](https://github.com/niekes/d3-3d/blob/master/src/rotation.ts)
builds `R = Rx(α) · Ry(θ) · Rz(0)`, so it turns a point around y first and
around x after that.

Take a corner p and the pivot c. At the yaw θ, the rotation takes the corner
to `Rx(α) · Ry(θ) (p − c) + c`. A world point w drawn at another yaw θ0
lands in the same place on the screen when

```
w − c = Ry(θ − θ0) (p − c)
```

because `Rx(α) · Ry(θ0) · Ry(θ − θ0) = Rx(α) · Ry(θ)`. Over a full turn
these points make up the circle around the vertical line through c, through
the corner and at its height, whatever θ0 is. Its radius is the distance of
the corner from that line, `√((p.x − c.x)² + (p.z − c.z)²)`.

That circle is the orbit, a world shape like the floor: 64 points through
`lineStrips3D`, turned by the camera with everything else.

```ts
function orbitOf(corner: Point3D, pivot: Point3D): Point3D[] {
    const r = radiusOf(corner, pivot);
    return range(ORBIT_STEPS + 1).map((i) => {
        const angle = (2 * Math.PI * i) / ORBIT_STEPS;
        return { x: pivot.x + r * Math.cos(angle), y: corner.y, z: pivot.z + r * Math.sin(angle) };
    });
}
```

A spin changes only θ, and a turn around the line maps the circle onto
itself. So the orbits stand still on the screen while the scene spins, and
the corners slide along them. A corner on the line has a radius of zero; it
gets no loop, and its dot is marked as fixed.

The tilt has orbits too, around the horizontal axis across the screen
through the pivot. That axis turns with the yaw, so its circles are not
fixed in the world, and the figure leaves them out. A `rotateZ` other than
zero would turn every point around z before the yaw and break the formula.

## Moving the pivot without a jump

The projection is orthographic. A point p lands at the origin plus the
scale times the x and y of `R(p − c) + c`. Moving the center c by Δ moves
every point on the screen by the scale times the x and y of `(I − R) Δ`,
and that shift has no p in it: it is the same for every point.

So the figure measures it on one point, the world origin, and takes it back
out of the origin of the camera:

```ts
function movePivot(to: Point3D): void {
    const [before] = marks.data([ORIGIN]);
    pivot = {
        x: clamp(to.x, -HALF, HALF),
        y: clamp(to.y, -TOP, 0),
        z: clamp(to.z, -HALF, HALF)
    };
    camera.rotationCenter(pivot);
    const [after] = marks.data([ORIGIN]);
    const origin = camera.origin();
    camera.origin({
        x: origin.x - (after.projected.x - before.projected.x),
        y: origin.y - (after.projected.y - before.projected.y)
    });
    render();
}
```

The pivot moves, and the picture does not. Only the axis and the orbits
follow the pivot at once, because they are built around it. The rest shows
the move at the next turn, which runs around the new pivot. The drag, the
sliders and the keys all go through this function.

The drag on the pivot unprojects the pointer onto the horizontal plane
through it, with the normal `{ x: 0, y: 1, z: 0 }`, and keeps the grab
offset, as the [spline editor](./spline-editor) does. The picture stays
still while the pivot follows the pointer, so the floor under the pointer
never slides away. A plane seen edge-on makes `unproject` return `null`,
and the pivot then keeps its last position.

The other figures on a floor, such as the spline editor and the
[voxel builder](./voxel-builder), go the other way. Their `pose` sets the
origin so that the pivot lands in the middle of the view box:

```ts
camera
    .scale(scale)
    .origin({ x: 480 - center.x * scale, y: 250 - center.y * scale })
    .rotationCenter(center);
```

Their pivot never moves, so the jump never shows. Moved through `pose`, a
pivot would jump to the middle of the view box and drag the whole picture
along.

## The pivot carries the eye

`.perspective(distance)` puts the eye `distance` in front of the rotation
center, at `center + distance · viewDirection`. Moving the pivot moves the
eye, and a rotated point is scaled around the center by
`distance / (distance − (z − center.z))`, which depends on its depth. The
shift is no longer the same for every point: at a distance of 12, a move of
the pivot two units along x shifts two opposite corners of this floor by
amounts about 30 pixels apart, and no shift of the origin undoes that. So
this figure stays orthographic. The
[perspective street](./perspective-street) is about the eye.

## The whole source

The figure and its styles live in
[docs/examples/rotationPivot.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/rotationPivot.ts)
in the repository: the figure adds the styles and its class to the element
it mounts into, so it needs no stylesheet. The SVG, the drag, the button and
`turnCamera` live in
[docs/examples/rotatingFigure.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/rotatingFigure.ts),
the start, the tilt limits, the keys and the floor in
[docs/examples/floorView.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/floorView.ts),
the handles of the corners and the pivot in
[docs/examples/handles.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/handles.ts),
the faces of the box in
[docs/examples/cubeFaces.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/cubeFaces.ts)
and the axis line in
[docs/examples/segments.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/segments.ts).
The figure, ready to copy:

<<< @/examples/rotationPivot.ts
