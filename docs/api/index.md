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
| Axes        | `axes3D()`       |

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

| Method             | Returns                                            |
| ------------------ | -------------------------------------------------- |
| `.data(boxes)`     | The boxes with their `wall`, `top` and face frames |
| `.plane(spec)`     | The affine frame of a face: `{ matrix }`           |
| `.path(points)`    | The path of a 3D polyline                          |
| `.project(points)` | The screen coordinates of 3D points                |
| `.frame(points)`   | The `viewBox` that frames a projected scene        |

A box is `{ x, y, z, w, d, h, r }`: the corner, the extent along the three
axes and the corner radius of its plan outline. The depth of a box is the
`z` of its rotated centre, so the boxes can be sorted with the same
`sort()` utility as every other shape.

See the [iso stack example](/examples/iso-stack) for a complete scene.

## Axes

`axes3D` draws the box of a 3D chart: six walls with gridlines and three
axes with their ticks. It works in data units: hand it the domain and the
ticks of every axis, and give it the same accessors as the shapes it
frames, so the box and the data turn as one.

```typescript
import { axes3D } from 'd3-3d';
import { scaleLinear } from 'd3';

// Every axis spans the box from -1 to 1.
const x = scaleLinear().domain([0, 10]).range([-1, 1]).nice();
const y = scaleLinear().domain([0, 4]).range([-1, 1]).nice();
const z = scaleLinear().domain([-2, 2]).range([-1, 1]).nice();

const box = axes3D()
    .scale(100)
    .origin({ x: 480, y: 250 })
    .x((d) => x(d.x))
    .y((d) => -z(d.z)) // data z is up, the screen y grows downwards
    .z((d) => y(d.y));

const spec = {
    x: { domain: x.domain(), ticks: x.ticks(5) },
    y: { domain: y.domain(), ticks: y.ticks(5) },
    z: { domain: z.domain(), ticks: z.ticks(5) }
};

// The walls behind the data, with their gridlines.
svg.selectAll('path.wall')
    .data(box.data(spec).filter((wall) => !wall.ccw))
    .join('path')
    .attr('class', 'wall')
    .attr('d', box.draw);

// The tick labels of the three axes, pushed away from the box.
const ticks = box.axes(spec).flatMap((edge) => edge.map((tick) => ({ tick, edge })));

svg.selectAll('text.tick')
    .data(ticks)
    .join('text')
    .attr('class', 'tick')
    .attr('x', (d) => d.tick.projected.x + d.edge.normal.x * 10)
    .attr('y', (d) => d.tick.projected.y + d.edge.normal.y * 10)
    .attr('text-anchor', (d) =>
        d.edge.normal.x > 0.3 ? 'start' : d.edge.normal.x < -0.3 ? 'end' : 'middle'
    )
    .text((d) => d.tick[d.edge.axis]);
```

| Method        | Returns                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------ |
| `.data(spec)` | The six walls, `x` lo and hi, `y` lo and hi, `z` lo and hi, with `ccw`, `centroid`, `grid` |
| `.draw(wall)` | The path of a wall: its outline and its gridlines                                          |
| `.axes(spec)` | The three axes `x`, `y`, `z`, each a list of ticks with its `axis` and `normal`            |

A spec holds one `{ domain, ticks }` per axis. A wall is the list of its
four corners. It has `ccw` set when it faces the camera, so the walls
behind the data are the ones without it. `axes3D` winds the corners for the
accessors, so this holds whatever the accessors and the domains: a negated
axis or a reversed domain mirrors the box, and the winding follows.

An axis lies on an edge between a wall that faces the camera and one that
does not, so it runs along the outline of the box, outside the data, and
the edges below the box come first, then the ones left of it. Every tick
keeps its value under the axis key, `tick[edge.axis]`, and `normal` is the
unit screen vector away from the box, square to the edge.

See the [scatter explorer](/examples/scatter-explorer) for a complete chart.

## Types

```typescript
import type { Point3D, Point2D, TransformedPoint } from 'd3-3d';
```
