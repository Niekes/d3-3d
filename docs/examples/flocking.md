---
title: Flocking
---

# Flocking

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { mountFlocking } from './flocking';

const host = ref(null);
let dispose;

onMounted(() => {
    if (host.value) dispose = mountFlocking(host.value);
});

onBeforeUnmount(() => {
    if (dispose) dispose();
});
</script>

<div ref="host"></div>

**Drag the figure** to rotate it; a flick lets it spin out. The button plays
and pauses the flock, and **reset** brings back the flock it started from.
The sliders weight the three rules and set the radius a boid sees its
neighbors in, the picker sets the number of boids, and the checkbox moves
the eye from infinitely far away to 4 units from the middle of the box. With
the figure focused, <kbd>Space</kbd> plays and pauses and <kbd>.</kbd> steps
the paused flock.

The rules are Craig Reynolds'
[boids](https://www.red3d.com/cwr/boids/), from his 1987 paper _Flocks,
Herds, and Schools_. Every boid is a dot drawn with `points3D`, its tail a
`lines3D` segment back to where it was 0.15 seconds ago, and the back walls
of the box are `axes3D`. All three hang on one `camera3D`.

## Three rules

No boid knows the flock. A boid sees the others within the radius, 0.25
units unless the slider says otherwise, and steers by three rules:

- **Separation:** away from every neighbor within half the radius, weighted
  by `1 / (d² + ε)`, so two boids that nearly touch push apart hardest. The
  small ε keeps two boids on the same spot from pushing infinitely hard.
- **Alignment:** towards the mean velocity of its neighbors.
- **Cohesion:** towards the mean position of its neighbors.

A fourth push keeps the flock in the box: within 0.15 of a wall it pushes
back inside, the harder the deeper the boid flies into the margin. The walls
steer and never wrap around, because a boid that leaves on one side and
comes back on the other is hard to follow in 3D. The weights of the three
rules scale their steering, one axis at a time:

```ts
let steer = rules.separation * GAIN.separation * push[k] + wallPush(boid[k]);
if (count) {
    steer += rules.alignment * GAIN.alignment * (velocity[k] / count - v[k]);
    steer += rules.cohesion * GAIN.cohesion * (position[k] / count - boid[k]);
}
v[k] += steer * dt;
```

Set separation to 0 and the boids clump into dots that overlap. Set
cohesion to 0 and the flock spreads through the whole box.

## One step for every boid

A step runs in two passes, so the order of the array never biases the
flock. The first pass tests every pair once and adds what each boid sees of
the other: its position, its velocity and, when the two are close, the push
apart. The second pass steers every boid with its sums, keeps its speed
between 0.15 and 0.6 units per second and moves it on. No boid reacts to a
neighbor that has already moved in the same step:

```ts
for (let i = 0; i < boids.length; i += 1) {
    for (let j = i + 1; j < boids.length; j += 1) {
        const a = boids[i];
        const b = boids[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 >= near) {
            continue;
        }
        // each one sees the other, and the close ones push apart
    }
}
```

Testing every pair is 45,000 tests a frame for 300 boids, which takes a
millisecond or two. A larger flock wants a grid of cells one radius wide, so that
a boid only tests the boids in its own cell and the cells next to it.

The play button runs a d3 `timer`, and every frame steps the flock by the
time since the last one. A step never takes more than 1/30 of a second, so a
tab that comes back from the background does not fling the flock through a
wall:

```ts
const play = playback(button, (elapsed) => {
    step(boids, rules, Math.min(elapsed / 1000, MAX_STEP));
    render();
});
```

The simulation lives in the box from −1 to 1 and never touches the screen.
Every frame hands the same boids to `.data` again, joins the dots and the
tails by the id of their boid and paints them back to front with `sort`,
without a transition. A reader who prefers reduced motion gets the figure
paused, on the flock that 240 steps have formed.

## Moving points, sizing marks

The projection moves points: it decides where a dot goes. The size of the
dot is the figure's. `points3D` hands every point its rotated position as
its centroid, and its z is the depth along the line of sight. In the
orthographic view the projection drops that z, and a boid at the back of the
box is drawn exactly as large as one at the front. The figure gives the
flock its depth back from the centroid:

```ts
const sizeByDepth = scaleLinear([-DEPTH, DEPTH], [2.5, 5]);
const fadeByDepth = scaleLinear([-DEPTH, DEPTH], [0.45, 1]);

circles
    .attr('r', (d) => sizeByDepth(d.centroid.z))
    .attr('opacity', (d) => fadeByDepth(d.centroid.z));
```

`DEPTH` is √3, the half-diagonal of the box: no point in it lies deeper. The
tail takes the opacity of its dot, and the dots and the tails sort in one
painter's list, so a tail that points away from you lies under its dot.

With **perspective** on, the eye sits 4 units in front of the middle of the
box. The box reaches √3 from its middle, so every boid stays in front of
the eye. The projection now scales the distances around a boid by the growth
at its depth, as the [perspective street](./perspective-street) computes it:

```ts
const growth = (z, distance) => 1 / (1 - z / distance);
```

The far boids are drawn closer together and the near ones farther apart.
The radius of a circle is still an attribute that the projection never
sees, so the figure grows it by the same factor: a dot of 3.5 times the
growth keeps its size against the flock around it, and two dots stand in
the ratio of their growths.

## Order from alignment

How much does the flock fly as one? The polarization is the length of the
mean of the unit velocities: 0 for boids that fly every way and 1 for a
flock that flies in one direction. The readout shows it four times a
second, slow enough to read:

```ts
function polarization(boids) {
    const sum = { x: 0, y: 0, z: 0 };
    for (const { velocity } of boids) {
        addTo(sum, velocity, 1 / speed(velocity));
    }
    return speed(sum) / boids.length;
}
```

The flock starts flying every way, near 0. With the default weights it
climbs above 0.9 within seconds and falls back a little while the flock
turns at a wall. Set alignment to 0 and it stays below 0.4, however long
the flock flies: separation and cohesion hold the boids together, but
nothing turns them the same way. Order appears from alignment alone, and no
boid ever sees more than its neighbors.

The colors show the speeds, from 0.15 to 0.6 units per second, on the middle
of the plasma ramp: the part of it that reads on the light and on the dark
page.

## The whole source

The figure and its styles live in
[docs/examples/flocking.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/flocking.ts)
in the repository: the figure adds the styles and its class to the element
it mounts into, so it needs no stylesheet. The SVG, the drag and the play
button live in
[docs/examples/rotatingFigure.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/rotatingFigure.ts)
and the tails in
[docs/examples/segments.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/segments.ts).
The figure, ready to copy:

<<< @/examples/flocking.ts
