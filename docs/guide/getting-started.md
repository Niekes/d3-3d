# Getting Started

**d3-3d** is meant for 3D visualizations. It allows the projection of 3D data onto the screen in the web browser and is designed to work with [d3.js](https://d3js.org/).

It uses the [browser's coordinate system](https://www.w3.org/TR/css-transforms-1/#transform-rendering) and an [orthographic projection](https://en.wikipedia.org/wiki/Orthographic_projection), or with `.perspective()` a perspective one. It computes the centroid of every shape and the orientation of every polygon, so you can sort and cull them in SVG, which has no 3D of its own.

## Installing

```bash
npm install d3-3d
```

You can also download the [latest release](https://github.com/Niekes/d3-3d/releases) or use [unpkg](https://unpkg.com/d3-3d/):

```html
<script src="https://unpkg.com/d3-3d/build/d3-3d.js"></script>

<!-- A specific version -->
<script src="https://unpkg.com/d3-3d@version/build/d3-3d.js"></script>
```

**TypeScript users:** type definitions are included, there is no `@types/d3-3d` to install.

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
  lines3D,
} from "d3-3d";

// The camera that several shapes, a canvas or WebGL can share
import { camera3D } from "d3-3d";

// Utility function for sorting
import { sort } from "d3-3d";

// TypeScript types
import type { Point3D, Point2D, TransformedPoint } from "d3-3d";
```

## Basic Example

```typescript
import { triangles3D, sort } from "d3-3d";

const data3D = [
  [
    { x: 0, y: -1, z: 0 },
    { x: -1, y: 1, z: 0 },
    { x: 1, y: 1, z: 0 },
  ],
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

const svg = d3.select("svg");
svg
  .selectAll("path")
  .data(transformedData)
  .join("path")
  .attr("d", renderer.draw)
  .attr("fill", "steelblue");
```

## Your own data

Every shape is generic over its datum. Give it accessors for your fields and
the result keeps them, typed:

```typescript
import { triangles3D, sort } from "d3-3d";

interface Sample {
  lat: number;
  lng: number;
  height: number;
  color: string;
}

const renderer = triangles3D<Sample>()
  .x((d) => d.lng)
  .y((d) => -d.height) // up is -y, as on the screen
  .z((d) => d.lat)
  .scale(50)
  .origin({ x: 400, y: 300 });

const mesh: Sample[][] = [
  [
    { lat: 0, lng: 0, height: 1, color: "#ff6b6b" },
    { lat: 1, lng: 0, height: 2, color: "#4ecdc4" },
    { lat: 0, lng: 1, height: 3, color: "#45b7d1" },
  ],
];

const transformed = renderer.data(mesh);

transformed[0][0].color; // ✓ string
transformed[0].centroid; // ✓ Point3D
transformed[0].ccw; // ✓ boolean

svg
  .selectAll("path")
  .data(transformed.sort(sort))
  .join("path")
  .attr("d", renderer.draw)
  .attr("fill", (d) => d[0].color);
```

### Data on a shape

A field that belongs to the whole shape, not to one of its points, goes on
the array of the shape. `.data` keeps it, typed, on the shape it returns:

```typescript
const shapes = [
  { color: "steelblue", vertices: [/* three points */] },
  { color: "tomato", vertices: [/* three points */] },
];

const renderer = triangles3D();
const triangles = renderer.data(
  shapes.map((shape) => Object.assign(shape.vertices, { color: shape.color })),
);

svg
  .selectAll("path")
  .data(triangles.sort(sort))
  .join("path")
  .attr("d", renderer.draw)
  .attr("fill", (d) => d.color); // ✓ string
```

This works for `lines3D`, `lineStrips3D`, `triangles3D`, `planes3D`,
`polygons3D` and `cubes3D`. A field with the name of a computed one, such as
`centroid` or `ccw`, is overwritten by the shape.

Next: the [API reference](/api/) and the [examples](/examples/).
