# 3D spline editor example

## Objective

Add a docs example, "Spline editor", at `/examples/spline-editor`. Six control points float above a floor grid, and a smooth curve runs through them.

- **Default drag:** a point follows the pointer in the plane through the point that faces the camera, which feels like dragging it across the screen.
- **Shift drag:** changes only the point's height.
- **Alt drag (Option on macOS):** moves the point only across its horizontal plane.
- **Depth cues:** a drop line and a shadow under every point show where it stands in 3D.
- **Adding and removing:** double-clicking the curve inserts a point, and Delete removes the selected one.
- **Rotating:** dragging the background rotates the scene with the shared glide.
- **Readout:** shows the selected point's coordinates and the curve's length.

The page teaches three things:

1. **Dragging in 3D with unproject.** A screen drag has two degrees of freedom and a 3D point has three. A plane through the point picks the missing one, and `unproject` (`src/shapes/shape.ts:34`) returns the point on that plane under the pointer. This is the main lesson.
2. **The camera-facing plane.** Its normal is the view direction in world space, which is the third row of the rotation matrix. That row is exactly the ray direction `unproject` uses (`src/unproject.ts:39`).
3. **Depth cues in an orthographic view.** Without perspective, a point's depth is ambiguous. Drop lines and floor shadows resolve it.

Assumptions:

- **No library changes.** `points3D`, `lines3D`, `lineStrips3D`, `sort` and `unproject` are public.
- **The view direction formula.** The figure never sets `rotateZ`. With α the value passed to `rotateX` and θ the value passed to `rotateY`, the view direction in world space is −cos α · sin θ, sin α, cos α · cos θ. That is entries 6, 7 and 8 of `rotationMatrix` in `src/rotation.ts:14` with the z angle at zero. A plane normal may have either sign, but the signs between its parts matter, so verify the formula with the round-trip check in the verification criteria.
- **Coordinates and drag limits.** The floor is the plane y = 0, and up is negative y, as in `docs/examples/voxelBuilder.ts`. Points stay within x and z from −5 to 5 and a height from 0 to 5.
- **The curve.** It is a uniform Catmull–Rom spline through the points, with the end points doubled, sampled at 20 steps per segment.
- **Shared rules.** All `AGENTS.md` rules apply. The styles live in the module, as in `docs/examples/voxelBuilder.ts`.

## Implementation Plan

- [ ] 1. Create `docs/examples/splineEditor.ts`, which exports only `mountSplineEditor`, returning a dispose function. Mount it through `rotatingFigure` (`docs/examples/rotatingFigure.ts:112`) with the prefix `spline`, and relabel the button "reset". Keep the state in one place: the control points as an array of points with ids, the selected id, yaw and pitch. One render function reads the state. Rationale: this is the house pattern of every rotating figure.

- [ ] 2. Pose every renderer the same way, as the `pose` helper in `docs/examples/voxelBuilder.ts:125` does: the scale, the origin, the rotation centre and the rotation from yaw and pitch. Clamp the tilt so the camera stays above the floor. The renderers are:
  - `lines3D` for the floor grid lines and the drop lines;
  - `points3D` for the control points and their floor shadows;
  - `lineStrips3D` for the curve and for the dashed control polygon.

  Choose the rotation centre and the origin so that the middle of the editing space lands in the middle of the 960 × 500 view box, as the voxel builder does with its `CENTER` and `ORIGIN`.

- [ ] 3. Draw the scene in four groups, in this order: floor grid, drop lines and shadows, curve and control polygon, points.
  - Draw the grid and the drop lines with `placeSegments` (`docs/examples/segments.ts:8`).
  - Draw the curve and the polygon with the strip renderer's draw method.
  - Draw the points as circles, joined by id, with an invisible wider circle under each one for touch input.

  Only the points are sorted by depth. Points always paint above the curve, because an editor has to keep its handles reachable.

- [ ] 4. Compute the curve on every render: the uniform Catmull–Rom spline through the control points, with the first and last points doubled, at 20 samples per segment. Show its length in the readout as the sum of the distances between samples, to two decimals. Rationale: the curve passes through every control point, which keeps the editor easy to read.

- [ ] 5. Drag a point with a d3 drag on the point circles.
  - **On start:**
    - select the point;
    - choose the plane: through the point, with its normal set by the modifier keys of the source event;
    - unproject the pointer onto that plane, and keep the difference between the point and that hit as a grab offset.
  - **The three normals:**
    - no modifier: the view direction from the assumptions;
    - Shift: the vertical plane facing the camera, with normal −sin θ, 0, cos θ;
    - Alt: the horizontal plane, with normal 0, 1, 0.
  - **On each drag event:**
    - unproject the pointer again and add the grab offset;
    - with Shift, keep the point's x and z from the start and take only the new height;
    - with Alt, keep its height and take only the new x and z;
    - clamp to the editing box and redraw.
  - **Edge-on planes:** when `unproject` returns null, keep the last position.

  Because d3-drag stops propagation on `mousedown` and `touchstart` (see `node_modules/d3-drag/src/drag.js`), dragging a point never rotates the scene. Rationale: the grab offset keeps the point from jumping to the pointer's centre, and the plane choice is the lesson of the page.

