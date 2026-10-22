# Rotation order example

## Objective

Add a docs example, "Rotation order", at `/examples/rotation-order`. Two copies of the same asymmetric block of five unit cubes stand side by side, and both are turned by the same three angles. A renderer turns the left copy in the library's order. The right copy turns in an order the reader picks.

- **Angles:** three sliders, in degrees, set the x, y and z angles of both copies.
- **Order:** a radio group picks one of the six orders for the right copy.
- **Presets:** the default, "quarter turns", "small angles", "gimbal lock" and "the library's order".
- **Play:** plays the three turns one after another on both sides, each side in its own order.
- **Own axes:** each copy carries its own x, y and z axes, which turn with it. A fixed gizmo in the corner shows the world axes.
- **Readout:** the code of each side, and the largest distance between matching vertices of the two copies. Zero means both copies are in the same pose.

The page teaches one idea, the order of the three turns, in three steps. The projection playground says that the order matters (`docs/examples/projection-playground.md:71-72`). This page shows how much it matters.

1. **Turns do not commute.** The same three angles in a different order give a different pose. Quarter turns differ the most. Small angles nearly agree, because two turns commute up to terms of second order in their angles. This is the main lesson.
2. **The library's order is one chain of three turns.** The renderer turns a point around z first, then around y, then around x, all around world axes through the rotation center (`src/rotation.ts:8-9`). The matrix is written R = Rx · Ry · Rz and read from right to left. Any order can be built from three `transform` calls, each with one angle set, where every call reads the `rotated` field of the one before through its accessors. Chained as z, y, x, the two copies match exactly, which shows that the renderer does nothing more than that.
3. **Fixed axes or own axes.** Turning around z, then around the world y, then around the world x is the same as turning around the copy's own x, then its own y, then its own z.
   - **In the library's order,** the x slider always tips the copy towards you around the horizontal axis of the screen. The z slider spins the copy around its own z axis, wherever that axis points.
   - **Every rotating figure** feels like a turntable for the same reason: `turnCamera` sets the yaw with `rotateY` and the tilt with `rotateX` (`docs/examples/rotatingFigure.ts:146`), so the tilt comes last, around the horizontal axis of the screen.
   - **Gimbal lock:** at a y angle of 90°, the copy's own z axis lies on the world x axis, and the x and z sliders turn the copy the same way.

Assumptions:

- **No library changes.** `box`, `transform`, `cubes3D`, `lines3D` and `sort` are public, and so is the `TransformOptions` type, through the export of `src/types`.
- **Orthographic.** Neither renderer sets `perspective`, and the stages leave it out of their options, which `transform` reads as `Infinity` (`src/transform.ts:29`). The front view then shows the pose without any foreshortening.
- **The chain.** For an order a, b, c:
  - the first `transform` sets only angle a, with the others at zero;
  - the second reads the first one's `rotated` through its x, y and z accessors and sets only angle b;
  - the third does the same with angle c.

  Every stage uses the same rotation center. A rotation with two angles at zero is a turn around the remaining axis alone (`src/rotation.ts:14`). So the chain applies Rc · Rb · Ra to p − c and adds c back. The scale and the origin of these stages are irrelevant, and their projected values are not used.
- **Why the accessors see the previous stage.** `transform` spreads the datum into its result (`src/transform.ts:32-36`). A stage's accessors therefore read the previous stage's `rotated`, and the stage's own result replaces it.
- **The right copy's renderer.** It has all three angles at zero and accessors that read `rotated`. At zero the rotation is the identity, so the renderer only projects.
- **Front view.** Nothing else turns the copies: world x points right, y points down and z points at the viewer, as in the front preset of the projection playground (`docs/examples/projectionPlayground.ts:83-87`).
- **Degrees.** The sliders run in whole degrees from −180 to 180, and the figure converts them to radians with π/180, so 90 is exactly a quarter turn. The playground's step of 0.01 radians cannot hit π/2.
- **The block.** A column of three unit cubes, with one more cube towards +x at the top and one towards +z in the middle. No turn maps the block onto itself; with the +z cube at the bottom, a half turn around the diagonal between +x and +z would swap the two ends. Every face gets a colour by its face name, so its pose reads even in a front view.
- **Rotation center.** It is the middle of the block for both copies, so both copies turn in place.
- **Shared rules.** All `AGENTS.md` rules apply. The styles live in the module, as in `docs/examples/projectionPlayground.ts:185`.

