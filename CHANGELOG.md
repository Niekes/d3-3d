# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- `gridPlanes3D().data()` crashed in `ccw` with a `TypeError` when the
  number of points was not a multiple of `rows()`. It now throws a
  `RangeError` that says so.
- `lineStrips3D().data([[]])` threw on an empty strip. An empty strip now
  gets a `NaN` centroid, like `lines3D`. `draw()` of an empty line, line
  strip or polygon returns an empty path instead of throwing (lines and
  strips) or returning the invalid path `Z` (polygons).
- `perspective(0)` collapsed the scene onto the rotation center and a
  negative distance mirrored it, both silently. `perspective()` now throws
  a `RangeError` for a distance that is not positive.
- `sort` left the shapes unsorted when one of them had a `NaN` centroid, as
  an empty line, line strip or polygon has: `NaN` compared equal to every
  depth. A `NaN` centroid now sorts to the back.
- `cubes3D`, `planes3D` and `triangles3D` failed with a `TypeError` on a
  missing point when a shape had too few points, and `planes3D` and
  `triangles3D` drew only the first four or three points of a longer one.
  `data()` now throws a `RangeError` when a cube does not have eight points,
  a plane four or a triangle three.
- `iso3D().data()` always drew the sides of a box at `x + w` and `y + d`,
  the ones the standard isometric view sees. Turned any other way, for
  example with `.rotateZ()` or a shared `.camera()`, the wall showed the
  back of the box and `frontPlane` and `sidePlane` lay on hidden faces. They
  now follow `viewDirection()`. At the standard view the output is the same.
- `transform` and every shape's `data()` copied each point into a plain
  object. An array datum such as `[x, y, z]` came back as an object without
  `map` or `length`, and a class instance without its methods, though the
  types promised both. An array now stays an array and a class instance
  keeps its prototype; plain objects are copied as before.

## [2.4.2] - 2026-11-20

### Changed

- The README and the package description say what the library does first:
  3D charts and shapes for D3.js, projected to plain SVG or canvas. The
  sponsor section moved below the gallery and the install line. No change
  to the code.

## [2.4.1] - 2026-10-27

### Fixed

- `gridPlanes3D().rows(0)` returned the row length instead of the renderer,
  so the next call in a chain threw. `rows()` now only reads the row length
  when it is called without an argument, and throws a `RangeError` for a
  value that is not an integer of at least 1, which `data()` cannot divide by.

## [2.4.0] - 2026-10-23

### Added

- `axes3D().edges(spec)`: the four edges along every axis, with `sides`, the
  ends of the two other axes the edge runs at, and `chosen`, the edge
  `.axes(spec)` puts the axis on. A chart can draw every edge and fade an
  axis from one to the next. `.axes(spec)` returns the chosen ones, which
  now carry `sides` and `chosen` too.

### Fixed

- A camera level with the box keeps every axis on its edge. A wall seen
  exactly edge on faced the camera or not by rounding, so the axes flickered
  between the floor and the ceiling.

## [2.3.0] - 2026-10-23

### Added

- `sphere(spec, segments)`: the triangles of a sphere around a point, for
  `triangles3D`, wound so that `normal` points outwards and `ccw` tells the
  front from the back.

## [2.2.0] - 2026-10-22

### Added

- `camera3D`: a camera without data. Shapes share its view with
  `.camera(camera)`, so turning the camera turns them all, and its
  `.matrix()` serves a canvas or WebGL.
- `.viewDirection()` on every shape and camera: the unit vector towards the
  viewer, in world coordinates.
- `.matrix()` on every shape: the projection as a column-major 4×4 matrix.
  `projectPositions` projects packed x, y, z triples through it into a
  reusable `Float32Array`, and `.matrix({ width, height, depth })` maps to
  clip space for a WebGL uniform.
- `normal(polygon)`: the unit normal of a polygon, on the side `ccw`
  reports.
- `box(spec)`: the eight corners of a box in the order `cubes3D` expects.

- `axes3D`: the box of a 3D chart. `.data(spec)` returns the six walls with
  their gridlines and `ccw`, `.draw(wall)` their paths, and `.axes(spec)` the
  three axes on the outline of the box, with their ticks and the direction
  that points away from the box.
- `lathe(profile, segments)`: the triangles of a surface of revolution, every
  one wound to face outwards; a point of the profile on the axis closes it.
- `strips(points, size)`: a polyline cut into strips that share their ends,
  so every piece of a long line sorts on its own depth.
