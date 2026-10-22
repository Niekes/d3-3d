---
title: Exploded cube assembly
---

# Exploded cube assembly

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { mountExplodedCubes } from './explodedCubes';

const host = ref(null);
let dispose;

onMounted(() => {
    if (host.value) dispose = mountExplodedCubes(host.value);
});

onBeforeUnmount(() => {
    if (dispose) dispose();
});
</script>

<div ref="host"></div>

**Drag the figure** to rotate it, **move the slider** to pull the four layers
apart and **click a cube** to inspect it. The button explodes or assembles
the block in one go. With the figure focused, the arrow keys and
<kbd>Page Up</kbd> / <kbd>Page Down</kbd> walk the selection through the
block and <kbd>Esc</kbd> clears it.

## An assembly is 64 cubes

The block is a 4 × 4 × 4 grid of unit cubes, and every cube is the eight
corners of a `box` handed to `cubes3D`. Each vertex carries the id and the
grid position of its cube, so the cube can still be told apart after the
projection:

```ts
function makeCube(layer, row, column) {
    const id = `cube-${layer}-${row}-${column}`;
    return box({ x: column - 1.5, y: 2 - layer, z: row - 1.5, width: 1, height: 1, depth: 1 })
        .map((corner) => ({ ...corner, id, layer, row, column }));
}
```

The screen y grows downwards, so the top layer has the smallest `y`, and a
box stands on its bottom and rises towards a smaller `y`.

## Explode before you rotate

The explosion is not a second transform. It is an offset in the `y`
accessor: every layer moves away from the middle of the block by its
distance from the middle, times the explode amount. The accessor runs before
the rotation, so the offset lives in the model, and the layers part along
the block's own vertical axis, however the block is turned:

```ts
const lift = (layer) => (layer - 1.5) * GAP * explode;

const cubes = cubes3D()
    .scale(46)
    .origin({ x: 480, y: 250 })
    .y((d) => d.y - lift(d.layer));
```

Moving the `origin` of each layer instead would shift the layers in screen
space: they would always part straight up the screen, even with the block
tipped towards the camera, where its layers lie one behind the other.

## One state, one render

The drag, the slider, the button and the keys never draw. Each one writes to
the state of the figure - the two angles of the drag, the explode amount and
the selected cube - and calls the one function that does:

```ts
function render() {
    turnCamera(cubes, yaw, pitch, { yaw: START_ANGLE, tilt: START_ANGLE });
    // ...join and sort the cubes, see below
}
```

The button does not animate the paths either. It tweens the explode amount
and renders on every tick, so a drag during the animation keeps turning the
block while it comes apart:

```ts
select(host)
    .transition('explode')
    .duration(900)
    .tween('explode', () => {
        const amount = interpolateNumber(explode, target);
        return (t) => setExplode(amount(t));
    });
```

A transition on the `d` attribute of the faces would be overwritten by the
next frame of the drag.

## Identity survives the projection

`cubes3D` returns fresh arrays on every call, but every transformed vertex
keeps the properties of its input. The cube join is keyed by the id on the
first vertex and the face join by the face name, so the 64 groups and their
384 paths are created once and never enter or exit again. Rotating and
exploding only rewrite the paths and the order:

```ts
const cubeGroups = group
    .selectAll('g.cube')
    .data(cubes.data(assembly), (d) => d[0].id)
    .join((enter) => enter.append('g').attr('class', (d) => `cube layer-${d[0].layer}`))
    .classed('is-selected', (d) => d[0].id === selected?.id)
    .sort(sort);
```

That is why the selection sticks: the class sits on an element that stays
the same cube for the whole life of the figure. The colors stay in the
styles of the figure: the layer class picks the hue, the face class its
shade, and the figure never sets a fill.

The hover needs no script either. A cube is one group, so a `:hover` rule
on the group lights all of its faces at once. It stays off while a drag
turns the block under the pointer:

```css
.exploded-cubes .cube {
    --ec-face: color-mix(in srgb, var(--ec-base), white var(--ec-glow, 0%));
}

.exploded-cubes .cubes-svg:not(:active) .cube:hover {
    --ec-glow: 25%;
}
```

## Only the faces that face you

`cubes3D` sets `ccw` on every face that faces the camera. The faces that
turn away keep their element and are only hidden:

```ts
cubeGroups
    .selectAll('path')
    .data(
        (d) => d.faces,
        (d) => d.face
    )
    .join((enter) => enter.append('path').attr('class', (d) => `face face-${d.face}`))
    .attr('visibility', (d) => (d.ccw ? null : 'hidden'))
    .attr('d', cubes.draw);
```

The faces of one cube that face the camera never overlap, so unlike the
[bar chart](/examples/bar-chart) the faces inside a cube need no sort. Only
the cubes are sorted, by the depth of their centre. For this block that
order is exact: the cubes are all the same size and sit on a grid, a taller
one once the layers part, so whenever one cube covers another, its centre
is nearer to the camera too.

## Inspecting a cube

The click listener sits on the SVG. The face under the pointer is the event
target, and its first vertex knows its cube, so no lookup table is needed:

```ts
svg.on('click', (event) => {
    const cube = event.target.matches('.face') ? select(event.target).datum()[0] : undefined;
    inspect(cube?.id === selected?.id ? undefined : cube);
});
```

The ids make the toggle a comparison: a second click on the selected cube
clears the selection, and so does a click next to the block.

The click that ends a drag never arrives: `d3.drag` swallows it once the
pointer has moved, so turning the block never selects a cube.

The inspector names a cube by how many of its faces show while the block is
assembled: three for a corner, two for an edge, one for a face cube and none
for a core cube. The eight core cubes are hidden in the assembled block, so
pull the layers apart to reach them.

## The whole source

The figure and its styles live in
[docs/examples/explodedCubes.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/explodedCubes.ts)
in the repository: the figure adds the styles and its class to the element
it mounts into, so it needs no stylesheet. The SVG and the drag live in
[docs/examples/rotatingFigure.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/rotatingFigure.ts).
The figure, ready to copy:

<<< @/examples/explodedCubes.ts
