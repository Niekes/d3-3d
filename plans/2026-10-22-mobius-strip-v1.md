# Möbius strip example

## Objective

Add a docs example, "Möbius strip", at `/examples/mobius-strip`. A strip of triangles drawn with `triangles3D` turns in the view, lit by a headlight that sits at the camera.

- **Half-twists:** a slider sets the twists of the strip from 0 to 5. An odd count gives a strip with one side, an even count a band with two, and 0 a flat ring.
- **Walker:** a dot with an arrow along the surface normal walks the centre line. On a Möbius strip it comes back after one lap upside down, and only a second lap brings it home.
- **Edge:** the boundary of the strip is drawn as a line. A Möbius strip has one edge and a band has two, and the readout counts them.
- **Winding:** a "show winding" checkbox paints every triangle by its `ccw` flag. On a band each side keeps one color; on a Möbius strip the colors swap across a seam.
- **Rotating:** dragging the figure rotates the scene with the shared glide.
- **Keyboard:** the walker, the twists and the playback also work from the keyboard.

The page teaches three things:

1. **Lighting a surface that has one side.** A face is lit by the cosine between its normal and the direction towards the viewer. `normal` returns the unit normal of a triangle and `viewDirection` the direction towards the viewer (`src/normal.ts:15`, `src/shapes/shape.ts:180`). The absolute value of their dot product lights a face alike from both sides, which a surface with one side needs. This is the main lesson.
2. **Winding is a choice the mesh makes.** Every triangle is wound in the order of its parameters, so `ccw` tells which of its sides faces the camera. With an odd count of half-twists no winding is consistent all the way round, and the seam shows where the parameters wrap.
3. **Two laps to come home.** The walker's arrow is the `normal` of a tiny triangle in the same parameter order as the mesh, so it follows the surface without a jump, and after one lap it points the other way.

Assumptions:

- **No library changes.** `triangles3D`, `lineStrips3D`, `lines3D`, `points3D`, `camera3D`, `sort`, `normal` and `strips` are public, see `index.ts:23` for `normal`.
- **The surface.** With the centre radius R = 1, the half-width w = 0.35 and k half-twists, u runs around from 0 to 2π and v across from −w to w. A point is x = (R + v · cos(ku / 2)) · cos u, y = v · sin(ku / 2), z = (R + v · cos(ku / 2)) · sin u. For an odd k, the point at u + 2π and v is the point at u and −v: that is the one side, in one line.
- **The mesh.** 96 steps around and 4 across, two triangles per quad: 768 triangles, about a third of the 2200 the solar system draws.
- **The view.** Scale 170, with the origin in the middle of the 960 × 500 view box, turned through `turnCamera` from a starting yaw and tilt, as the mesh inspector does at `docs/examples/meshInspector.ts:146`.
- **Orthographic.** The camera keeps the default perspective of `Infinity`, so `viewDirection` is the direction towards the viewer for every face. In perspective it differs per face: from the face to the eye, which sits at the rotation center plus the distance times `viewDirection` (`src/shapes/shape.ts:176-178`). The headlight would take that direction instead, as `src/normal.ts:10-11` notes. `ccw` holds in both projections.
- **Shared rules.** All `AGENTS.md` rules apply. The styles live in the module, as in `docs/examples/splineEditor.ts:455`.

## Implementation Plan

- [ ] 1. Create `docs/examples/mobiusStrip.ts`, which exports only `mountMobiusStrip`, taking the host and returning a dispose function.
  - Mount it through `rotatingFigure` at `docs/examples/rotatingFigure.ts:155` with the prefix `mobius`.
  - Hang the four renderers on one `camera3D`, as the scatter plot does at `docs/examples/scatterPlot.ts:246`, so one turn moves the strip, the edge and the walker together.
  - Turn the camera with `turnCamera` from `docs/examples/rotatingFigure.ts:138` on every drag report.
  - Keep the state in one place: the half-twists, the walker's parameter s, the winding flag, the yaw and the pitch. One render function reads the state.

  Rationale: this is the house pattern of every rotating figure.

