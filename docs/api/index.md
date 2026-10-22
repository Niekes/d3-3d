---
outline: [2, 3]
---

# API Reference

> **Note:** All shapes (`points3D`, `lines3D`, `lineStrips3D`, `triangles3D`, `planes3D`, `polygons3D`, `gridPlanes3D`, `cubes3D`) share the same API. The methods below work for all shape types.

## Shapes

Every factory returns a shape. Its `.data` takes your points and returns them
transformed: each point keeps its fields and gains `rotated` and `projected`,
and each shape gains a `centroid`.

### `points3D()` {#points3d}

Points. `.data` takes a list of points and returns one point per datum.

### `lines3D()` {#lines3d}

Lines. `.data` takes a list of point pairs and returns one line per pair.

### `lineStrips3D()` {#linestrips3d}

Line strips. `.data` takes a list of point lists and returns one open
polyline per list.

### `triangles3D()` {#triangles3d}

Triangles. `.data` takes a list of three point lists and returns one
triangle per list, with `ccw` set when it faces the camera.

### `planes3D()` {#planes3d}

Planes. `.data` takes a list of four point lists and returns one plane per
list, with `ccw`.

### `polygons3D()` {#polygons3d}

Polygons. `.data` takes a list of point lists of any length and returns one
closed polygon per list, with `ccw`.

### `gridPlanes3D()` {#gridplanes3d}

Grid planes. `.data` takes a flat list of points, `.rows` points per row, and
returns one quad per grid cell, with `ccw`.

### `cubes3D()` {#cubes3d}

Cubes. `.data` takes a list of eight point lists and returns one cube per
list, with its six `faces`: `front`, `back`, `left`, `right`, `top` and
`bottom`, each with `ccw`.

## Core Methods

### `.data(data)` {#data}

Transform and compute properties for your data.

### `.draw(shape)` {#draw}

Draw the SVG path for a shape. Not on `points3D` and `lines3D`.

### `.unproject(point, planePoint, planeNormal)` {#unproject}

The world point on a plane under a screen point, or `null` when the plane is
seen edge-on.

### `.matrix()` {#matrix}

The projection as a column-major 4×4 `Float32Array`, for a WebGL uniform or
for `projectPositions`. It maps a world point to its screen x and y, and its
`rotated` z as the depth. Given `{ width, height, depth }`, it maps to clip
space instead, ready for `gl_Position`.

### `.camera(camera)` {#camera}

Share the view of a `camera3D()` or another shape: turning, scaling or
moving either changes both. Call it before the other setters, the shape gives
up the view it had.

### `.viewDirection()` {#viewdirection}

The direction from the scene towards the viewer, a unit vector in world
coordinates: which side of a box shows, which end of a grid is near, the
normal of a plane that faces the camera.

## Configuration Methods

Every setter returns the shape, so the calls chain. Called without an
argument, it returns the current value.

### `.x(accessor)` {#x}

Set the x accessor.

### `.y(accessor)` {#y}

Set the y accessor.

### `.z(accessor)` {#z}

Set the z accessor.

### `.scale(scale)` {#scale}

Set the scale for the projected points.

### `.rotateX(angle)` {#rotatex}

Set the angle for the x rotation.

### `.rotateY(angle)` {#rotatey}

Set the angle for the y rotation.

### `.rotateZ(angle)` {#rotatez}

Set the angle for the z rotation.

### `.rotationCenter(point)` {#rotationcenter}

Set the rotation center.

### `.origin(origin)` {#origin}

Set the 2D rendering origin.

### `.rows(rows)` {#rows}

Set the points per row (`gridPlanes3D` only).

## Utility Functions

### `sort(a, b)` {#sort}

Sort shapes by depth (painter's algorithm): a comparator for anything with a
`centroid`.

### `ccw(polygon)` {#ccw}

Whether a transformed polygon winds counter-clockwise, which means it faces
the camera.

### `centroid(polygon)` {#centroid}

The mean of the rotated points of a transformed polygon.

### `transform(data, options)` {#transform}

Rotate and project a list of points: what `.data` does under the hood.

### `orthographic(point, options)` {#orthographic}

Project a rotated point onto the screen: `{ origin, scale }` in, `Point2D`
out.

### `projectPositions(positions, matrix, out?)` {#projectpositions}

Project packed x, y, z triples through a `.matrix()` into a `Float32Array` of
screen x, screen y and depth. Reuse `out` to redraw a large point cloud on a
canvas without allocating.

### `normal(polygon)` {#normal}

The unit normal of a polygon, on the side `ccw` reports: outwards on the
faces of `cubes3D`, along `viewDirection` where a face faces the camera.

### `box(spec)` {#box}

The eight corners of a box in the order `cubes3D` expects, standing on
`{ x, y, z }` with its `width`, `depth` and `height`, upwards towards -y.

## Isometric scenes

### `iso3D()` {#iso3d}

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

A box is `{ x, y, z, w, d, h, r }`: the corner, the extent along the three
axes and the corner radius of its plan outline. The depth of a box is the
`z` of its rotated centre, so the boxes can be sorted with the same
`sort()` utility as every other shape.

See the [office tower example](/examples/iso-tower) for a complete scene.

### `.data(boxes)` {#iso-data}

The boxes with their `wall`, `top` and face frames.

### `.plane(spec)` {#iso-plane}

The affine frame of a face: `{ matrix }`.

### `.path(points)` {#iso-path}

The path of a 3D polyline.

### `.project(points)` {#iso-project}

The screen coordinates of 3D points.

### `.frame(points)` {#iso-frame}

The `viewBox` that frames a projected scene.

## Axes

### `axes3D()` {#axes3d}

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

See the [scatter plot](/examples/scatter-plot) for a complete chart.

### `.data(spec)` {#axes-data}

The six walls, `x` lo and hi, `y` lo and hi, `z` lo and hi, with `ccw`,
`centroid` and `grid`.

### `.draw(wall)` {#axes-draw}

The path of a wall: its outline and its gridlines.

### `.axes(spec)` {#axes-axes}

The three axes `x`, `y`, `z`, each a list of ticks with its `axis` and
`normal`.

## Types

```typescript
import type { Point3D, Point2D, TransformedPoint } from 'd3-3d';
```

### `Point3D` {#point3d}

```typescript
type Point3D = { x: number; y: number; z: number };
```

### `Point2D` {#point2d}

```typescript
type Point2D = { x: number; y: number };
```

### `TransformedPoint` {#transformedpoint}

A datum after `.data`: your fields plus the rotated and the projected point.

```typescript
type TransformedPoint<T> = T & { rotated: Point3D; projected: Point2D };
```

### `AxesSpec` {#axesspec}

The three axes of a chart box, the input of `axes3D`.

```typescript
interface AxesSpec {
    x: AxisSpec;
    y: AxisSpec;
    z: AxisSpec;
}
```

### `AxisSpec` {#axisspec}

One axis in data units: its extent, from the first to the last value of
`domain`, and the values of its ticks.

```typescript
interface AxisSpec {
    domain: number[];
    ticks: number[];
}
```

### `IsoBoxSpec` {#isoboxspec}

An axis aligned box in world space, the input of `iso3D`.

```typescript
interface IsoBoxSpec {
    x: number;
    y: number;
    z: number;
    w: number;
    d: number;
    h: number;
    r?: number;
}
```

### `IsoPlaneSpec` {#isoplanespec}

A rectangle in world space: its corner and the two vectors that span it.

```typescript
interface IsoPlaneSpec {
    origin: Point3D;
    u: Point3D;
    v: Point3D;
}
```
