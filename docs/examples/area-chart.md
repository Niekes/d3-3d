---
title: Area chart
---

# Area chart

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { mountAreaChart } from './areaChart';

const host = ref(null);
let dispose;

onMounted(() => {
    if (host.value) dispose = mountAreaChart(host.value);
});

onBeforeUnmount(() => {
    if (dispose) dispose();
});
</script>

<div ref="host" class="area-chart"></div>

**Drag the figure** to rotate it. The button samples new share prices for two
fictional companies from 2006 to 2025, and the ribbons morph into them. Each
series is drawn as its area pushed back into a ribbon. The ends of the ribbons are hatched, diagonal lines
for one company and diagonal bricks for the other, so the two stay apart
without color.

## A ribbon is few faces

A ribbon is a closed solid: the area under the line, extruded along `z`. It
takes five faces from its bounding box and one quad per segment of the line:

| Face                   | Count                  | Plane            |
| ---------------------- | ---------------------- | ---------------- |
| front, back            | one polygon each       | `z = const`      |
| left, right            | one quad each          | `x = const`      |
| bottom                 | one quad               | `y = 0`          |
| top                    | one quad per segment   | slanted          |

The front and the back are one polygon each, however many points the line
has. `polygons3D` projects them all and hands every face back with its `ccw`
flag. Each face is wound counter-clockwise as seen from outside, so `ccw`
tells whether it faces the camera, and only those faces are drawn. The solid
is closed and opaque, so a face that looks away is always hidden behind one
that looks forward. Twenty years make 24 faces per ribbon, of which at most
22 are drawn.

## Why the centroid sort fails

The `sort` utility orders by the depth of a centroid, the average of the
vertices. For a ribbon that fails twice:

- The front is one large, concave polygon. Its centroid sits somewhere in
  the middle of the ribbon, so a quad of the top near one end can sort in
  front of it or behind it, whatever the camera does.
- The quads of the top sit at different heights. Once the camera tilts, the
  height adds to the depth of a centroid, and the quad on a peak sorts
  behind the valley that it hides.

## Separating planes

The order does not come from a heuristic but from the planes that separate
the pieces. If a plane separates two convex pieces, the piece on the far side
of the plane from the camera is painted first, and it can never cover the
other.

- **Between the ribbons.** The ribbons sit in their own slices of `z`, so
  the planes `z = const` separate them. The floors of all ribbons span the
  same `x` and sit at `y = 0`, so the centres of the floors differ only
  along `z`. Sorting the ribbons by the centre of their floor with `sort` is
  therefore exact.
- **Along the top.** Every segment of a ribbon is a convex slab, and the
  planes `x = const` separate the slabs. The top is painted in the order of
  the data, or reversed when `+x` points away from the camera. The rotation
  is linear, so two corners of the floor tell which way `+x` points:

  ```ts
  const sx = Math.sign(bottom[3].rotated.z - bottom[0].rotated.z);
  top.sort((a, b) => sx * (a.index - b.index));
  ```

- **The bounding box last.** The front, the back, the two ends and the
  bottom lie on the bounding box of the ribbon, and the ribbon lies wholly
  behind each of them. Nothing of the ribbon can cover them, and two of them
  never overlap, so they are painted after the top, in any order.

Each ribbon is a group with two groups inside, the top and the box faces,
in that order:

```ts
group.selectAll('g.series').sort(sort); // the ribbons, by the centre of their floor
```

The walls of the chart box come first, as in the [bar chart](./bar-chart):
the ribbons lie inside the box, so the walls that face away are behind all
of them.

## The hatch lies on the face

The hatch is an SVG `<pattern>`. Its tile is drawn level and the pattern is
then laid on the face: `iso3D().plane()` returns the affine frame of a plane,
the transform that carries its local coordinates onto the screen. That frame
becomes the `patternTransform` of the hatch, with a turn of 45° in the plane:

```ts
const { matrix } = plane.plane({
    origin: { x: 0, y: 0, z: hatchedEnd },
    u: { x: 1, y: 0, z: 0 },
    v: { x: 0, y: 1, z: 0 }
});

pattern.attr('patternTransform', `${matrix} rotate(45)`);
```

The hatch turns and foreshortens with the ribbon instead of sliding across
it. The frame is taken at the end of the ribbon that faces the camera, the
front or the back.

## Tween the prices, not the paths

The [bar chart](./bar-chart) tweens the `d` attribute of every face. A
ribbon cannot do that: while it morphs, a slope of the top can turn away
from the camera or towards it, so the set of drawn faces changes, and the
order of the top can flip with it. A tween between two old paths would draw
the wrong faces in the wrong order.

So the transition tweens the data instead. Every frame interpolates the
prices and runs the whole projection again: the faces, the culling and the
order. Every frame of the morph is therefore painted as exactly as a still
picture:

```ts
figure
    .transition()
    .duration(1000)
    .tween('prices', () => {
        const prices = interpolate(values, next);
        return (t) => {
            values = prices(t);
            draw();
        };
    });
```

A click during a running transition interrupts it, and the new one starts
from the prices where the old one stopped. The drag keeps working while the
ribbons morph, because it draws from the same `values`.

## The whole source

The figure lives in
[docs/examples/areaChart.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/areaChart.ts)
in the repository. The chart box and its axes are drawn by the helpers in
[docs/examples/axisEdges.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/axisEdges.ts),
and the drag and the button come from
[docs/examples/rotatingFigure.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/rotatingFigure.ts).
The complete file, ready to copy:

<<< @/examples/areaChart.ts
