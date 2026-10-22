# Packing playground example

## Objective

Add a docs example, "Packing playground", at `/examples/packing-playground`. A see-through container, 6 wide, 4 deep and 4 high, stands on a floor, and you fill it with boxes.

- **The tray:** five piece sizes, 1 × 1 × 1, 2 × 1 × 1, 2 × 2 × 1, 3 × 2 × 1 and 2 × 2 × 2. R turns the footprint of the next piece by a quarter turn.
- **Place mode:** clicking the floor drops the tray piece into that cell. It lands on the highest piece under its footprint, and a see-through ghost shows where. Clicking the top face of a piece drops the new one onto that piece.
- **Move mode:** dragging a piece moves it across the floor at its own height, snapped to the cells. A move may push it into another piece. Page Up and Page Down change its height, and D drops it onto whatever lies below.
- **Overlaps:** every cell that two pieces share is drawn in red.
- **Readout:** the occupied volume as cells of 96 and as a percentage, on a `<meter>`, and the number of overlapping cells.
- **Rotating:** dragging the background rotates the scene with the shared glide.

The page teaches three things:

1. **A drag in a plane.** A dragged piece follows the pointer on the horizontal plane at its own base height. `unproject` (`src/shapes/shape.ts:159`) gives the point under the pointer, and a grab offset keeps the piece from jumping, as in the spline editor (`docs/examples/splineEditor.ts:279-314`). This is the main lesson.
2. **Every piece is drawn as unit cubes.** Boxes of different sizes cannot be painted in the right order by their centres. Equal unit cubes on a grid can, because `sort` (`src/sort.ts:7`) orders them exactly. So each piece is cut into unit cubes, and the faces between two cubes of the same piece are dropped, exactly as in the voxel builder (`docs/examples/voxelBuilder.ts:198-201`). The piece still reads as one box.
3. **One cell map answers every question.** The same map from cells to the pieces in them gives what to draw, which cells overlap, and the occupied volume.

Assumptions:

- **No library changes.** `camera3D`, `cubes3D`, `planes3D`, `lines3D`, `box`, `sort` and `unproject` are public. So `git diff -- index.ts src tests` stays empty.
- **Pieces stay on the grid.** They sit on whole cells inside the container, never outside it, and turn only by quarter turns about the vertical.
- **Coordinates.** The floor is the plane y = 0, layers rise towards negative y, and the container is centred on the origin, as in `docs/examples/voxelBuilder.ts:118-130`. Every renderer hangs on one `camera3D`, posed once per render by `pose` (`docs/examples/floorView.ts:20-32`), as in `docs/examples/voxelBuilder.ts:148-152`. Its turn clamps the tilt between 10 and 85 degrees (`docs/examples/floorView.ts:12`), so the floor and the back walls stay behind every piece.
- **Orthographic.** The camera keeps the default orthographic projection, and `.perspective` (`src/shapes/shape.ts:81-94`) stays unset. The exact sort of lesson 2 holds only without perspective.
- **Overlaps are allowed.** A move may overlap two pieces, and the page shows that. Only a placement from the tray lands on top of what is there.
- **Shared rules.** All `AGENTS.md` rules apply. The styles live in the module, as in `docs/examples/voxelBuilder.ts:439`. `CHANGELOG.md` is not touched.

## Implementation Plan

- [ ] 1. Share the voxel grid helpers. If `docs/examples/cubeFaces.ts` does not export them yet, move the `Cell` type, the face steps, `keyOf` and `neighborOf` out of the voxel builder and into `cubeFaces.ts`. They live at `docs/examples/voxelBuilder.ts:30`, `:48-55`, `:99` and `:112-115`.
  - The voxel builder imports them back and behaves exactly as before.
  - If the cellular automaton has already done this move, reuse its exports.

  Rationale: three figures share one face-to-neighbour table, and fallow reports copies.

- [ ] 2. Create `docs/examples/packingPlayground.ts`, which exports only `mountPackingPlayground`, returning a dispose function. Mount it through `rotatingFigure` (`docs/examples/rotatingFigure.ts:155-174`) with the prefix `pack`, and relabel the button "empty".

  Keep the state in one place:
  - the pieces, each an id, a column, a layer, a row, a width, a depth, a height and a colour index;
  - the tray size and whether it is turned;
  - the mode, place or move;
  - the selected piece;
  - the target, which is the ghost;
  - the drag grab;
  - yaw and pitch.

  A starter of three pieces without an overlap fills the container on mount. "Empty" clears it. Rationale: one state object and one render function is the house pattern.

