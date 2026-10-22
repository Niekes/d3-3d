---
title: Sorting sculpture
---

# Sorting sculpture

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { mountSortingSculpture } from './sortingSculpture';

const host = ref(null);
let dispose;

onMounted(() => {
    if (host.value) dispose = mountSortingSculpture(host.value);
});

onBeforeUnmount(() => {
    if (dispose) dispose();
});
</script>

<div ref="host"></div>

**Press step** to take one comparison or swap, or **play** to let the
algorithm run at the speed of the slider. **Shuffle** deals a new order, and
the select runs bubble sort, insertion sort or quick sort on the same one.
**Drag the figure** to rotate it, and flick it to let it spin out. With the
figure focused, <kbd>Enter</kbd> or <kbd>→</kbd> takes a step,
<kbd>Space</kbd> plays or pauses, <kbd>S</kbd> shuffles and the keys
<kbd>1</kbd> to <kbd>3</kbd> pick the algorithm.

## An algorithm, one step at a time

The 24 columns are an array of the values 1 to 24, laid around a ring:
index 0 to 23 runs clockwise, seen from above, and a column is a quarter
unit high per value. Each algorithm is a generator over that array. It sorts
the array in place, as it would without a figure, and yields what it does on
the way: a comparison of two indices, a swap of two indices once it is made,
and a settle when an index holds its final value. Bubble sort:

```ts
function* bubbleSort(items) {
    for (let end = items.length - 1; end > 0; end -= 1) {
        let swapped = false;
        for (let i = 0; i < end; i += 1) {
            yield { kind: 'compare', i, j: i + 1 };
            if (items[i].value > items[i + 1].value) {
                swap(items, i, i + 1);
                swapped = true;
                yield { kind: 'swap', i, j: i + 1 };
            }
        }
        yield { kind: 'settle', i: end };
        if (!swapped) return;
    }
}
```

The figure only pulls steps: the step button calls `next()` once, play calls
it once per interval of the speed, and the counters count what comes back.
A settle is not a step of its own, it is taken on the way to the next
comparison or swap. Each algorithm settles where it knows a place is final:
bubble sort the end of every pass, and quick sort, with the last item of a
part as its pivot, every pivot it partitions around. Insertion sort knows
nothing before the end, since the last item may still be the smallest and
push every other one up. When the generator runs out, every column is
settled.

## The same column, moved

The columns are joined by the id of their value, not by their index. Every
vertex carries the id through the projection, as in the
[bar chart](/examples/bar-chart#labels-survive-the-projection):

```ts
group.selectAll('g.column').data(columns, (d) => d[0].id);
```

A swap changes the index of two values, but each value keeps its element,
so the swap moves the same two elements. Joined by index, the elements
would stay where they are and trade their heights: the columns would grow
and shrink instead of moving.

The movement is a tween of where a value stands, not of its paths. Every
value has a display angle and a radius, and a swap turns the two from their
old slots to the new ones through a named transition on the host:

```ts
select(host)
    .transition('swap')
    .duration(Math.min(250, 800 / speed))
    .tween('swap', () => (t) => {
        const lane = 1.2 * Math.min(1, (j - i) * Math.sin(Math.PI * t));
        ahead.angle = from + (to - from) * t;
        ahead.radius = 6 + lane;
        back.angle = to + (from - to) * t;
        back.radius = 6 - lane;
        render();
    });
```

The column that moves clockwise rides outside the ring and the other one
inside, so the two pass each other. An adjacent swap swings out and back; a
far swap leaves the ring at once, so it also passes the columns in between.
Every frame of the tween projects the columns again, so a drag keeps turning
the scene during a swap. A step during the tween interrupts it and puts
every column on its slot. Above 15 steps per second, or with reduced motion,
a swap jumps.

## Sort by the floor

[`sort`](/api/#sort) orders by the depth of a centroid, and the centroid of a cube is the
middle of its box. With the camera above the floor, the depth of that middle
also depends on the height: seen from above, the middle of a tall column is
nearer to the camera than its footprint. Next to a short column, that can
paint the tall one over the short one in front of it.

The columns all stand on the floor, and their footprints are disjoint
squares of one size, so the depth of a footprint tells which column hides
which. A cube has the centroid of its `bottom` face at hand. These are the
two lines of the bar chart's
[painter's algorithm, twice](/examples/bar-chart#the-painter-s-algorithm-twice):

```ts
centroid: cube.faces.find((face) => face.face === 'bottom').centroid;
```

```ts
group.selectAll('g.column').sort(sort);
```

The order holds as long as the circles around two footprints do not meet: a
vertical plane then parts the two columns, and the one on the side of the
camera is in front, whatever their heights. On the ring two neighbours
stand 1.57 units apart and the circles are 1.13 wide, and the lane of a
swap stays 1.2 off the ring, so the order holds while two columns pass the
others too. The floor is drawn first, in its own group; the camera stays
above it, so it needs no place in the sort.

The figure is orthographic. With [`.perspective()`](/api/#perspective) the eye sits at
a point, and the footprints near the edge of the view would have to be
sorted by their distance from that point instead.

## Counting the work

The counters count the comparisons and the swaps. A new algorithm starts
over on the same shuffle, so the counts can be compared: on the first
shuffle of the page, bubble sort takes 266 comparisons and 135 swaps,
insertion sort 157 comparisons and 135 swaps, and quick sort 81 comparisons
and 37 swaps.

Bubble sort and insertion sort always make the same number of swaps. Both
only swap two neighbors that are in the wrong order, and each such swap
puts exactly one pair of values in the right order. A pair in the wrong
order is an inversion, and neither algorithm stops while one is left, so
both make exactly as many swaps as the shuffle has inversions: 135 on the
first shuffle, between 0 and 276 for 24 values, and 138 on average.

They differ in the comparisons. Bubble sort compares every neighbor of a
pass, at most 24 · 23 / 2 = 276 times, and only stops early after a pass
without a swap. Insertion sort compares once for every swap and once more
for every item that stops above the start of the ring, so at most 23 times
more than it swaps. Quick sort swaps across the ring, and one long swap can
put many pairs in order at once: over many shuffles of 24 values it takes
about 93 comparisons and 38 swaps.

## The whole source

The figure and its styles live in
[docs/examples/sortingSculpture.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/sortingSculpture.ts)
in the repository: the figure adds the styles and its class to the element
it mounts into, so it needs no stylesheet. The SVG, the drag and the play
button live in
[docs/examples/rotatingFigure.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/rotatingFigure.ts),
the camera and the floor with its slot ticks in
[docs/examples/floorView.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/floorView.ts)
and the face join in
[docs/examples/cubeFaces.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/cubeFaces.ts).
The figure, ready to copy:

<<< @/examples/sortingSculpture.ts
