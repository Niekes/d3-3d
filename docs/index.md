---
layout: home
hero:
    name: d3-3d
    text: 3D visualizations for the web
    tagline: A D3.js plugin for projecting 3D data onto the screen — with first-class TypeScript support.
    actions:
        - theme: brand
          text: Get Started
          link: /guide/getting-started
        - theme: alt
          text: View on GitHub
          link: https://github.com/niekes/d3-3d
features:
    - title: First-class TypeScript
      details: Full type definitions ship with the package. No @types needed.
    - title: Automatic centroids
      details: Every transformed shape includes centroid, ccw, rotated and projected properties.
    - title: Orthographic projection
      details: Projects 3D data onto 2D SVG using orthographic projection.
    - title: Sorting utilities
      details: Built-in sort for correct z-ordering (painter's algorithm).
---

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { mountSurfacePlot } from './examples/surfacePlot';

const host = ref(null);
let dispose;

onMounted(() => {
    if (host.value) dispose = mountSurfacePlot(host.value);
});

onBeforeUnmount(() => {
    if (dispose) dispose();
});
</script>

<div ref="host" class="surface-plot"></div>

Drag the surface to rotate it, hover a quad to read its sample.
[How the figure is built](/examples/surface-plot).