## Implementation Plan

- [ ] 1. Create `docs/examples/rotationOrder.ts`, which exports only `mountRotationOrder` and returns a dispose function.
  - Lay it out like the projection playground (`docs/examples/projectionPlayground.ts:407-441`).
  - **Two panels**, each with an SVG with a 480 × 400 view box, a heading and its code.
  - **Below the panels**, a form with the presets, a note line that is a polite live region, the three sliders, the order radios and a play button.

  The figure does not use `rotatingFigure`, because only the sliders set the angles. Rationale: a drag would add a fourth rotation and muddle the lesson.

- [ ] 2. Build the block once: five unit cubes from `box` (`src/box.ts:15`), as the voxel builder builds its cubes (`docs/examples/voxelBuilder.ts:118`), without the faces where two cubes touch.
  - Drop the touching faces as the voxel builder's `isOpen` does (`docs/examples/voxelBuilder.ts:198`).
  - The own axes are three segments from the middle of the block, each 2.5 long.

  Rationale: unit cubes on a grid with no inner faces are what the voxel builder already paints correctly by centroid.

- [ ] 3. Turn the left copy with its own `cubes3D` and `lines3D`, with the angles from the sliders in radians and a shared scale, origin and rotation center.
  - Draw the cube groups sorted with `sort` and their faces with `joinFaces` (`docs/examples/cubeFaces.ts:10`), as at `docs/examples/voxelBuilder.ts:226-244`.
  - Draw the axes with `placeSegments` (`docs/examples/segments.ts:8`).

- [ ] 4. Turn the right copy with a module-local helper that chains three single-axis `transform` calls.
  - The helper takes the points, an order and the angles, and returns the points of the last stage, as described in the assumptions.
  - A second `cubes3D` and `lines3D`, with all angles at zero and accessors that read `rotated`, project the result.

  Rationale: this is lesson 2. The chain uses the library's own turns, so the page proves the library's order instead of restating it.

- [ ] 5. Draw both panels with one draw function that takes a panel and its two renderers. The sides then differ only in how their points were turned.
  - A fixed gizmo in a corner of each SVG shows the world axes: an arrow for x to the right, an arrow for y down, and a dot for z towards the viewer.

- [ ] 6. Fill the readout of each panel.
  - **The left panel:** shows the renderer call with its three angles.
  - **The right panel:** shows the chain in its order, and the matrix product read from right to left, for example R = Rz · Ry · Rx for the order x, y, z.
  - **The difference line:** the largest distance between matching rotated vertices of the two copies, to two decimals. It says "the same pose" below 1e-9.

- [ ] 7. Add the presets as slider values with a note each, the way the playground does (`docs/examples/projectionPlayground.ts:581-590`).
  - **The default:** x −30, y 40, z 20, with the order x, y, z on the right.
  - **Quarter turns:** x 90, y 90, z 0.
  - **Small angles:** 5° on every axis.
  - **Gimbal lock:** y 90. Its note asks the reader to move x and z.
  - **The library's order:** the right order set to z, y, x, where the distance drops to zero.

- [ ] 8. Play the three turns in sequence on both sides, each turn eased over about 600 ms.
  - **The right side:** its chain grows its first angle from zero, then its second, then its third.
  - **The left side:** the renderer does the same in its own order, z, then y, then x, by setting only the angles reached so far. With x and y at zero, the rotation is a turn around z alone.
  - **Reduced motion:** with prefers-reduced-motion, each click on play shows the next stage without easing.
  - **Stopping:** moving a slider, picking a preset or unmounting stops the play.

- [ ] 9. Keep every control native, so the arrow keys move the sliders and the order radios.
  - The live region announces the preset, and whether the poses agree when the order or an angle changes.
  - The presets and the play button get a visible focus ring.

