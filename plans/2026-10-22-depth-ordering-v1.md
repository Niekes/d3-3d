# Depth-ordering lab example

## Objective

Add a docs example, "Depth-ordering lab", at `/examples/depth-ordering`. A small scene of overlapping faces is painted back to front by a strategy the reader picks, and every pair of faces that the strategy paints in the wrong order is marked on the screen.

- **Scenes:** four scenes, each built to break something.
  - "Wall and cube": a long wall that slants in depth, with a small cube in front of its far end. The centroid order fails.
  - "Ramp and tile": a long ramp that recedes, with a small tile tucked under its near end. The farthest-vertex order fails.
  - "Three sticks": three long, thin planes in a pinwheel, each lying over the next and under the previous one. No order of whole faces is right.
  - "Crossing planes": two planes that cut through each other. No order is right, because each one is in front for half of the overlap.
- **Strategies:**
  - data order, as the faces are listed;
  - centroid, which is the library's `sort`;
  - farthest vertex;
  - nearest vertex;
  - "by overlap", which orders the faces by what they cover where they overlap.
- **Projection:** a toggle switches between the orthographic view and a perspective with the eye a fixed distance in front of the pivot.
- **Marks:** the overlap of every pair painted in the wrong order is outlined in red. The overlap of a pair that crosses is hatched in amber. A cycle is named in the readout.
- **Rotate:** dragging the figure rotates the scene with the shared glide. Every frame orders the faces anew and tests them anew.
- **Paint order:** a toggle writes the paint index on every face.
- **Readout:** names the strategy and counts the overlapping pairs, the wrong ones and the crossing ones, and says whether there is a cycle.

The page teaches four things:

1. **The library sorts by one number per face.** `sort` (`src/sort.ts:7`) compares the depth of the centroids, and `centroid` (`src/centroid.ts:3`) is the mean of the rotated vertices. One number cannot describe a face that spans a range of depths. This is the main lesson.
2. **Which way is near.** The rotated depth grows towards the viewer (`src/shapes/shape.ts:172`), so an ascending `sort` paints the far faces first. The area chart relies on this (`docs/examples/areaChart.ts:276`). In perspective the eye sits on the rotated z axis, so the rotated z is still the depth along the line of sight and the same sort applies, as the perspective street explains (`docs/examples/perspective-street.md:68`). What changes is the overlaps: faces near the eye grow, so a scene can fail in one projection and not in the other.
3. **The truth at a pixel.** Where two faces overlap on screen, `unproject` (`src/shapes/shape.ts:159`) finds the point of each face's plane under a screen point. The dot product of that point with the view direction says which face is nearer there. The lab uses this as its ground truth.
4. **Where ordering ends.** An order of whole faces exists only if the "covers" relation has no cycle and no pair crosses. Otherwise faces have to be split, or a depth buffer has to decide per pixel, as WebGL does in the bar field (`docs/examples/barField.ts:227`). The area chart shows the other way out: geometry built so that planes separate it, which gives an exact order (`docs/examples/areaChart.ts:9`).

Assumptions:

- **No library changes.** `planes3D`, `cubes3D`, `camera3D`, `sort`, `normal`, `unproject` and `viewDirection` are public.
- **One camera.** Both renderers hang on one `camera3D` through `camera` (`src/shapes/shape.ts:146`), as in `docs/examples/scatterPlot.ts:246`. So `unproject` and `viewDirection` are asked of the camera.
- **World points survive the transform.** Every transformed vertex keeps the input x, y and z, because `transform` spreads the datum (`src/transform.ts:33`). So the normal of a face is `normal` (`src/normal.ts:15`) of its vertices in world space.
- **Faces.** The free planes are quads drawn with `planes3D` and seen from both sides, with a darker fill on the back. The cube comes from `cubes3D` with `box` (`src/box.ts:15`), and only its faces whose `ccw` holds take part, as in `joinFaces` (`docs/examples/cubeFaces.ts:10`). All projections of the faces are convex, because the faces are flat and convex and a projective map keeps straight lines straight, in perspective as long as the faces lie in front of the eye.
- **Perspective.** The toggle sets `perspective` (`src/shapes/shape.ts:88`) to four times the radius of the largest scene, so every face lies in front of the eye. The ground truth of step 4 holds in both projections: both hits of a sample lie on one ray through the eye, and the rotated z orders the points of such a ray. The cube's back faces are culled with `ccw`, which reads the projected winding and is right in both projections. A test with `normal` and `viewDirection` is right only in the orthographic view (`src/normal.ts:9-11`).
- **Sizes.** The scenes hold at most 12 faces, so testing every pair costs at most 66 tests per frame.
- **Shared rules.** All `AGENTS.md` rules apply. The styles live in the module, as in `docs/examples/voxelBuilder.ts:439`.

