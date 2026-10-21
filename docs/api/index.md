# API Reference

> **Note:** All shapes (`points3D`, `lines3D`, `lineStrips3D`, `triangles3D`, `planes3D`, `polygons3D`, `gridPlanes3D`, `cubes3D`) share the same API. The methods below work for all shape types.

## Core Methods

- `.data(data)` — transform and compute properties for your data.
- `.draw()` — draw the SVG path for a shape.

## Configuration Methods

- `.x(accessor)` — set the x accessor.
- `.y(accessor)` — set the y accessor.
- `.z(accessor)` — set the z accessor.
- `.scale(scale)` — set the scale for the projected points.
- `.rotateX(angle)` — set the angle for the x rotation.
- `.rotateY(angle)` — set the angle for the y rotation.
- `.rotateZ(angle)` — set the angle for the z rotation.
- `.rotationCenter(point)` — set the rotation center.
- `.origin(origin)` — set the 2D rendering origin.
- `.rows(rows)` — set the points per row (`gridPlanes3D` only).

## Utility Functions

- `sort(a, b)` — utility function to sort shapes by depth (painter's algorithm).

## Shapes

| Shape       | Factory          |
| ----------- | ---------------- |
| Points      | `points3D()`     |
| Lines       | `lines3D()`      |
| Line strips | `lineStrips3D()` |
| Triangles   | `triangles3D()`  |
| Planes      | `planes3D()`     |
| Polygons    | `polygons3D()`   |
| Grid planes | `gridPlanes3D()` |
| Cubes       | `cubes3D()`      |

## Types

```typescript
import type { Point3D, Point2D, TransformedPoint } from 'd3-3d';
```
