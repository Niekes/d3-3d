---
title: Data-update stress test
---

# Data-update stress test

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { mountDataUpdate } from './dataUpdate';

const host = ref(null);
let dispose;

onMounted(() => {
    if (host.value) dispose = mountDataUpdate(host.value);
});

onBeforeUnmount(() => {
    if (dispose) dispose();
});
</script>

<div ref="host"></div>

**Press the buttons** under the figure to add, remove, shuffle or move cubes,
and **switch the key** between the id and the index. The button on the
figure plays a stress test, a random action every 500 ms. **Drag the
figure** to rotate it. With the figure focused, <kbd>A</kbd> adds cubes,
<kbd>D</kbd> or <kbd>Delete</kbd> removes some, <kbd>S</kbd> shuffles the
data, <kbd>M</kbd> moves cubes, <kbd>P</kbd> plays or pauses the stress test,
<kbd>K</kbd> switches the key and the arrow keys turn the view.

## A key is an identity

Every draw joins the cubes to their elements, one `g` per cube. The key
decides which element a cube gets: the element that had the same id last
time, or the element that had the same place in the array.

```ts
const keyOf = (d) => (keyBy === 'id' ? d.id : String(d.index));

group.selectAll('g.cube').data(projected, keyOf).join(/* enter, update, exit */);
```

A shuffle reorders the array and changes nothing else. Press it once with
each key:

|                       | joined by id                                      | joined by index                                                                     |
| --------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| shuffle               | 0 entered, n updated, 0 exited; nothing moves     | 0 entered, n updated, 0 exited; most elements slide to another cube and are adopted |
| remove the first cube | 1 exited, the element of that cube; nothing moves | 1 exited, the element of the last cube; every other element slides to the next cube |

The counts of a shuffle are the same for both keys; d3 sees n updates
either way. What differs is which datum an element gets. By index, the
element in place 3 takes whatever cube is in place 3 now, so it slides to
that cube's cell and its label slides with it. A dashed outline marks an
element that is now bound to another cube than the one it was born for.
Switching back to the id does not undo that: an element keeps the cube it
was handed last.

The index the toggle stands for is the place of a cube in the data array,
carried on the datum. d3's own join without a key pairs the data with the
elements in their DOM order, and the painter's sort reorders the elements
with every turn, so the figure keys by the index the element got last.

## Ids through the projection

`transform` spreads every datum into its transformed point, so whatever a
vertex carries survives the projection. `points3D` adds the centroid in
place, so a label still has the id of its cube. `cubes3D` returns fresh
arrays for the cubes, so the id rides on the eight vertices and is attached
again from the first one:

```ts
function makeCube(block) {
    return box({
        x: block.column - 2.5,
        y: 0,
        z: block.row - 2.5,
        width: 0.7,
        height: block.height,
        depth: 0.7
    }).map((corner) => ({ ...block, ...corner }));
}

const projected = cubes3d.data(blocks.map(makeCube)).map((cube, index) => {
    const { id, column, row, height } = cube[0];
    const bottom = cube.faces.find((face) => face.face === 'bottom');
    return Object.assign(cube, { id, column, row, height, index, centroid: bottom.centroid });
});
```

The cubes differ in height, so they sort by the centroid of their bottom
face: the centre of a tall cube sits high up and would paint over a short
cube in front of it.

## The view stays put

The rotation lives in the camera, not in the data. The cubes, their labels
and the floor hang on one `camera3D`, and an update never touches it: every
draw poses the camera with the yaw and the pitch it has. Adding cubes during
a glide never makes the scene jump, and the glide goes on.

The drag reports its total, and the figure turns by the change since the
last report, so the drag and the arrow keys add up. A turn draws without
time: every running transition is cut short, so the cubes snap to their
cells, and the exiting cubes, which still stand where the view was, are
taken away.

## Enter, update, exit

These are the three sets of a keyed join, and the join callbacks count
them. The history of an element sits beside the data, in two d3 locals:
the id it was born with and the cell it was drawn on last.

```ts
const bornAs = local();
const drawnAt = local();

group
    .selectAll('g.cube')
    .data(projected, keyOf)
    .join(
        (enter) => {
            counts.enter = enter.size();
            return enter
                .append('g')
                .attr('class', 'cube')
                .each(function (d) {
                    bornAs.set(this, d.id);
                });
        },
        (update) => {
            counts.update = update.size();
            // Only the elements whose cell changed flash blue.
            return update;
        },
        (exit) => {
            counts.exit = exit.size();
            // Red, fade out, remove.
        }
    )
    .each(function (d) {
        drawnAt.set(this, cellOf(d));
    })
    .classed('is-adopted', function (d) {
        return bornAs.get(this) !== d.id;
    });
```

The readout under the figure shows the last three sizes, their totals and
the adopted elements. The totals add up: the entered minus the exited is the
number of cubes on the floor, and for every update the entered and the
updated make the cubes after it, the updated and the exited the cubes
before it.

An exiting element changes its class as it fades, so the next join does not
pick it up again. A flash is a custom property that the transition fades
from `100%` to `0%`, and the styles mix the color into the cube by it. The
stress test steps every 500 ms, while a transition lasts 600 ms, so every
step interrupts the last one; a transition starts from where the last one
stopped. With reduced motion every action draws without time: cubes appear,
jump and vanish without a fade or a slide.

## The whole source

The figure and its styles live in
[docs/examples/dataUpdate.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/dataUpdate.ts)
in the repository: the figure adds the styles and its class to the element
it mounts into, so it needs no stylesheet. The SVG, the drag and the play
button live in
[docs/examples/rotatingFigure.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/rotatingFigure.ts),
the camera and the floor in
[docs/examples/floorView.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/floorView.ts)
and the grid lines in
[docs/examples/segments.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/segments.ts).
The figure, ready to copy:

<<< @/examples/dataUpdate.ts