## Implementation Plan

- [ ] 1. Create `docs/examples/depthOrdering.ts`, which exports only `mountDepthOrdering`, returning a dispose function. Mount it through `rotatingFigure` (`docs/examples/rotatingFigure.ts:155`) with the prefix `depth`, and relabel the button "reset".
  - Keep the state in one place: the scene, the strategy, the projection, the paint-order toggle, yaw and pitch.
  - Add the change since the last report of the scaffold to yaw and pitch, as `docs/examples/floorPlan.ts:306` does, so that the keys and the reset can set the angles too. Turn the camera with `turnCamera` (`docs/examples/rotatingFigure.ts:138`), from the scene's starting yaw and tilt.
  - One render function reads the state.

  Rationale: this is the house pattern of every rotating figure, and the floor plan's delta lets "reset" restore the starting view.

- [ ] 2. Describe the four scenes as data: a name, the free quads with an id and a color each, an optional cube spec for `box`, a starting yaw and pitch, and one sentence on what the scene breaks.
  - Tune the geometry until, at the starting view, each scene breaks the strategy it names and "by overlap" is right for the first two.
  - The pinwheel of the three sticks needs no tuning beyond its heights: each stick rises along its length, so it lies over the next stick at one crossing and under the previous one at the other.

  Rationale: one scene per failure keeps every lesson visible without a search for a bad angle.

- [ ] 3. Project the faces on every render.
  - Set the camera's `perspective` from the projection toggle: the distance from the assumptions, or `Infinity`.
  - Run the free quads through `planes3D` and the cube through `cubes3D`, and keep the cube faces whose `ccw` holds, which is right in both projections.
  - Merge both into one list of faces, each with its id, its color, its projected outline, its world vertices and its `centroid`.
  - Order the list by the chosen strategy, back to front:
    - data order: unchanged;
    - centroid: `sort`;
    - farthest vertex: ascending by the smallest rotated z;
    - nearest vertex: ascending by the largest rotated z;
    - by overlap: the order from step 5.

  Rationale: the four simple strategies differ only in the number they compare, which is the point the page makes.

- [ ] 4. Test every pair of faces where it overlaps on screen.
  - Clip the two projected outlines against each other, a few lines of convex clipping. Skip the pair when d3 `polygonArea` of the overlap is below one square pixel.
  - Take five sample points: d3 `polygonCentroid` of the overlap, and its vertices pulled a fifth of the way towards that centroid. More samples are listed under alternatives.
  - At each sample, unproject the sample onto the plane of each face, through the face's first world vertex with its normal from `normal`. Compare the two hits by their dot product with the camera's `viewDirection`. In perspective `unproject` casts the ray from the eye, and the comparison still holds. Skip a sample where either plane is edge-on and `unproject` returns null.
  - If every sample puts the same face in front, the pair has a winner. If the samples disagree, the pair crosses.
  - A pair is wrong when the chosen order paints its loser after its winner.

  Rationale: the test is independent of every strategy and uses only public API, so it can judge all of them fairly.

- [ ] 5. Build the "by overlap" order from the winners of step 4, with a depth-first topological sort that paints a face after every face it covers. When the sort meets a cycle, keep the centroid order for the faces in the cycle and report the cycle. A crossing pair adds no edge. Rationale: this is Newell's ordering without the split, so it is right exactly where an order of whole faces exists, which is the limit the page teaches.

- [ ] 6. Draw the scene in three groups, in this order: faces, marks, paint-order labels.
  - Draw the faces as one path each with the renderer's draw method, joined by id and reordered with selection order after the strategy.
  - Draw the marks as plain 2D paths of the overlap polygons, already in screen coordinates, with no pointer events: a red outline for a wrong pair and an amber hatch for a crossing pair.
  - Draw the paint-order labels at the mean of each face's projected vertices, showing the index in the paint order. They are hidden unless the toggle is on.

  Rationale: the marks sit above every face, so a wrong pair stays visible even where the wrong face covers it.

- [ ] 7. Add a controls row below the SVG:
  - a scene picker;
  - a strategy radio group;
  - a projection radio pair, "orthographic" and "perspective";
  - a "paint order" checkbox;
  - a readout with the counts and the cycle flag;
  - a polite live region.

  Write the inline style constant with the prefix `--do-`, its dark-mode overrides under the dark class, the face, mark and label styles, the hatch pattern, and stacking at phone width. Follow `docs/examples/voxelBuilder.ts:439`.

