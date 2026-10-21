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
| Isometric   | `iso3D()`        |

## Isometric scenes

`iso3D` draws an isometric scene. Where the other shapes project a polygon,
it hands out the **affine frame of a face**: the SVG matrix that carries the
local coordinates of the face onto the screen. Because the projection is
orthographic, the image of a plane stays affine, so the browser rasterises
the transform and the projection itself costs nothing at runtime.

```typescript
import { iso3D, sort } from 'd3-3d';

// The isometric view: the angles that map the world axes onto the 120
// degree screen axes.
const iso = iso3D()
    .rotateX(Math.atan(Math.SQRT2))
    .rotateZ(Math.PI / 4)
    .scale(Math.sqrt(1.5));

const boxes = iso.data([{ x: 0, y: 0, z: 0, w: 100, d: 80, h: 20, r: 6 }]);
```

| Method           | Returns                                            |
| ---------------- | -------------------------------------------------- |
| `.data(boxes)`   | The boxes with their `wall`, `top` and face frames |
| `.plane(spec)`   | The affine frame of a face: `{ matrix }`           |
| `.path(points)`  | The path of a 3D polyline                          |
| `.frame(points)` | The `viewBox` that frames a projected scene        |

A box is `{ x, y, z, w, d, h, r }`: the corner, the extent along the three
axes and the corner radius of its plan outline. The depth of a box is the
`z` of its rotated centre, so the boxes can be sorted with the same
`sort()` utility as every other shape.

See the [iso stack example](/examples/iso-stack) for a complete scene.

## Types

```typescript
import type { Point3D, Point2D, TransformedPoint } from 'd3-3d';
```
