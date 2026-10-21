---
title: Trajectory explorer
---

# Trajectory explorer

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { mountTrajectoryExplorer } from './trajectoryExplorer';

const host = ref(null);
let dispose;

onMounted(() => {
    if (host.value) dispose = mountTrajectoryExplorer(host.value);
});

onBeforeUnmount(() => {
    if (dispose) dispose();
});
</script>

<div ref="host" class="trajectory-explorer"></div>

**Drag the figure** to rotate it. The button pauses and resumes the
playback, and the slider scrubs through time. The radio buttons pick a
trajectory: its whole path comes forward, the others step back, and its
position is read out under the figure.

The three paths run through the
[Lorenz attractor](https://en.wikipedia.org/wiki/Lorenz_system). Their
starts differ only in z, by 0.01 and by 0.00001. For a few seconds the
three share one path, then B splits off, and after about ten seconds C
follows: a tiny difference at the start grows until the paths have nothing
in common.

## Integrated once, played back

The paths are integrated once, when the module loads: 1500 samples each.
Every sample keeps the path it belongs to and its index on the playhead,
`t`:

```ts
function lorenz(id, start) {
    let { x, y, z } = start;
    return range(SAMPLES).map((t) => {
        for (let step = 0; step < SUBSTEPS; step += 1) {
            [x, y, z] = [
                x + DT * SIGMA * (y - x),
                y + DT * (x * (RHO - z) - y),
                z + DT * (x * y - BETA * z)
            ];
        }
        return { id, t, x, y, z };
    });
}
```

The playback never integrates again. It only moves the playhead, a
fractional sample index that the timer advances and the slider sets.

## One playhead, three renderers

[`axes3D`](/api/#axes) draws the back walls of the box, and
[`lineStrips3D`](/api/#shapes) the paths and their trails.
[`points3D`](/api/#shapes) draws the markers. All three get the same
scale, origin and accessors, and every draw turns them by the same angles,
so they project into one scene:

```ts
const renderers = [box3d, strips3d, markers3d];
for (const renderer of renderers) {
    renderer
        .scale(SCALE)
        .origin(ORIGIN)
        .x((d) => scaleX(d.x))
        .y((d) => -scaleZ(d.z))
        .z((d) => scaleY(d.y));
}
```

Every draw also reads one playhead for all three. The head of a path is
its sample at the playhead, interpolated between the two nearest samples.
The marker sits on the head and the trail ends at it, so the two cannot
drift apart:

```ts
const heads = TRAJECTORIES.map((d) => head(d.samples));
const markers = markers3d.data(heads);
const walls = box3d.data(spec).filter((wall) => !wall.ccw);
const paths = strips3d.data(TRAJECTORIES.map((d) => d.samples));
const trails = strips3d.data(TRAJECTORIES.flatMap((d, k) => trail(d.samples, heads[k])));
```

`interpolateObject` mixes the two samples field by field, `t` included, so
a head carries its own place on the playhead.

## A trail of short strips

A line strip comes back with one centroid, the depth that the
[`sort`](/api/#utility-functions) utility reads. A whole trail drawn as
one strip would paint above or below every marker as a single piece. The
trail is cut into strips of six samples that share their end points
instead, and each strip sorts on its own depth. A trail can pass behind
one marker and in front of another:

```ts
function trail(samples, tip) {
    const end = Math.floor(t);
    const points = [tip, ...samples.slice(Math.max(0, end - TRAIL), end + 1).reverse()];
    return range(0, points.length - 1, CHUNK - 1).map((from) =>
        points.slice(from, from + CHUNK)
    );
}
```

The strips make the fade, too. The opacity of a strip follows the age of
its newest sample, from 1 at the marker to 0 at the end of the trail:

```ts
.attr('stroke-opacity', (d) => 1 - (t - d[0].t) / TRAIL);
```

The whole paths are drawn faintly in a group under the trails and are
never sorted.

## One loop, stopped on pause and on leave

A d3 `timer` moves the playhead on by the time since the last frame and
draws. The playhead wraps around at the end and waits while the reader
holds the slider:

```ts
function frame() {
    const now = performance.now();
    if (!scrub.matches(':active')) {
        t = (t + (now - lastFrame) * RATE) % (SAMPLES - 1);
    }
    lastFrame = now;
    drawScene();
}
```

Pause stops the timer and play starts a new one. The figure also stops it
when the page is left, otherwise the loop would keep drawing into a
detached SVG. A reader who prefers reduced motion gets the figure paused,
on a moment after the paths have split.

## The whole source

The figure lives in
[docs/examples/trajectoryExplorer.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/trajectoryExplorer.ts)
in the repository, its styles in
[docs/examples/trajectoryExplorer.css](https://github.com/niekes/d3-3d/blob/master/docs/examples/trajectoryExplorer.css),
and the SVG, the drag and the play button in
[docs/examples/rotatingFigure.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/rotatingFigure.ts).
The figure, ready to copy:

<<< @/examples/trajectoryExplorer.ts