- [ ] 3. Build the cell map on every render. It maps a cell key to the ids of the pieces whose box covers that cell, including the ghost. From it:
  - a cell with one owner becomes a unit cube of that piece, keyed by the piece id and the cell's offset within the piece;
  - a cell with two or more owners becomes one red overlap cube, keyed by the word "overlap" and the cell key;
  - the occupied volume is the number of keys, and the overlap count is the number of keys with more than one owner.

  Rationale: keys tied to the piece and the offset keep a dragged piece's elements, and one map keeps the drawing and the numbers in agreement.

- [ ] 4. Draw the unit cubes. Build each one from `box` (`src/box.ts:15-42`) with a unit size, and spread its datum (piece id, cell, overlap flag) onto the corners, as `docs/examples/barChart.ts:42-48` does.
  - **Cube join:** one group per cube, sorted with `sort`.
  - **Culling:** before the face join, drop a face when `neighborOf` lands on a cell of the same piece, or on another overlap cell, or below the floor.
  - **Face join:** join the remaining faces with `joinFaces` (`docs/examples/cubeFaces.ts:10-19`).
  - **Seams:** stroke the faces in their own fill colour, at about 85 percent fill opacity, so the unit seams stay faint and the pieces behind show through.

  Rationale: equal cubes on a grid are the case that `sort` gets right, and the voxel builder already relies on that.

- [ ] 5. Draw the container in two groups, one before and one after the pieces. Project it as one `cubes3D` cube from `box`, so its six faces carry the `ccw` flag.
  - **Before the pieces:** the faces that turn away from the camera, faintly filled, which are the walls and the floor seen from inside. Join them with `joinFaces` and its `visible` argument (`docs/examples/cubeFaces.ts:13`) set to the faces that are not `ccw`, so a turn only hides and shows them. Then the floor grid with `lines3D` and `placeSegments` (`docs/examples/segments.ts:8`), and the edges between two faces that turn away.
  - **After the pieces:** the edges that border at least one face turned towards the camera, as dashed lines.

  Rationale: with the camera outside the container, a wall turned away always lies behind the contents, and an edge of a near wall always lies in front of them.

- [ ] 6. Turn the pointer into a target in place mode, on pointer move, as in `docs/examples/voxelBuilder.ts:277-316`.
  - **Over the top face of a piece:** the target column and row are that cube's cell.
  - **Anywhere else:** the floor cell under the pointer comes from the renderer's `unproject` with the floor plane, as in `docs/examples/voxelBuilder.ts:255-258`.
  - **The drop:** the target layer is the lowest layer at which the tray piece's footprint is free of other pieces all the way up. There is no target when the footprint leaves the container or the piece would rise above layer 4.
  - **Redraws:** only when the target changes. During a drag or a glide, there is no target.

  Clicking places the piece at the target and announces it. Shift-click works in the other mode.

- [ ] 7. Drag pieces in move mode with a d3 drag on the piece groups. Its filter lets the press through only in move mode, so in place mode a press on a piece still turns the scene.
  - **On start:**
    - select the piece;
    - take the horizontal plane at the piece's base height as the drag plane;
    - unproject the pointer onto it, and keep the grab offset, as in `docs/examples/splineEditor.ts:290-294`.
  - **On each drag event:** unproject again, add the offset, round to whole cells, clamp the footprint into the container and redraw.
  - **Edge-on planes:** when `unproject` returns null, keep the last cell.

  d3 drag stops the press from reaching the figure's own drag (`docs/examples/splineEditor.ts:279-282`). A click on a piece selects it, and a click on the background clears the selection.

- [ ] 8. Add the edit keys on the focusable SVG, with a ring that shows only for keyboard focus, as in `docs/examples/voxelBuilder.ts:493-501`.
  - **With a piece selected:**
    - the arrow keys move it by one cell;
    - Page Up and Page Down change its layer;
    - D drops it onto what lies below;
    - R turns its footprint when the turned piece still fits;
    - Delete removes it;
    - the brackets select the previous or next piece;
    - Escape clears the selection.
  - **Without a selection:**
    - the arrow keys walk a floor cursor with the ghost, as in `docs/examples/voxelBuilder.ts:384-396`;
    - Enter places the tray piece there;
    - R turns the tray piece;
    - the digits 1 to 5 pick the tray size.

  The polite live region announces every edit, with the volume and the overlap count. Attach the listener to the SVG only.

- [ ] 9. Add a controls row below the SVG, inserted as in `docs/examples/voxelBuilder.ts:167-185`. It holds:
  - the tray as a radio group of five sizes, with visible labels;
  - a place or move radio pair;
  - a `<meter>` from 0 to 96, with the text "42 of 96 cells · 44% · 1 overlapping";
  - the live region.

  Rationale: the native meter gives the volume a bar and a value that screen readers announce, with no drawing code.

