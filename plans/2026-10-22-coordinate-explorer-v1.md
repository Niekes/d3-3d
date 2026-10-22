# Coordinate explorer example

## Objective

Add a docs example, "Coordinate explorer", at `/examples/coordinate-explorer`. Three labelled axes run from −3 to 3 and meet at the world origin, and one point floats among them.

- **Moving the point:** three sliders set its x, y and z.
- **A coordinate walk:** three coloured legs lead from the origin to the point, first along x, then along y, then along z. A faint box, with the origin and the point at opposite corners, shows the drop lines to the three axis planes.
- **Turning:** dragging turns the view, the arrow keys turn it in steps of 15°, and the scaffold button returns to the front view, where every angle is zero.
- **Flipping y:** a checkbox gives every renderer a y accessor that negates y, so that y points up.
- **Readout:** four rows for the point: the data, what the accessors read, the rotated point and the projected point, with the formula of the projection filled in.

The page teaches one idea, the coordinate frame of d3-3d, in three steps. The projection playground (`docs/examples/projection-playground.md`) shows the same numbers for the eight vertices of a cube under every setting. This page shows one point and the frame it lives in.

1. **x right, y down, z towards you.** At zero rotation:
   - x points right;
   - y points down, because the screen y grows downwards (`src/projection-perspective.ts:20`, which at the default distance of `Infinity` is the orthographic projection);
   - z points at the viewer: the view direction is the third row of the rotation matrix (`src/shapes/shape.ts:187`), which is 0, 0, 1 when every angle is zero.

   This frame is left-handed. In the front view the z axis has no length on the screen, because the projection drops z. The depth lives on only in the rotated z, which the `sort` utility reads. This is the main lesson.
2. **A coordinate is a walk.** The x, y and z of the point are the lengths of three legs, each parallel to its axis. The box of drop lines shows every value as an edge. It also shows how deep the point lies, which an orthographic view alone does not.
3. **Four numbers for one point.** `transform` reads the point through the accessors, rotates it and projects it (`src/transform.ts:17-30`).
   - **The accessors** are where a data frame becomes the frame of the library. Negating y makes y point up and the frame right-handed, which is what the scatter plot does with its data (`docs/examples/scatterPlot.ts:248-254`).
   - **The projected point** is the origin plus the scale times the rotated x and y.

Assumptions:

- **No library changes.** `camera3D`, `lines3D` and `points3D` are public.
- **One camera.** All renderers hang on one `camera3D` through `.camera` (`src/shapes/shape.ts:146`), as in the scatter plot (`docs/examples/scatterPlot.ts:246`). The rotation center is the world origin, the origin is the middle of the 960 × 500 view box at 480, 250, and the scale is 60.
- **No `pose`.** The figure does not use `pose` (`docs/examples/floorView.ts:20`). `pose` re-centers the pivot and clamps the tilt to the floor limits (`docs/examples/floorView.ts:12`), and this figure has no floor. It turns its camera through `turnCamera` (`docs/examples/rotatingFigure.ts:138`), as every figure does, with no limits, so the tilt is free.
- **Orthographic.** The figure never sets `perspective`, so the projected row is the origin plus the scale times the rotated x and y, and the z of lesson 1 really has no length in the front view. In perspective the projected row would also depend on the depth, which muddles "the projection drops z". The projection playground already shows that factor with a slider (`docs/examples/projection-playground.md:102-124`), and the page links to it.
- **The start view.** It is a three-quarter view, tuned so that all three positive half-axes show.
- **A front view at exactly zero.** The scaffold reports the total of every drag so far (`docs/examples/rotatingFigure.ts:31-32`) and has no reset. So the figure keeps its own yaw and pitch, and adds the change since the last report, as the floor-plan explorer does (`docs/examples/floorPlan.ts:306-317`). The keys add their steps to the same angles, and the front view sets both to zero, as `resetView` does (`docs/examples/floorPlan.ts:482-487`). The start view is the initial value of the angles, so `turnCamera` takes no start turn, and the front view lands on exactly zero.
- **Ranges.** The point stays within −3 and 3 on every axis, in steps of 0.1.
- **Shared rules.** All `AGENTS.md` rules apply. The styles live in the module, as in `docs/examples/splineEditor.ts`.

