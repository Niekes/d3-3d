---
title: Space-time cube
---

# Space-time cube

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { mountSpaceTimeCube } from './spaceTimeCube';

const host = ref(null);
let dispose;

onMounted(() => {
    if (host.value) dispose = mountSpaceTimeCube(host.value);
});

onBeforeUnmount(() => {
    if (dispose) dispose();
});
</script>

<div ref="host"></div>

**Drag the figure** to rotate it. The button plays and pauses the day, the
slider moves the time plane, the radio buttons pick a person and fade the
others, and the checkbox switches to perspective. With the figure focused,
the arrow keys step the time by 15 minutes and by an hour with
<kbd>Shift</kbd>, <kbd>Space</kbd> plays and pauses, <kbd>1</kbd> to
<kbd>4</kbd> pick a person and <kbd>0</kbd> or <kbd>Escape</kbd> all of them.

The cube is the space-time cube of Torsten Hägerstrand's
[time geography](https://en.wikipedia.org/wiki/Time_geography): the floor
is the map of a town, up is the time of one day, and the life of a person
is a path through it. Four
people go about their day between six places. A and D share the flat, B and
C the house; C teaches at the school B goes to, and D runs the café.

## Time goes up

The data has three axes. x is east and y is north, in km on a map of
10 × 10 km, and z is the time of day in hours, from 6:00 to 22:00. Each
axis reaches the cube through a linear scale onto −1 to 1, and the
accessors turn the time into the height. The screen y grows downwards, so
the time is negated. North runs into the depth, away from the viewer, so it
is negated as well: without that, the map would be mirrored, and seen from
above with north up, east would lie on the left.

```ts
const km = scaleLinear([0, MAP], [-1, 1]);
const hours = scaleLinear([START, END], [-1, 1]);
for (const renderer of renderers) {
    renderer
        .x((d) => km(d.x))
        .y((d) => -hours(d.z))
        .z((d) => -km(d.y));
}
```

The time is an axis like any other, so `axes3D` frames the cube as it
frames a chart, and `axisSpec` turns each scale into its axis: ticks every
2 km on the map and every 2 hours in time. The floor wall becomes the grid
of the map, and the side walls carry the hours:

```ts
const spec = { x: axisSpec(km, 5), y: axisSpec(km, 5), z: axisSpec(hours, 8) };
```

All renderers hang on one `camera3D`, and every draw poses it with the
yaw and the pitch of the drag. The cube turns around its middle.

## A stay is a station

A schedule is a list of stays, each with a start, an end and a place. A
trip fills the gap between two stays at a constant speed:

```ts
const A = [
    [6, 7.5, 'flat'],
    [8, 12, 'office'],
    [12.25, 13.25, 'café'],
    [13.5, 17.5, 'office'],
    [18, 19.5, 'gym'],
    [20.25, 22, 'flat']
];
```

Every path is sampled once, every 5 minutes, 193 samples per person. A
sample keeps the id of its person and stores the time as its z:

```ts
range(SAMPLES).map((i) => {
    const z = START + i / PER_HOUR;
    const { x, y } = whereAt(stays, z);
    return { id, x, y, z };
});
```

That is all it takes to read a path:

- **A stay is upright.** The place stays and only the time goes on, so the
  path rises straight up, exactly along the dashed station of its place.
- **A trip is slanted.** The slant is the speed: the flatter the line, the
  more ground in the same time.
- **The route is the shadow.** Every path is drawn flat on the floor too,
  faint: where someone went, without when.

The plane at the time of the slider is a `planes3D` quad that spans the
map. A `points3D` marker shows where everyone is at that time, between the
two nearest samples, and a drop line falls from it to the floor. The
readout says the same in words: at a place, or on the way to one.

## One plane, two lists

The plane cuts the scene in two, the past below it and the future above
it, and the figure never sorts across it. Wherever the two halves overlap
on the screen, the half on the side of the eye is in front. So the figure
paints in groups: the walls and the floor, the far half, the plane, the
markers on it, and the near half. `sort` orders the pieces only inside one
half.

Every frame cuts what crosses the plane. A path splits at the time t: the
samples up to t and the position at t make the past, the position at t and
the samples after it the future. `strips` cuts both into pieces of six
samples, so each piece sorts on its own depth, and every station splits
into a lower and an upper part:

```ts
const heads = paths.map((s) => interpolateObject(s[k], s[k + 1])(i - k));
const past = paths.flatMap((s, p) => strips([...s.slice(0, k + 1), heads[p]], CHUNK));
const future = paths.flatMap((s, p) => strips([heads[p], ...s.slice(k + 1)], CHUNK));
```

Which half is near? The one the eye is on. A renderer knows its eye: it
sits at the rotation center plus the distance of the perspective times
[`.viewDirection()`](/api/#viewdirection), and the figure compares its
height with the height of the plane:

```ts
const eye = -(VIEW.center.y + camera.perspective() * camera.viewDirection().y);
const [pastSide, futureSide] = eye > hours(t) ? [far, near] : [near, far];
drawSide(pastSide, 'past', lower, past, drops);
drawSide(futureSide, 'future', upper, future, []);
```

The order is exact, not a guess. Every line of sight runs from the eye, and
it crosses the plane at most once, so whatever lies on the side of the eye
comes first along it and the other side after the plane.

In the orthographic view the distance is infinite, and the eye is
infinitely far up: the camera stays at least 10° above the floor. The past
always lies behind the plane and the future in front of it.

In perspective the eye sits 3 units from the middle of the cube, at a
height of 3 · sin of the tilt. Below a tilt of about 19° it drops under the
top of the cube, and at the lowest tilt of 10° it stands level with about
18:10. Move the plane higher, and the eye looks at it from below: the
future lies behind the plane, and the past is painted over it. Switch
perspective off again, and the future is in front at once.

## Meetings

A meeting is two paths that run together: two people who stay at the same
place at the same time. Their stays share a station, so their paths rise
as one line. The figure finds them by grouping everyone who stays at a
place at t, rings the place on the plane and names them in the readout:

```ts
function meetingsAt(time) {
    const staying = PEOPLE.map(({ id, stays }) => ({ id, ...whereAt(stays, time) })).filter(
        (d) => !d.moving
    );
    return groups(staying, (d) => d.place).filter(([, met]) => met.length > 1);
}
```

The day has eight of them: A and D at the flat until 6:30, B and C at the
house until 7:30 and at school from 7:45 to 15:00, A and D at the café over
lunch, B and D at the café at 15:30, A and C at the gym from 18:00 to 19:00,
and B and D, then B, C and D at the house in the evening. B and C also
walk to school together from 7:30 to 7:45. Their paths run together there
as well, slanted, but a trip is not a stay, so the readout leaves it out.

## The whole source

The figure and its styles live in
[docs/examples/spaceTimeCube.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/spaceTimeCube.ts)
in the repository: the figure adds the styles and its class to the element
it mounts into, so it needs no stylesheet. The SVG, the drag and the play
button live in
[docs/examples/rotatingFigure.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/rotatingFigure.ts),
the camera in
[docs/examples/floorView.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/floorView.ts),
the box and its axes in
[docs/examples/axisEdges.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/axisEdges.ts)
and the segments in
[docs/examples/segments.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/segments.ts).
The figure, ready to copy:

<<< @/examples/spaceTimeCube.ts