- [ ] 10. Write the inline style constant with the prefix `--pp-` and its dark-mode overrides under `.dark`. It covers:
  - six piece colours, assigned in turn as pieces are placed;
  - the overlap red;
  - the ghost: low fill opacity, a dashed stroke and no pointer events, as in `docs/examples/voxelBuilder.ts:556-563`;
  - the selected outline;
  - the faint back walls and the dashed front edges;
  - the grab cursor in move mode;
  - the focus ring;
  - the controls row, which stacks at phone width.

- [ ] 11. Write the page `docs/examples/packing-playground.md`, with the mount block of `docs/examples/voxel-builder.md`, an interaction line, and these sections:
  - "Where a box lands": the floor through `unproject`, and the drop onto the stack;
  - "Moving in a plane": the drag plane at the piece's height and the grab offset, linking the spline editor;
  - "Boxes made of cubes": why mixed sizes break a centroid sort, and how unit cubes and face culling fix it, linking the depth-ordering lab once it exists;
  - "One map of cells": the volume and the overlaps;
  - "The whole source".

- [ ] 12. Register the page in the sidebar and the gallery:
  - a sidebar entry "Packing playground" in the list at `docs/.vitepress/config.ts:79-100`, which sorts by name;
  - a bullet in `docs/examples/index.md` after the voxel builder line, naming `cubes3D`, `box`, `lines3D` and `unproject`.

- [ ] 13. Run the type, lint, docs-build and audit gates, and fix what they report:
  - `npm run typecheck`, `npm run lint` and `npm run docs:build`;
  - the project-pinned fallow audit through npx.

  Extract a further shared helper only for a duplicate that fallow reports, for example the floor-cell lookup of the voxel builder.

## Verification Criteria

- The gates pass, and `git diff --stat -- index.ts src tests` is empty. The voxel builder still passes its own verification criteria after step 1.
- **Volume:** placing one 2 × 2 × 2 piece in an empty container reads "8 of 96 cells · 8%".
- **Overlaps:** dragging a 2 × 1 × 1 piece half onto a 1 × 1 × 1 piece at the same layer reads 2 occupied cells and 1 overlapping, and the shared cell is drawn red.
- **The drop:** a 2 × 2 × 1 piece placed over a 1 × 1 × 1 piece lands on layer 1, and D on a raised piece lowers it to the first layer where it rests.
- **The drag:** at three rotations, including the lowest tilt, the grabbed cell stays under the pointer within one cell throughout the drag.
- **Two drags:** in move mode, dragging a piece never turns the scene. In place mode, a press on a piece turns it.
- **Painting order:** through a full turn with a 3 × 2 × 1 piece, a 2 × 2 × 2 piece and a 1 × 1 × 1 piece side by side and stacked, no face shows through a piece in front of it. The dashed front edges always lie on top.
- **Element stability:** a mutation observer sees no additions or removals during a rotation. During a drag, elements change only where cells start or stop overlapping.
- **Keyboard:** the whole flow works without a pointer: pick a size, walk the cursor, place, select, move, change the layer, drop, turn and delete. Typing in the docs search field does nothing to the figure.
- **Clean unmount:** no console errors after leaving the page mid-drag or mid-glide.
- **Themes and width:** light and dark themes are legible, and at 375 px nothing overlaps and the page does not scroll sideways.

## Potential Risks and Mitigations

1. **Unit seams make the pieces look like stacks of dice.**
   Mitigation: stroke each face in its own fill (step 4). If seams still show, draw an outline of each piece's box on top, as one more `lines3D` per selected piece only.

2. **A horizontal drag plane is almost edge-on at the lowest tilt, so a piece jumps.**
   Mitigation: the tilt clamp keeps the camera at least 10 degrees above the floor, and a null from `unproject` keeps the last cell.

3. **Re-rendering on every pointer move costs frames once the container is full.**
   Mitigation: 96 cells is the ceiling, and redraws happen only when the target or the dragged cell changes.

4. **Moving the helpers in step 1 breaks the voxel builder.**
   Mitigation: the move only changes imports. Re-run the voxel builder's "8 cubes · 20 faces drawn" check.

5. **The red overlap cubes hide which pieces collide.**
   Mitigation: an overlap cube's datum lists its owners. Hovering it outlines both pieces, and the live region names them after a move.

## Alternative Approaches

1. **One `cubes3D` box per piece, painted by a topological order:** cleaner faces, but disjoint boxes of mixed sizes need a pairwise separating-axis test and a cycle breaker. Overlapping boxes have no correct order at all.
2. **Gravity on every move:** pieces would always rest on something and could never overlap, but the overlap highlight, which the idea asks for, would have nothing to show.
3. **Free rotation of pieces about every axis:** six orientations per piece instead of two, at the cost of a less obvious keyboard scheme.
4. **An automatic packer:** a greedy first-fit button would fill the container, and is a cheap later addition once the manual playground works.
