---
title: Network explorer
---

# Network explorer

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { mountNetworkExplorer } from './networkExplorer';

const host = ref(null);
let dispose;

onMounted(() => {
    if (host.value) dispose = mountNetworkExplorer(host.value);
});

onBeforeUnmount(() => {
    if (dispose) dispose();
});
</script>

<div ref="host" class="network-explorer"></div>

**Drag the figure** to rotate it. **Click a node**, or pick one from the
list, to highlight its neighbors and the edges that reach them. The
checkboxes show and hide the clusters. **Pinch on a trackpad**, turn the
wheel with ctrl held, or use the slider to zoom. The button resets all of
it.

## Clusters from a seed

The network has 45 nodes in three clusters. Every node lies near the center
of its cluster, scattered by a normal distribution that draws from a seeded
source, so the network is the same on every load:

```ts
const jitter = randomNormal.source(randomLcg(SEED))(0, SPREAD);

const NODES = GROUPS.flatMap(({ id, center }) =>
    range(PER_GROUP).map((k) => ({
        id: `${id}${k + 1}`,
        group: id,
        x: center.x + jitter(),
        y: center.y + jitter(),
        z: center.z + jitter()
    }))
);
```

The edges come from every pair of nodes, sorted by distance. Every node
links to its two nearest neighbors in its own cluster, and every two
clusters are joined by their two closest pairs, the dashed bridges. A node
that shows up in several picks gets each edge once, because a `Set` keeps
the pair objects unique:

```ts
const EDGES = [
    ...new Set([
        ...NODES.flatMap((node) =>
            PAIRS.filter((p) => p.includes(node) && p[0].group === p[1].group).slice(0, NEAREST)
        ),
        ...groups(
            PAIRS.filter(([a, b]) => a.group !== b.group),
            ([a, b]) => a.group + b.group
        ).flatMap(([, pairs]) => pairs.slice(0, BRIDGES))
    ])
];
```

## Two renderers, one set of settings

`points3D` draws the nodes and `lines3D`
the edges. An edge is a pair of the same node objects that `points3D` gets,
so as long as both renderers share their settings, an edge projects its
ends to the pixels of its two nodes. Both get the scale and the origin once:

```ts
const renderers = [nodes3d, edges3d];
for (const renderer of renderers) {
    renderer.scale(SCALE).origin(ORIGIN);
}
```

and every draw turns both by the same angles:

```ts
for (const renderer of renderers) {
    renderer.rotateY(dragYaw + START_YAW).rotateX(-dragPitch - START_TILT);
}
```

Leave one renderer out of either loop and the edges come loose from the
nodes as soon as the figure turns.

## Zoom is the scale

The zoom needs no state of its own. It is the scale of the renderers over
the scale they started with, and zooming sets a new scale on both:

```ts
function zoomTo(zoom) {
    const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
    for (const renderer of renderers) {
        renderer.scale(SCALE * clamped);
    }
    drawScene();
}
```

A pinch reads the current zoom back from a renderer and multiplies it:

```ts
zoomTo((nodes3d.scale() / SCALE) * Math.exp(-event.deltaY * ZOOM_SPEED));
```

The projection scales around the origin, so the figure zooms into its
center. The radius of a node is set in pixels, not in model units, so a
zoomed cluster spreads its nodes apart instead of growing them. Only a
pinch, which the browser reports as a wheel with ctrl held, zooms: a plain
wheel still scrolls the page.

## Depth order

The nodes are sorted back to front with
`sort`. The edges are drawn in a group under
them and are not sorted, so an edge never covers the node it ends on.

## Neighbors from an adjacency map

The neighbors of every node are collected once, from the edges:

```ts
const NEIGHBORS = new Map(NODES.map((node) => [node.id, new Set()]));
for (const [a, b] of EDGES) {
    NEIGHBORS.get(a.id).add(b.id);
    NEIGHBORS.get(b.id).add(a.id);
}
```

With a node selected, every element gets a class from it. The node and its
neighbors keep their look, the edges of the node come forward, and
everything else steps back:

```ts
function nodeState(d) {
    if (!selected || NEIGHBORS.get(selected.id).has(d.id)) {
        return null;
    }
    return d.id === selected.id ? 'is-selected' : 'is-dimmed';
}
```

## Filtering clusters

A hidden cluster takes its nodes out of the data, and an edge stays only
while both of its ends are shown. The bridges to a hidden cluster go with
it:

```ts
edges3d.data(EDGES.filter((edge) => edge.every(isShown)));
nodes3d.data(NODES.filter(isShown));
```

The joins are keyed by the node ids, so the nodes that stay keep their
elements. Hiding the cluster of the selected node clears the selection.

## A click is not a drag

The same pointer turns the figure and selects a node. A node is only a few
pixels wide, so the pointer does not have to hit it: it catches the shown
node nearest to it, within reach of `HIT_RADIUS`. The nodes come back
projected from every draw, so the search runs on the pixels the reader
sees:

```ts
function nodeAt(event) {
    const [x, y] = pointer(event, svg);
    const reach = (d) => Math.hypot(d.projected.x - x, d.projected.y - y);
    const node = least(shown, reach);
    return node && reach(node) <= HIT_RADIUS ? node : undefined;
}
```

On hover, the caught node and its edges light up, even when a selection has
dimmed them, so the reader sees what a click will pick. A click selects the
caught node, and a click with no node in reach clears the selection. A tap
on a touch screen has no hover before it, so the click runs its own search.
The drag of the figure swallows the click that ends a drag that moved, so
releasing a drag over a node does not select it.

The node list under the figure selects without a pointer. It always lists
the nodes that are shown and follows the clicks.

## The whole source

The figure lives in
[docs/examples/networkExplorer.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/networkExplorer.ts)
in the repository, styles included: it writes them into a `<style>`
element in the host, so there is no stylesheet to copy. The SVG and the
drag come from
[docs/examples/rotatingFigure.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/rotatingFigure.ts)
and the ends of the edges from
[docs/examples/segments.ts](https://github.com/niekes/d3-3d/blob/master/docs/examples/segments.ts).
The figure, ready to copy:

<<< @/examples/networkExplorer.ts