- `catmullRom(points, steps)`: the Catmull–Rom spline through 3D points.
- `axisSpec(scale, count)`: one axis of `axes3D` from a d3 scale.
- `.draw()` on `lines3D`.
- `axis` and `side` on the walls of `axes3D`.
- `topWidth` and `topDepth` on `box`, for tapered shafts, ridges and apexes.
- `.perspective(distance)` on every shape and camera, back after its removal
  in 2017 (#16): the distance of the eye from the rotation center. The
  default, `Infinity`, is the orthographic projection as before. `transform`,
  `.matrix()`, `projectPositions` and `.unproject()` follow it, and
  `perspective(point, options)` is the projection itself. `iso3D` stays
  orthographic.
- `iso3D`: isometric scenes of boxes. `.data(boxes)` returns the wall, the
  top and the frames of the faces of every box, with a `centroid` for
  `sort`; `.plane`, `.path`, `.project` and `.frame` place faces, paths and
  the view box of a scene.
- `.unproject(point, planePoint, planeNormal)` on every shape and camera:
  the world point on a plane under a screen point, or `null` when the plane
  is seen edge-on or lies behind the eye. It is what dragging along a floor
  needs.
- The documentation site, deployed to GitHub Pages: the guide, the API
  reference, a migration guide and 34 interactive examples. The README
  points to it.

### Changed

- `ccw` reads the winding of the `projected` points instead of the `rotated`
  ones, so that it holds in perspective. The result is the same for an
  orthographic projection.
- `Cube`: `faces` and `centroid` are no longer optional, since `cubes3D`
  always sets both. Code that reads them needs no `!` or `?.` any more; code
  that builds a `Cube` by hand has to set them.
- Path strings are rounded to three decimals, as `d3.pathRound` does. The
  difference is invisible and the paths get much shorter, but tests that
  compare paths character by character need updating.
- The rotation matrix is built once per `.data()` call instead of once per
  point.

### Fixed

- `draw` of `planes3D`, `polygons3D`, `triangles3D` and `lineStrips3D` is
  typed to take the transformed points that `.data()` returns, not raw
  points.
- Shapes keep the fields of their input arrays again, as in 1.x, and their
  types carry them (#44): `Object.assign(vertices, { color })` gives the
  triangle its `color`. This holds for `cubes3D`, `lines3D`,
  `lineStrips3D`, `planes3D`, `polygons3D` and `triangles3D`.

## [2.1.0] - 2026-10-21

### Changed

- Migrated the build to Vite+ 1.3.0 and `vp pack`.
- Moved the toolchain to TypeScript 7, Vite 8 and Vitest 5.

### Added

- `fallow` health badge, regenerated by CI on every push to `master`.

## [2.0.2] - 2026-01-23

### Fixed

- Fixed the module export so the package resolves correctly under ESM.

## [2.0.1] - 2026-01-20

### Fixed

- Stopped the build from stripping the type declarations from the bundle.

## [2.0.0] - 2026-01-16

The TypeScript rewrite.

### Added

- Every shape is a class-based renderer with a shared `ShapeRenderer` base and a
  `.data()` method.
- Generic data types: `triangles3D<Building>()` keeps your own properties on
  the transformed points.
- `centroid` and `ccw` are computed for every shape.
- `.rows()` on `gridPlanes3D` for grids that are not square.
- The utility functions `centroid`, `ccw`, `transform` and `orthographic` are
  part of the public API.

### Changed

- The API moved from calling the factory directly to `.data()`.
- Types are shipped with the package; `@types/d3-3d` is no longer needed.

### Removed

- The minified build is no longer published.

### Migration

```diff
- const triangles = triangles3D().scale(100);
- const result = triangles(data);
+ const renderer = triangles3D().scale(100);
+ const result = renderer.data(data);

  svg.selectAll('path')
    .data(result)
    .join('path')
    .attr('d', triangles.draw);
```

## [1.0.0] - 2024-01-15

### Changed

- **Breaking:** the factory is no longer callable. Use `.data(data)` instead of
  `triangles3D(data)`.

## [0.2.0] - 2023-12-20

### Added

- JSDoc comments across the source.
- GitHub Actions workflows for CI and publishing.

## [0.1.3] - 2023-11-02

### Added

- GitHub Actions workflows.
- Updated dependencies.

## [0.1.x] - 2021-03-21

### Added

- ES module imports in the browser.
- A published minified build.
- Test coverage reports on Codecov.

### Changed

- Restructured the test suite.

## [0.0.x] - 2017-2018

Initial releases. The first public version of d3-3d with points, lines, line
strips, triangles, planes, polygons and cubes, plus grid planes, centroid and
counter-clockwise detection and the `sort` utility.

[Unreleased]: https://github.com/Niekes/d3-3d/compare/v2.4.2...HEAD
[2.4.2]: https://github.com/Niekes/d3-3d/compare/v2.4.1...v2.4.2
[2.4.1]: https://github.com/Niekes/d3-3d/compare/v2.4.0...v2.4.1
[2.4.0]: https://github.com/Niekes/d3-3d/compare/v2.3.0...v2.4.0
[2.3.0]: https://github.com/Niekes/d3-3d/compare/v2.2.0...v2.3.0
[2.2.0]: https://github.com/Niekes/d3-3d/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/Niekes/d3-3d/compare/v2.0.2...v2.1.0
[2.0.2]: https://github.com/Niekes/d3-3d/compare/v2.0.1...v2.0.2
[2.0.1]: https://github.com/Niekes/d3-3d/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/Niekes/d3-3d/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/Niekes/d3-3d/compare/v.0.2.0...v1.0.0
[0.2.0]: https://github.com/Niekes/d3-3d/compare/0.1.3...v.0.2.0
[0.1.3]: https://github.com/Niekes/d3-3d/compare/0.1.2...0.1.3
[0.1.x]: https://github.com/Niekes/d3-3d/compare/0.0.14...0.1.3
[0.0.x]: https://github.com/Niekes/d3-3d/releases
