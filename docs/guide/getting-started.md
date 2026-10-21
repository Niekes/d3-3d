# Getting Started

**d3-3d** is meant for 3D visualizations. It allows the projection of 3D data onto the screen in the web browser and is designed to work with [d3.js](https://d3js.org/).

## Installing

```bash
npm install d3-3d
```

You can also download the [latest release](https://github.com/Niekes/d3-3d/releases) or use [unpkg](https://unpkg.com/d3-3d/):

```html
<script src="https://unpkg.com/d3-3d/build/d3-3d.js"></script>
```

**TypeScript users:** type definitions are included automatically.

## Import

ES6 / TypeScript:

```typescript
import {
    triangles3D,
    cubes3D,
    gridPlanes3D,
    points3D,
    lineStrips3D,
    polygons3D,
    planes3D,
    lines3D
} from 'd3-3d';

// Utility function for sorting
import { sort } from 'd3-3d';

// TypeScript types
import type { Point3D, Point2D, TransformedPoint } from 'd3-3d';
```

## Basic Example

```typescript
import { triangles3D, sort } from 'd3-3d';

const data3D = [
    [
        { x: 0, y: -1, z: 0 },
        { x: -1, y: 1, z: 0 },
        { x: 1, y: 1, z: 0 }
    ]
];

const renderer = triangles3D()
    .scale(100)
    .origin({ x: 480, y: 250 })
    .rotateY(Math.PI / 4);

const transformedData = renderer.data(data3D);

// Each transformed triangle includes:
// - rotated: { x, y, z }
// - projected: { x, y }
// - centroid: { x, y, z }
// - ccw: boolean

const svg = d3.select('svg');
svg.selectAll('path')
    .data(transformedData)
    .enter()
    .append('path')
    .attr('d', (d) => d.draw());
```
