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
    - title: Orthographic and perspective projection
      details: Projects 3D data onto 2D SVG, a canvas or WebGL, orthographic or in perspective.
    - title: Sorting utilities
      details: Built-in sort for correct z-ordering (painter's algorithm).
---

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { mountAreaChart } from './examples/areaChart';

const host = ref(null);
let dispose;

onMounted(() => {
    if (host.value) dispose = mountAreaChart(host.value);
});

onBeforeUnmount(() => {
    if (dispose) dispose();
});
</script>

<div ref="host" class="area-chart"></div>

Drag the figure to rotate it, press the button to sample new share prices.
[How the figure is built](/examples/area-chart).