- [ ] 6. Add and remove points.
  - **Insert:** a double click on the curve finds the curve sample nearest the pointer on screen, and inserts a new control point at that sample's 3D position, between the two control points of its segment.
  - **Remove:** Delete or Backspace removes the selected point, keeping at least two.
  - **Click on a point:** selects it.
  - **Click on the background:** clears the selection. d3 drag already swallows the click that ends a rotation.

- [ ] 7. Add keyboard editing on the focusable SVG, with a ring that shows only for keyboard focus.
  - The left and right bracket keys select the previous or next point.
  - The arrow keys move the selected point by 0.25 along x and z.
  - Page Up and Page Down move it along y.
  - The A key inserts a point halfway to the next one.
  - Delete removes the selected point, and Escape clears the selection.
  - The polite live region announces the selected point's index and coordinates after each key.

  Attach the listener to the SVG only.

- [ ] 8. Add a controls row below the SVG:
  - a readout with the selected point's x, y and z and the curve length;
  - the live region;
  - a "show control polygon" checkbox.

  Write the inline style constant with the prefix `--se-`, its dark-mode overrides, the curve stroke, the dashed polygon, the drop-line and shadow styles, the selected point's ring, a grab cursor on the background and a move cursor on the points, and stacking at phone width. Follow `docs/examples/voxelBuilder.ts`.

- [ ] 9. Write the page `docs/examples/spline-editor.md` with the mount block of `docs/examples/voxel-builder.md`, an interaction line, and these sections:
  - "Two numbers for three": why a drag needs a plane;
  - "The plane that faces you": the view direction, with the formula and a pointer to `rotationMatrix`;
  - "Only up, only across": Shift and Alt;
  - "Depth without perspective": the drop lines and shadows;
  - "The whole source".

- [ ] 10. Register the page in the sidebar and the gallery:
  - a sidebar entry "Spline editor" in `docs/.vitepress/config.ts`, which sorts the list by name;
  - a bullet in `docs/examples/index.md` after the trajectory explorer line, naming `points3D`, `lineStrips3D`, `lines3D` and `unproject`.

- [ ] 11. Run the type, lint, docs-build and audit gates, and fix what they report:
  - `npm run typecheck`, `npm run lint` and `npm run docs:build`;
  - the project-pinned fallow audit through npx.

  Extract a shared helper only for a duplicate that fallow reports, for example the `pose` helper of the voxel builder.

## Verification Criteria

- The gates pass, and `git diff --stat -- index.ts src tests` is empty.
- **Round trip:** during a plain drag at three different rotations, including a steep tilt, the projected position of the dragged point stays within 1 px of the pointer, after adding the grab offset. This also proves the signs in the view direction.
- **Constraints:** a Shift drag changes only y, and an Alt drag changes only x and z. Their values in the readout confirm it.
- **Two drags:** dragging a point never rotates the scene, and dragging the background rotates it and glides.
- **The curve:** it passes through every control point, and inserting and deleting update it at once. Deleting stops at two points.
- **Depth cues:** every point has a drop line to its shadow on the floor, and the shadow lies directly below the point at every rotation.
- **Keyboard:** the brackets, the arrows, Page Up and Page Down, A, Delete and Escape work, and the live region announces the coordinates.
- **Clean unmount:** no console errors after leaving the page mid-drag or mid-glide.
- **Themes and width:** light and dark themes are legible, and at 375 px nothing overlaps.

## Potential Risks and Mitigations

1. **The signs of the view direction are wrong**, so the dragged point drifts away from the pointer.
   Mitigation: the round-trip criterion catches it at once. Derive the normal from `rotationMatrix` (`src/rotation.ts:14`) rather than from memory.

2. **The horizontal plane is nearly edge-on at a low tilt**, so an Alt drag jumps.
   Mitigation: `unproject` returns null once the plane is edge-on, and the figure keeps the last position. The tilt clamp from step 2 keeps the camera above the floor.

3. **Points are hard to hit on touch screens.**
   Mitigation: an invisible circle about 12 px in radius under each point takes the pointer (step 3).

4. **A uniform Catmull–Rom spline overshoots or loops between points that are close together.**
   Mitigation: accept this in the first version. Switching to the centripetal variant is listed under alternatives.

## Alternative Approaches

1. **Bézier handles instead of a curve through the points:** a familiar editor, but twice the points to drag, and the lesson is the same.
2. **Only axis-aligned planes, picked by the dominant view axis:** no trigonometry, but the drag feels sticky when the view sits between two axes.
3. **A centripetal Catmull–Rom spline:** no overshoot or cusps, at the cost of a less obvious formula on the page.