## Implementation Plan

- [ ] 1. Create `docs/examples/coordinateExplorer.ts`, which exports only `mountCoordinateExplorer` and returns a dispose function.
  - Mount it through `rotatingFigure` (`docs/examples/rotatingFigure.ts:155`) with the prefix `coord`, and relabel the button "front view".
  - Keep the state in one place: the point, the y flip, the yaw and pitch, and the last drag report.
  - One render function reads the state.

  Rationale: this is the house pattern of every rotating figure.

- [ ] 2. Hang every renderer on one `camera3D`, and give all of them the same y accessor.
  - **The renderers:**
    - `lines3D` for the axes, the ticks, the walk and the box;
    - `points3D` for the point and for the anchors of the labels.
  - **On each render:** call `turnCamera(camera, yaw, pitch)`, as the scatter plot turns its camera (`docs/examples/scatterPlot.ts:461`).
  - **On a change of the checkbox:** give every renderer the accessor that negates y, or the identity back.

  Rationale: the axes, the labels and the point must agree, and one camera with the same accessors on every renderer guarantees that.

- [ ] 3. Build the axes as world data, once.
  - **Axes:** three segments from −3 to 3.
  - **Ticks:** a short cross at every integer of every axis.
  - **Labels:** a label anchor at every integer except zero, and one at each positive end, labelled +x, +y and +z.

  Colour every axis with the colours of the projection playground (`docs/examples/projectionPlayground.ts:195-197`). Rationale: the labels are data too, so flipping y moves the +y label to the top without any special case.

- [ ] 4. Build the walk and the box from the point on each render.
  - **The walk:** three segments: from the origin to x, 0, 0, from there to x, y, 0, and from there to the point. Colour each by its axis.
  - **The box:** the twelve edges of the box between the origin and the point, faint and dashed.
  - **Zero-length legs:** skip them.

  Draw both with `placeSegments` (`docs/examples/segments.ts:8`). Rationale: this is lesson 2, and the box is the depth cue that an orthographic view needs.

- [ ] 5. Draw in this order: box, axes and ticks, walk, point, labels. Put each label as SVG text a few pixels off its projected anchor.
  Hide the tick labels of an axis whose projected length is under 20 px, so the front view does not pile the z labels onto the origin. Rationale: in this figure the paint order decides what stays readable, and the point and the labels have to stay on top.

- [ ] 6. Add the readout as a table of four rows: data, read by the accessors, rotated and projected.
  - Label the rotated z "depth, towards you".
  - Write the projection out with the current numbers, for example "projected x = 480 + 60 × rotated x".
  - Update the table on every render, drag frames included.

  Rationale: lesson 3 reads off this table. The values come from the point's own transformed datum, so the table cannot drift from the figure.

- [ ] 7. Make the scaffold button the front view.
  - It sets the yaw and the pitch to zero, so every angle becomes exactly zero.
  - It announces "front view: x right, y down, z towards you" in the live region, or "y up" when y is flipped.

- [ ] 8. Add keyboard turning on the focusable SVG, with a ring that shows only for keyboard focus (`docs/examples/splineEditor.ts:506`).
  - The left and right arrows turn the yaw by 15°, and the up and down arrows turn the pitch by 15°.
  - Home is the front view.

  The polite live region announces the angles and the projected position of the point. Attach the listener to the SVG only, and leave Cmd and Ctrl shortcuts alone (`docs/examples/splineEditor.ts:397`). The sliders and the checkbox are native controls and need no extra keys.