- [ ] 8. Add keyboard control on the focusable SVG, with a ring that shows only for keyboard focus, as `docs/examples/voxelBuilder.ts:493` does.
  - The arrow keys turn the view by 5 degrees.
  - The keys 1 to 5 pick a strategy.
  - The left and right bracket keys pick the previous or next scene.
  - O toggles the paint order, P the projection, and R resets the view.

  The live region announces the strategy and the counts after each key. Attach the listener to the SVG only, and leave keys with Ctrl, Meta or Alt to the browser, as `docs/examples/floorPlan.ts:606` does. Nothing animates apart from the scaffold's glide, which already respects reduced motion (`docs/examples/rotatingFigure.ts:48`).

- [ ] 9. Write the page `docs/examples/depth-ordering.md` with the mount block of `docs/examples/voxel-builder.md`, an interaction line, and these sections:
  - "One number per face": `sort` and `centroid`;
  - "Near is a larger z": the sign, with a pointer to `viewDirection`, and why it holds in perspective too, linking the perspective street;
  - "Asking the pixel": the overlap test with `unproject`;
  - "Cycles and crossings": why splitting faces or a depth buffer is the only fix, linking the bar field and the area chart, and the packing playground once it exists, which splits its boxes into unit cubes;
  - "The whole source".

- [ ] 10. Register the page in the sidebar and the gallery:
  - a sidebar entry "Depth-ordering lab" in `docs/.vitepress/config.ts`, which sorts the list by name;
  - a bullet in `docs/examples/index.md` after the perspective street line (`docs/examples/index.md:21`), naming `planes3D`, `cubes3D`, `sort`, `unproject` and `perspective`.

- [ ] 11. Run the type, lint, docs-build and audit gates, and fix what they report:
  - `npm run typecheck`, `npm run lint` and `npm run docs:build`;
  - the project-pinned fallow audit through npx.

  Extract a shared helper only for a duplicate that fallow reports.

## Verification Criteria

- The gates pass, and `git diff --stat -- index.ts src tests` is empty.
- **Ground truth:** in "Wall and cube" at the starting view, step 4 names the cube as the winner of its pair with the wall. After turning the scene by 180 degrees, it names the wall. This also proves the sign of the depth.
- **Each scene breaks its strategy:** at the starting view, "Wall and cube" shows at least one wrong pair with centroid and none with "by overlap". "Ramp and tile" shows at least one wrong pair with farthest vertex and none with "by overlap".
- **Limits:** "Three sticks" reports a cycle, and at least one wrong pair, with every strategy. "Crossing planes" reports a crossing pair with every strategy.
- **Perspective:** with the toggle on, step 4 still names the cube as the winner in "Wall and cube" at the starting view, the cube shows no back face, and at least one scene changes its count of wrong pairs between the two projections.
- **Rotation:** the marks follow the faces during a drag and a glide, and the counts update every frame.
- **Frame time:** a frame of the largest scene, with projection, ordering and pair tests, stays under 4 ms on a laptop.
- **Keyboard:** the arrows, the digits, the brackets, O and R work, and the live region announces the counts.
- **Clean unmount:** no console errors after leaving the page mid-glide.
- **Themes and width:** light and dark themes are legible, the red and amber marks are distinct in both, and at 375 px nothing overlaps.

## Potential Risks and Mitigations

1. **The sign of the depth is read backwards**, so every verdict flips.
   Mitigation: take the sign from the doc comment of `viewDirection` (`src/shapes/shape.ts:172`) and check it with the ground-truth criterion before writing the strategies.

2. **Five samples miss a thin crossing**, so a crossing pair is reported as having a winner.
   Mitigation: the "Crossing planes" scene crosses through the middle of the overlap, where the centroid sample sits. Accept the rare miss on other scenes and note it on the page.

3. **A face seen edge-on makes `unproject` return null at every sample.**
   Mitigation: skip such a pair for that frame. An edge-on face covers no area, so the overlap area test usually skips it first.

4. **The tuned scenes stop failing at other angles**, which may look like a bug.
   Mitigation: the page says that a failure depends on the view, and "reset" returns to the starting angle of the scene.

5. **A face reaches behind the eye in perspective**, and its projected outline flips.
   Mitigation: the distance is four times the radius of the largest scene and stays fixed, so no rotation brings a face near the eye. `unproject` returns null for a hit behind the eye, and step 4 already skips such a sample.

## Alternative Approaches

1. **A per-pixel depth test on a canvas:** exact ground truth everywhere, but it needs a rasteriser and leaves the SVG and the library's draw methods behind.
2. **Splitting faces with a BSP tree:** shows the full fix for cycles and crossings, at the cost of a longer page and geometry that changes on every frame.
3. **A grid of samples over the overlap:** catches thin crossings, at a few times the cost of five samples.
