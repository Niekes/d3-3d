---
title: Cellular automaton
---

# Cellular automaton

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { mountCellularAutomaton } from './cellularAutomaton';

const host = ref(null);
let dispose;

onMounted(() => {
    if (host.value) dispose = mountCellularAutomaton(host.value);
});

onBeforeUnmount(() => {
    if (dispose) dispose();
});
</script>

<div ref="host"></div>

**Press play** to run the generations, or **step** through them one at a
time, and set the speed on the slider. **New seed** scatters a fresh soup of
cells, and the select picks a rule. **Drag the figure** to rotate it, and
flick it to let it spin out. With the figure focused, <kbd>Enter</kbd> or
<kbd>→</kbd> steps, <kbd>Space</kbd> plays and pauses, <kbd>N</kbd> draws a
new seed and the keys <kbd>1</kbd> to <kbd>3</kbd> pick a rule. A cube is
yellow in the generation it is born, orange in the next one, red until it
is five generations old and purple from then on.

## Twenty-six neighbors

A cell of the grid touches 26 others: 6 across a face, 12 across an edge
and 8 across a corner. The rule only asks how many of them are alive. It is
written as two sets of counts: a live cell survives when its count is in
the first, and a dead cell is born when its count is in the second.

| Rule   | Survives on | Born on          | Soup                           |
| ------ | ----------- | ---------------- | ------------------------------ |
| 4555   | 4 or 5      | 5                | the middle 10³ cells, 25% live |
| 5766   | 5 to 7      | 6                | the whole grid, 35% live       |
| Clouds | 13 to 26    | 13, 14, 17 to 19 | the whole grid, 60% live       |

The names 4555 and 5766 spell out the counts: survive from 4 to 5, born
from 5 to 5. Every rule starts from a soup, a random scatter of live cells,
and the soup comes from `randomLcg` in d3 with the seed of the figure. So a
seed always gives the same soup: switching to another rule and back starts
the same run again, and only **new seed** draws a new one.

The grid does not wrap around: a cell outside it counts as dead. A cell on
a side of the grid has at most 17 live neighbors, one on an edge 11 and
one in a corner 7. Clouds keeps a cell with 13 or more, so it keeps the
flat sides of a clump and wears away its edges and corners. On a grid this
small, every run of Clouds ends empty after about twenty generations.

## One generation

The cells are a `Uint8Array` of 12³ = 1,728 entries, one per cell by layer,
row and column, and their ages a second one. A generation does not look up
26 neighbors for each of the 1,728 cells. It counts outwards from the live
cells instead, and every live cell adds one to each neighbor inside the
grid:

```ts
const counts = new Uint8Array(cells.length);
cells.forEach((alive, i) => {
    if (!alive) return;
    const { column, layer, row } = cellAt(i);
    for (const [dc, dl, dr] of NEIGHBORS) {
        const next = { column: column + dc, layer: layer + dl, row: row + dr };
        if (inside(next)) counts[indexOf(next)] += 1;
    }
});

const next = cells.map((alive, i) =>
    Number((alive ? rule.survive : rule.birth).includes(counts[i]))
);
```

That is 26 additions per live cell instead of 26 lookups per cell of the
grid, and the rule then reads every count once. A survivor grows a
generation older and a newborn starts at 0.

The step is a plain function of the cells, the ages and the rule, so it is
easy to check by hand. In a solid 2 × 2 × 2 block every cell has 7 live
neighbors, and no empty cell around it has more than 4. Under 5766 the
block survives as it is, and under 4555 it is gone after one step. The step
also reports whether a cell was born or died. When none was, the grid
stands still: play stops by itself and says so, and it does the same when
the grid dies out.

## Only the surface

A face that touches another live cell, or rests on the floor, can never be
seen, so it is dropped before the face join, exactly as in the
[voxel builder](/examples/voxel-builder):

```ts
function isOpen(cell, face) {
    const next = neighborOf(cell, face);
    return next.layer >= 0 && !(inside(next) && cells[indexOf(next)]);
}
```

`neighborOf` steps from a cell through one of its faces, with the same
table of steps the voxel builder uses. The readout under the figure counts
the faces that are drawn. A single cube in mid-air draws 6, and one on the
floor 5. The soup of Clouds holds 1,027 cells and 6,162 faces at the first
seed, and 2,765 of them are drawn. One generation later the clumps have
closed up: 812 cells, and 1,480 of their 4,872 faces drawn. The faces that
turn away from the camera are a different matter: they change with every
frame of a drag, so they keep their elements and are only hidden.

## Cubes that live on

Every live cell is a cube built with `box`, and every vertex carries the
key of the cell, its column, layer and row and the bucket of its age. The
cubes are joined by that key, so a cell that survives keeps its group from
one generation to the next: only a birth adds a group and only a death
removes one. The faces are joined by their name, so a face comes and goes
only when the cell behind it dies or is born. A drag adds or removes
nothing: it only redraws the paths. The age sets a class on the group, and the
class and the name of the face pick the fill, so the figure never sets a
color itself and dark mode has colors of its own.

The groups are painted back to front with `sort`, by the depth of their
centers, and for equal cubes on a grid that order is exact. Two cells lie a
whole number of cells apart along every axis on which they differ, so a
line of sight that passes through one cube and then the other has to run
from the first towards the second along each of those axes. The center of
the cube in front is therefore always nearer. An orthographic projection
looks along the same direction everywhere, so nothing more is needed, even
for a thousand cubes. The floor is drawn in a group of its own before the
cubes, and the camera never sinks below it, so it needs no place in the
sort.

## The whole source

The figure and its styles live in
[docs/examples/cellularAutomaton.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/cellularAutomaton.ts)
in the repository: the figure adds the styles and its class to the element
it mounts into, so it needs no stylesheet. The SVG, the drag and the play
button live in
[docs/examples/rotatingFigure.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/rotatingFigure.ts),
the camera and the floor in
[docs/examples/floorView.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/floorView.ts)
and the cube join, the face join and the neighbor steps in
[docs/examples/cubeFaces.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/cubeFaces.ts).
The figure, ready to copy:

<<< @/examples/cellularAutomaton.ts