- [ ] 9. Add a controls row below the SVG: three sliders with outputs, the y-up checkbox, the readout table and the live region.
  - Write the inline style constant with the prefix `--ce-`, as `docs/examples/projectionPlayground.ts:185` does, with its `.dark` overrides (`docs/examples/projectionPlayground.ts:206`).
  - Give the table horizontal scrolling, as the playground does for its own (`docs/examples/projectionPlayground.ts:320-326`).
  - Stack the controls at phone width.

- [ ] 10. Write the page `docs/examples/coordinate-explorer.md`, with the mount block of `docs/examples/spline-editor.md` and one interaction line.
  - "Right, down and towards you": the frame and its handedness, with a pointer to the view direction;
  - "A coordinate is a walk";
  - "Four numbers for one point": the accessors, the flipped y and the scatter plot's accessors, and the formula of the projection;
  - a link to the projection playground for the rotation, the scale, the origin and the perspective;
  - "The whole source".

- [ ] 11. Register the page in the sidebar and in the gallery.
  - Add a sidebar entry "Coordinate explorer" in `docs/.vitepress/config.ts`, which sorts its list by name.
  - Add a bullet after the perspective street line (`docs/examples/index.md:21`), above the rotation order and rotation pivot bullets if they are already there. Name `lines3D`, `points3D` and `camera3D`.

- [ ] 12. Run the type, lint, docs-build and audit gates, and fix what they report.
  - Run `npm run typecheck`, `npm run lint` and `npm run docs:build`.
  - Run the project-pinned fallow audit through npx.

  Extract a shared helper only for a duplicate that fallow reports, for example the axis colours shared with the playground.

## Verification Criteria

- The gates pass, and `git diff --stat -- index.ts src tests` is empty.
- **Front view:** after the button, every angle is exactly zero. The rotated row equals the read row exactly, +x lies right of the origin and +y below it, and the z axis projects to the origin within 0.5 px.
- **Handedness:** in the front view with y flipped, +y lies above the origin and the read row shows the negated y.
- **The projection:** at three views, the projected row equals 480 + 60 × rotated x and 250 + 60 × rotated y to the shown precision, and the drawn point sits at those values within 0.5 px.
- **The walk:** at every view it ends on the point, and each leg runs parallel on the screen to its axis, within 1°.
- **Flipping y:** at any view, the x and z of the read row stay the same and its y changes sign. In the front view, the y values are also the only ones that change in the rotated and projected rows.
- **Two inputs, one point:** moving a slider while the view glides keeps the walk, the box and the point together.
- **Keyboard:** the arrows and Home work, and the live region announces the angles and the position.
- **Clean unmount:** after leaving the page mid-glide, the console shows no errors.
- **Themes and width:** light and dark themes are legible, and at 375 px nothing overlaps.

## Potential Risks and Mitigations

1. **Labels pile up when an axis points at the viewer.**
   Mitigation: step 5 hides the tick labels of an axis that is too short on the screen, and the page names the collapsed z axis as part of lesson 1.

2. **A running glide carries on after the front view button.** The glide keeps reporting, and its change since the last report turns the view away from zero again.
   Mitigation: accept it in the first version, since a glide ends within about two seconds. Exposing a stop on `dragRotate` would touch every rotating figure, so it belongs in its own commit.

3. **A free tilt turns the scene upside down, and the drag then feels reversed.**
   Mitigation: the front view button and Home always bring the frame back.

4. **Readers take the flipped y for a change in the library.**
   Mitigation: the readout keeps the data row and the read row apart, so the accessor visibly does the flip.

## Alternative Approaches

1. **A single-point mode in the projection playground:** no new page, but the playground is already dense, and its subject is the settings, not the frame.
2. **Dragging the point in 3D with `unproject`:** the spline editor already teaches that. The sliders keep this page on the frame.
3. **A perspective row in the readout:** shows the depth acting on the screen, but the projected point then depends on z, and the playground and the perspective street already teach that.
4. **A right-handed frame by default, with y flipped:** matches the textbooks, but hides how the library sees the data. The checkbox shows both.