- [ ] 2. Build the mesh as a function of k, rebuilt only when the slider changes.
  - Sample the surface from the assumptions on a grid of 97 × 5 parameter pairs, with the last column at u = 2π.
  - Emit two triangles per quad in parameter order: from (i, j) to (i + 1, j) to (i + 1, j + 1), and from (i, j) to (i + 1, j + 1) to (i, j + 1).
  - Compute the `normal` of every model-space triangle once per mesh.

  Rationale: the parameter order is the winding, which step 3 and the page rely on. For an odd k, the last column lies on the first with v reversed, which is the seam.

- [ ] 3. Light every triangle with the headlight on each render: read the camera's view direction and take the absolute dot product with the triangle's normal.
  - The brightness is AMBIENT + (1 − AMBIENT) times that absolute dot product, with AMBIENT at 0.25.
  - With the winding off, one ramp from dark to the strip color gives the fill.
  - With the winding on, triangles with `ccw` set take one ramp and the others a second one, like the two ramps at `docs/examples/meshInspector.ts:51`.

  Stamp the id and the fill on the projected triangles, as `docs/examples/solarSystem.ts:150` does. Rationale: the absolute value is the main lesson, and the ramps make the seam visible.

- [ ] 4. Paint everything in one painter's list: join the triangles keyed by their id, as `docs/examples/solarSystem.ts:153-158` does, then sort them together with the edge pieces, the arrow and the dot, as `docs/examples/meshInspector.ts:199` does.
  - Keep every face visible. The solar system hides the faces that turn away at `docs/examples/solarSystem.ts:157`, but a strip with one side has no back to hide.
  - Cut the edge with `strips` into pieces of 6 samples that share their end points, as the solar system cuts its orbits at `docs/examples/solarSystem.ts:110`, so every piece sorts by its own centroid.
  - Lift the walker's dot by 0.02 along its arrow, so it sorts on its own side of the surface and hides while it walks underneath.

  Rationale: one long edge strip has one centroid, and it would be painted wrongly half of the time.

- [ ] 5. Draw the edge with `lineStrips3D`, at 192 samples per lap.
  - **Odd k:** one loop at v = w, for u from 0 to 4π.
  - **Even k:** two loops, at v = w and at v = −w, for u from 0 to 2π each.

  The readout says "one side, one edge" or "two sides, two edges". Rationale: the count of edges is the quickest proof of one side that a reader can see.

- [ ] 6. Walk the walker along the centre line, with s from 0 to 4π that wraps around.
  - **Position:** the surface at u = s and v = 0, with u not wrapped, so the formula stays continuous across 2π.
  - **Arrow:** the `normal` of the tiny triangle through the surface at (s, 0), at (s + ε, 0) and at (s, ε), with ε = 0.001, scaled to 0.3. Draw it with `lines3D` and `placeSegments` from `docs/examples/segments.ts:8`.
  - **Orientation:** the walker is upside down when the dot product of its arrow with the arrow at s minus the full laps is negative.
  - **Playback:** turn the scaffold button into play and pause with `playback` at `docs/examples/rotatingFigure.ts:181`, at one lap every 8 seconds.

  The readout names the lap and whether the walker is upside down. Rationale: the flip the reader sees belongs to the surface, not to a wrap in the code.

- [ ] 7. Add a controls row below the SVG.
  - A half-twists slider from 0 to 5 with its value.
  - A "show winding" checkbox.
  - A readout with the sides and edges, the lap and the orientation.
  - A polite live region for the keys.

  Write the inline style constant with the prefix `--mo-`, the dark-mode overrides under the `dark` class, the edge and arrow strokes and stacking at phone width, following `docs/examples/splineEditor.ts:455`.

- [ ] 8. Add keyboard control on the focusable SVG, with a ring that shows only for keyboard focus.
  - The left and right arrow keys move the walker by a 48th of a lap.
  - Space plays and pauses, and plus and minus change the half-twists.
  - The W key switches the winding colors.
  - Cmd and Ctrl keep their browser shortcuts, as `docs/examples/splineEditor.ts:397` does.

  The live region announces the lap and the orientation, or the new count of sides and edges. Attach the listener to the SVG only.