- [ ] 10. Write the inline style constant with the prefix `--ro-`, with its `.dark` overrides (`docs/examples/projectionPlayground.ts:206`).
  - Put the panels side by side, and stack them at phone width with the auto-fit grid of `docs/examples/projectionPlayground.ts:220-223`.
  - Give six face colours by face name, and the axis colours of `docs/examples/projectionPlayground.ts:195-197`.
  - Style the world gizmo.

- [ ] 11. Write the page `docs/examples/rotation-order.md`, with the frontmatter and mount block of `docs/examples/projection-playground.md`.
  - one interaction line;
  - "Three turns, two results": the quarter turns and the small angles;
  - "One order is built in": an excerpt of the chain and a pointer to `rotationMatrix` (`src/rotation.ts:14`);
  - "Fixed axes and own axes": the turntable and gimbal lock;
  - a link to the projection playground;
  - "The whole source".

- [ ] 12. Register the page in the sidebar and in the gallery.
  - Add a sidebar entry "Rotation order" in `docs/.vitepress/config.ts`, which sorts its list by name.
  - Add a bullet after the perspective street line (`docs/examples/index.md:21`), below the coordinate explorer bullet and above the rotation pivot bullet if they are already there. Name `cubes3D`, `box`, `lines3D` and `transform`.

- [ ] 13. Run the type, lint, docs-build and audit gates, and fix what they report.
  - Run `npm run typecheck`, `npm run lint` and `npm run docs:build`.
  - Run the project-pinned fallow audit through npx.

  Extract a shared helper only for a duplicate that fallow reports, for example the slider form or the axis colours shared with the playground.

## Verification Criteria

- The gates pass, and `git diff --stat -- index.ts src tests` is empty.
- **The library's order, reproduced:** with the right order set to z, y, x, run a console check over 20 random triples of angles between −180° and 180°. Every vertex of the right copy matches the left copy in `rotated` and in `projected` within 1e-9, the faces paint in the same order, and the readout says "the same pose".
- **Orders differ:** at the quarter-turn preset with the order x, y, z, the distance is more than 1 unit, and a different face of the block points at the viewer.
- **Small angles nearly commute:** at 5° on every axis, the distance stays below 0.1 units for each of the five other orders.
- **Fixed axes:** in the library's order, moving only the x slider leaves the rotated x of every vertex of the left copy unchanged within 1e-9. Moving only the z slider leaves the left copy's own z axis where it is.
- **Gimbal lock:** at y 90 in the library's order, x 30 with z 0 and x 0 with z 30 give the same left copy within 1e-9.
- **Play:** each side passes through its stages in its own order and ends exactly on the static pose of the sliders.
- **Keyboard:** every control works from the keyboard, and the live region announces the preset and the agreement.
- **Clean unmount:** after leaving the page mid-play, the console shows no errors and no timer keeps firing.
- **Themes and width:** light and dark themes are legible, and at 375 px the panels stack and nothing overlaps.

## Potential Risks and Mitigations

1. **Painting by centroid puts a face of the block in the wrong order at some angles.**
   Mitigation: unit cubes on a grid, without inner faces, sorted by cube and then by face, as the voxel builder does. Check the quarter-turn and gimbal presets by eye.

2. **Readers confuse the written product with the order the turns happen in.**
   Mitigation: each panel shows both the order and the product, and the page explains reading from right to left.

3. **A stage of the chain uses a different rotation center, and the copies drift apart.**
   Mitigation: one constant serves as the center of every stage and both renderers. The z, y, x criterion catches any drift at once.

4. **Rounding makes "the same pose" flicker.**
   Mitigation: the readout compares against 1e-9, far above the rounding of three turns and far below a visible difference.

5. **The gimbal check depends on an exact quarter turn.**
   Mitigation: whole degrees convert to π/2 exactly. The remaining rounding of the cosine of π/2 stays far below 1e-9.

## Alternative Approaches

1. **An order option in the library, such as a rotation-order setter:** makes the chain unnecessary, but it is an API for a docs lesson, and `unproject`, `matrix` and `viewDirection` would all have to follow it.
2. **Composing 3 × 3 matrices in the docs code:** shorter, but it bypasses the library, so the page would no longer prove the library's order.
3. **A drag-rotated view of both copies:** a camera turn is a fourth rotation in the chain and muddles the lesson. The front view keeps the three turns the only ones.
