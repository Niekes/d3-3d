---
title: Mini city
---

# Mini city

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { mountMiniCity } from './miniCity';

const host = ref(null);
let dispose;

onMounted(() => {
    if (host.value) dispose = mountMiniCity(host.value);
});

onBeforeUnmount(() => {
    if (dispose) dispose();
});
</script>

<div ref="host" class="mini-city"></div>

**Drag the city** to rotate it, **move the slider** to move the sun and
**click a building** to see its stats. With the figure focused, the arrow
keys walk the selection from lot to lot and <kbd>Esc</kbd> clears it.

## A city is a grid of lots

The city is four streets of four lots, written down as one letter per lot: a
house, an office or a tower. The towers sit in the middle and make a
downtown:

```ts
const LAYOUT = ['hoho', 'otth', 'htto', 'ohoh'];
```

The stats are random but seeded. `randomLcg` gives the same numbers on every
load, so the city and its stats never change:

```ts
const int = randomInt.source(randomLcg(7));

const floors = int(...kind.floors)();
```

## Eight vertices, any hexahedron

There is no roof shape in d3-3d, and none is needed. `cubes3D` joins eight
vertices into six named faces, and nothing says the faces have to be
squares. Every piece of a building is one such hexahedron. Its base is
`w × d` and its top `topW × topD`:

```ts
// A box: the top is the base.
piece('body', 0, h, s, s);
// A tapered shaft: the top is smaller.
piece('body', 0, h, s, s, 0.8 * s, 0.8 * s);
// A gable roof: the top has no depth, so it is a ridge.
piece('roof', h, h + ROOF, eave, eave, eave, 0);
// A spire: the top has no size, so it is an apex.
piece('spire', h, h + SPIRE, 0.4 * s, 0.4 * s, 0, 0);
```

`piece` hands its sizes to `box`, whose `topWidth` and `topDepth` size the
top apart from the base, so the vertices come in the order `cubes3D`
expects, the same as for a [cube](/examples/exploded-cubes), so every face keeps its winding, and `ccw`
still tells the faces that face the camera from those that turn away. A
gable roof has a front and a back slope, its left and right faces are the
gables, and its top has collapsed into the ridge. A face without area is
not counter-clockwise, so the top of a roof hides itself, with the same line
that hides the back faces:

```ts
.attr('visibility', (d) => (d.ccw ? null : 'hidden'))
```

A house is a box under a roof, an office a box with a set-back top storey and
a tower a tapered shaft under a spire. The pieces of a building stack from
the bottom up, so drawing them in order is enough.

## Sort by the lot, not the centroid

The buildings are painted back to front with `sort`, by the depth of their
centre. Which centre matters. The centroid of a tall tower sits high up, and
seen from above, high up is near the camera: sorted by its centroid, a tower
paints over a house in front of it. The centre of the lot does not move
with the height, so the bottom face of the first piece gives it:

```ts
centroid: pieces[0].faces!.find((f) => f.face === 'bottom')!.centroid;
```

The lots are equal squares on a grid and never overlap, so seen from above,
the depth of their centres orders the buildings on them exactly.

Seen from above is the catch. The ground is painted first, and the pieces of
a building from the bottom up, and both are right only while the camera looks
down on the city. Seen from below, the ground would cover everything, and the
underside of a crown or a spire would paint over the body nearer to the
camera. So the drag keeps the camera between 10° and 85° above the ground:

```ts
turnCamera(camera, yaw, pitch, {
    yaw: START_YAW,
    tilt: START_TILT,
    minTilt: Math.PI / 18,
    maxTilt: (17 * Math.PI) / 36
});
```

## Inspecting a building

Every vertex carries its building through the projection. The face under the
pointer is the event target, and its first vertex knows the building, so no
lookup table is needed:

```ts
svg.on('click', (event) => {
    const building = event.target.matches('.face')
        ? select(event.target).datum()[0].building
        : undefined;
    inspect(building === selected ? undefined : building);
});
```

A second click on the selected building clears the selection, and so does a
click on the street. `d3.drag` swallows the click that ends a drag, so
turning the city never selects a building.

## The sun crosses the sky

The time of day is one number, and the sun is a direction computed from it.
The sun rises low, climbs to 60° at noon and sinks again, and it never
drops below 10°, so the shadows stay finite:

```ts
function sunAt(hour) {
    const t = (hour - DAWN) / (DUSK - DAWN);
    const elevation = LOW_SUN + (HIGH_SUN - LOW_SUN) * Math.sin(Math.PI * t);
    const azimuth = START_YAW + Math.PI / 4 + Math.PI * t;
    return {
        x: Math.cos(elevation) * Math.cos(azimuth),
        y: -Math.sin(elevation),
        z: Math.cos(elevation) * Math.sin(azimuth)
    };
}
```

The sun lives in the model, like the buildings, so turning the city turns
the sun with it: the shadows stay where they fall. The slider writes the
hour and renders, nothing else.

## Light from the angle to the sun

A face is as bright as it faces the sun: the cosine between its normal and
the way to the sun, never darker than an ambient floor. The normal comes
from [`normal`](/api/#normal), Newell's formula, which sums over every edge,
so the doubled vertex of a gable or a spire does no harm. It points out of
every face of `cubes3D`:

```ts
function facing(face, sun) {
    const n = normal(face);
    return n.x * sun.x + n.y * sun.y + n.z * sun.z;
}
```

The figure hands the brightness to CSS as a percentage, and the stylesheet
mixes the color of the face with black by it. A low sun also sets
`--mc-warm` on the figure, which mixes an orange into every color, so the
morning and the evening glow:

```css
.mini-city .face {
    --mc-fill: color-mix(in srgb, var(--mc-lit) var(--mc-shade, 100%), black);
    fill: var(--mc-fill);
}
```

## Shadows are hulls on the ground

Every vertex of a building slides down its sunbeam to the ground, `y = 0`.
The vertices on the ground stay where they are, the ones up high land far
away, and d3's `polygonHull` of them all is the shadow:

```ts
const points = building.pieces
    .flat()
    .map((p) => [p.x - (p.y / sun.y) * sun.x, p.z - (p.y / sun.y) * sun.z]);
return polygonHull(points).map(([x, z]) => ({ x, y: 0, z }));
```

The shadows are drawn with `polygons3D` between the ground and the
buildings. They are opaque and the group that holds them is faded, so two
overlapping shadows are no darker than one. A low sun throws a shadow past
the edge of the city, so the group is clipped to the outline of the ground:
the shadows lie in the same plane, so cutting them on the screen cuts them
in the model too. They fall on the ground only, never on another building.

## The whole source

The figure lives in
[docs/examples/miniCity.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/miniCity.ts)
in the repository, its styles in
[docs/examples/miniCity.css](https://github.com/niekes/d3-3d/blob/master/docs/examples/miniCity.css),
and the SVG and the drag in
[docs/examples/rotatingFigure.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/rotatingFigure.ts).
The figure, ready to copy:

<<< @/examples/miniCity.ts