- [ ] 9. Respect reduced motion and clean up after the figure.
  - With `prefers-reduced-motion`, start paused at s = 2π, where the walker on a Möbius strip has just come back upside down, as `docs/examples/solarSystem.ts:177` starts paused.
  - The dispose function stops the playback and empties the host.

- [ ] 10. Write the page `docs/examples/mobius-strip.md` with the mount block of `docs/examples/spline-editor.md:1-23`, an interaction line, and these sections, each with a short excerpt:
  - "A strip of triangles": the formula and the parameter order;
  - "Lit from either side": the absolute dot product of `normal` and `viewDirection`;
  - "The seam": what the winding colors show;
  - "Two laps to come home": the walker;
  - "One edge": the boundary;
  - "The whole source".

- [ ] 11. Register the page in the sidebar and the gallery.
  - Add the sidebar entry "Möbius strip" to the example list of `docs/.vitepress/config.ts`, which sorts the entries by name at `docs/.vitepress/config.ts:100`.
  - Add a bullet after the mesh inspector line at `docs/examples/index.md:23`, naming `triangles3D`, `lineStrips3D`, `normal` and `viewDirection`.

- [ ] 12. Run the type, lint, docs-build and audit gates, and fix what they report.
  - Run `npm run typecheck`, `npm run lint` and `npm run docs:build`.
  - Run the project-pinned fallow audit through npx.

  Extract a shared helper only for a duplicate that fallow reports.

## Verification Criteria

- The gates pass, and `git diff --stat -- index.ts src tests` is empty.
- **Lighting:** with the winding off, the brightness does not jump across the seam at any rotation, and a face seen head-on is as bright from either side.
- **Winding:** with 2 half-twists each side keeps one color at every rotation. With 1 half-twist a single seam runs across the strip at u = 0, where the colors swap.
- **Walker:** with 1 half-twist the arrow points the other way after one lap and back after two, and the readout agrees. With 2 half-twists it points the same way after one lap.
- **Edges:** the readout says one edge for an odd count and two for an even one, and every edge closes without a gap.
- **Painting:** the walker hides behind the strip when it walks on the far side, and at the starting view and three other rotations no edge piece is painted over a face in front of it.
- **Frame time:** a drag frame with 768 triangles stays under 16 ms on a laptop.
- **Keyboard:** the arrows, Space, plus, minus and W work, and the live region announces the change.
- **Clean unmount:** no console errors and no running timer after leaving the page mid-walk or mid-glide.
- **Themes and width:** light and dark themes are legible, and at 375 px nothing overlaps.

## Potential Risks and Mitigations

1. **The centroid sort paints a triangle over a closer one where the strip passes close to itself.**
   Mitigation: the half-width of 0.35 and at most 5 half-twists keep the strip clear of itself, and the small triangles keep a wrong pair small. If an artifact remains, accept it and mention it on the page; the depth buffer is listed under alternatives.

2. **A triangle seen edge-on has a dot product near zero and paints as a black sliver.**
   Mitigation: the ambient floor of 0.25 from step 3 keeps every face visible.

3. **The arrow of the tiny triangle is noisy.**
   Mitigation: `normal` normalizes its result, and an ε of 0.001 stays far above the float error. Check that the arrow at s = 0 is perpendicular to the centre line within 0.01.

4. **Rebuilding the mesh on every slider event stutters.**
   Mitigation: 768 triangles take well under a millisecond to build, and the mesh is rebuilt only when k changes.

## Alternative Approaches

1. **An analytic normal from the partial derivatives:** exact, but it repeats what `normal` already does, and it can disagree in sign with the mesh winding.
2. **Darker back faces, like `docs/examples/surfaceFigure.ts:68`:** familiar, but on a surface with one side it shows a seam that is not a property of the shape.
3. **WebGL with a depth buffer:** exact occlusion, but it hides the painter's list that the other SVG examples teach.
4. **A perspective camera:** the strip would read deeper, but the headlight would need one direction per face towards the eye, and the lesson on one side is the same in both projections.
