# Examples

## In the documentation

- [Surface plot](/examples/surface-plot) — a ripple or a wave drawn with `gridPlanes3D`, with shape, amplitude, frequency, color and wireframe controls
- [Terrain sculptor](/examples/terrain-sculptor) — a field of 32 × 32 samples drawn with `gridPlanes3D` that a brush raises and lowers; the brush lands on the hill under the pointer through `unproject`, and its ring is a `lineStrips3D`
- [Area chart](/examples/area-chart) — two series as hatched ribbons in a box, drawn with `polygons3D` and `axes3D`, that morph into new samples; the faces are painted in an exact order that follows from the planes separating them
- [Bar chart](/examples/bar-chart) — fifteen bars drawn with `cubes3D`, rotated by drag
- [Data-update stress test](/examples/data-update) — up to 36 labelled cubes drawn with `cubes3D` and labels with `points3D`, added, removed, shuffled and moved through a keyed join; the enter, update and exit sets flash in their own colors, and a toggle keys the join by id or by index
- [Sorting sculpture](/examples/sorting-sculpture) — 24 columns in a ring, built with `box` and drawn with `cubes3D`, that bubble sort, insertion sort or quick sort put in order one comparison or swap at a time; the columns are keyed by their value and painted by their footprint with `sort`
- [Bar field](/examples/bar-field) — a height map of up to 40,000 bars, projected by `.matrix()` and drawn on a 2D canvas in grid order or with WebGL instances and a depth buffer
- [Exploded cube assembly](/examples/exploded-cubes) — a block of 64 cubes drawn with `cubes3D`, whose layers part on a slider; click a cube to inspect it
- [Voxel builder](/examples/voxel-builder) — an 8 × 8 floor to build on with `cubes3D`, drawn with `planes3D` and `lines3D`; the cell under the pointer comes from `unproject`, and the faces that touch are never drawn
- [Cellular automaton](/examples/cellular-automaton) — a 12 × 12 × 12 grid of cells on a floor drawn with `planes3D` and `lines3D`, every live cell a `box` drawn with `cubes3D`; three rules count the 26 neighbors of every cell, the cubes keep their elements from one generation to the next, and only the surface is drawn
- [Mini city](/examples/mini-city) — sixteen low-poly buildings drawn with `cubes3D`, each piece a box, a tapered shaft, a gable roof or a spire, lit by a sun that a slider moves across the sky; click a building to see its stats
- [Floor-plan explorer](/examples/floor-plan) — four floors drawn with `planes3D`, their rooms with `polygons3D` and labels with `points3D`, colored by occupancy; spread the floors on a slider and select a floor or a room
- [Scatter plot](/examples/scatter-plot) — six datasets in a box with gridlines, colored and sized by value, drawn with `axes3D`, `points3D` and `lines3D`
- [Point cloud](/examples/point-cloud) — a spiral galaxy of up to a million stars, projected by `.matrix()` and drawn on a 2D canvas with `projectPositions` or with WebGL
- [Pixel space](/examples/pixel-space) — the pixels of _The Starry Night_, up to 160,000, morph from the painting into a relief, the RGB cube and the HSL cylinder on a 2D canvas; a depth and an index buffer find the pixel under the pointer, and a click picks its color in every layout
- [Particle text morph](/examples/particle-text-morph) — 1500 particles drawn with `points3D` form a word or a shape and fly into the next one; type your own text, and a hidden canvas turns its pixels into points
- [Trajectory explorer](/examples/trajectory-explorer) — three paths through the Lorenz attractor with moving markers and fading trails, drawn with `lineStrips3D`, `points3D` and `axes3D`
- [Space-time cube](/examples/space-time-cube) — one day of four people above the map of a town, their paths drawn with `lineStrips3D`, the plane of the time slider with `planes3D`, where everyone is with `points3D` and the hours with `axes3D`; the plane cuts the scene in two, and the half on the side of the eye is painted over it, in perspective too
- [Spline editor](/examples/spline-editor) — a curve through six points above a floor, drawn with `lineStrips3D`, its points and their shadows with `points3D` and the floor and drop lines with `lines3D`; a drag moves a point in the plane that faces the camera through `unproject`, Shift only up and Alt only across the floor
- [Network explorer](/examples/network-explorer) — 45 nodes in three clusters, drawn with `points3D` and `lines3D`; click a node to highlight its neighbors, filter the clusters
- [Projection playground](/examples/projection-playground) — rotation, scale, origin and rotation center of one cube, with the renderer call and its vertices beside the SVG and twelve presets from isometric to a corner pivot
- [Perspective street](/examples/perspective-street) — sixteen houses along a street seen through `.perspective()`, drawn with `cubes3D` and `planes3D`; a dolly zoom moves the eye, and a toggle shows why `ccw` and not the view direction tells the faces that show
- [Coordinate explorer](/examples/coordinate-explorer) — one point among three axes from −3 to 3, drawn with `lines3D` and `points3D` on one `camera3D`; sliders place it, a walk along x, y and z and a box of drop lines lead to it, and a checkbox flips y up through the accessors
- [Depth-ordering lab](/examples/depth-ordering) — four small scenes of `planes3D` quads and a `cubes3D` cube, each built to break an order of whole faces; every pair of faces is tested where it overlaps through `.unproject()`, and the pairs that `sort` or another order paints the wrong way round are outlined, with and without `.perspective()`
- [Rotation order](/examples/rotation-order) — two copies of a block of five cubes, built with `box` and drawn with `cubes3D` and their own axes with `lines3D`, turned by the same three angles: the renderer turns one around z, y and x, a chain of three `transform` calls turns the other in an order you pick, from quarter turns to gimbal lock
- [Solar system](/examples/solar-system) — the sun, eight planets and the moon, 2200 triangles in one `triangles3D`, lit by the sun and animated with a d3 timer
- [Mesh inspector](/examples/mesh-inspector) — a vase of triangles drawn with `triangles3D` and its normals with `lines3D`; toggle the faces, edges, normals and back faces, click a face to inspect it
- [Möbius strip](/examples/mobius-strip) — a strip of 768 triangles drawn with `triangles3D` and its edge with `lineStrips3D`, lit from either side by the absolute cosine between `normal` and `viewDirection`; a walker comes back from one lap upside down, and a slider sets the half-twists from 0 to 5
- [Office tower](/examples/iso-tower) — 24 floors of a city block, drawn with `iso3D`

The office tower is inspired by
[isoglow.dev](https://isoglow.dev/), an isometric gallery of small machines
and cities by April Zhu.
The scatter plot recreates the
[3D scatter plot of matterviz](https://matterviz.janosh.dev/plot/scatter-plot-3d)
by Janosh Riebesell.
The area chart recreates the
[multi-series 3D area chart with hatch fill of AnyChart](https://www.anychart.com/products/anychart/gallery/3D_Area_Charts/Multi-Series_3D_Area_Chart_with_HatchFill.php).

## On CodePen

Live examples are available on [CodePen](https://codepen.io/Niekes/). A selection:

- [Surface plot](https://codepen.io/Niekes/pen/YzBmYzR)
- [Scatter plot](https://codepen.io/Niekes/pen/poGMpLw)
- [Bar chart](https://codepen.io/Niekes/pen/poGMKXY)
- [Sphere](https://codepen.io/Niekes/pen/KKEPBVb)
- [Cone](https://codepen.io/Niekes/pen/wvbzGMG)
- [Cylinder](https://codepen.io/Niekes/pen/eYadJVg)

## Embedding in your project

Include the UMD bundle via unpkg:

```html
<script src="https://unpkg.com/d3-3d/build/d3-3d.js"></script>
```
