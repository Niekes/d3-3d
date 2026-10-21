# Voxel builder example

## Objective

Add a docs example, "Voxel builder", at `/examples/voxel-builder`. It is the first figure that uses the new `unproject` method. The scene is an 8 × 8 floor where you build with unit cubes, stacked up to 6 layers high:

- **Placing:** click the floor to place a cube, or click a face of a cube to place a new one against that face.
- **Removing:** shift-click a cube, or switch to erase mode, to remove it.
- **Previewing:** a see-through "ghost" cube follows the pointer and shows where the next click will place a cube.
- **Rotating:** dragging rotates the scene, and a flick glides to a stop thanks to the shared drag in `docs/examples/rotatingFigure.ts:23`.
- **Readout:** shows where on the floor the pointer is, in world units.
- **Palette:** six swatches pick the color of the next cube.
- **Keyboard:** the whole build can also be done with the keyboard.

The page teaches four things, each tied to one part of the code:

1. **Unproject.** The floor is drawn as one plane plus grid lines. There is no element per floor cell to hit-test, so the floor position under the pointer can only come from `unproject` (`src/shapes/shape.ts:111`). The live floor readout makes this visible. This is the main lesson.
2. **A face knows its neighbor.** A click on a face hands over the face's datum. The face name alone picks the neighbouring grid cell, so stacking needs no maths. The face names are listed in `src/shapes/cubes.ts:45-74`.
3. **Faces nobody can see.** A face that touches another cube, or rests on the floor, is dropped from the data. The readout shows "faces drawn" next to the cube count, so the saving is visible.
4. **Object identity.** Cubes are joined by their cell key, and faces by face name, the same way as in `docs/examples/explodedCubes.ts:137-159`. A drag never adds or removes elements; only an edit does.

Assumptions:

- **No library changes.** `unproject` is already public on every shape through `ShapeInstance` (`src/shapes/shape.ts:34`). `cubes3D`, `planes3D`, `lines3D` and `sort` are already exported from `index.ts`. So no new export and no new test.
- **The floor stays below the camera.** Pitch is limited so the camera never goes under the floor. The floor is then always behind every cube, and it stays out of the depth sort.
- **No saving, undo or sharing.** There is no persistence (URL or browser storage) and no undo stack. They are listed under alternatives.
- **Styles live in the module.** They are added through a constant, as in `docs/examples/explodedCubes.ts:252`, which is the newest house pattern. There is no separate CSS file.
- **Commit pending work first.** The working tree holds uncommitted work: the svg.js port and other docs edits. Commit it first, so this example lands in its own commit.
- **The changelog is not touched.** `CHANGELOG.md` only records library changes.

## Implementation Plan

- [ ] 1. Create `docs/examples/voxelBuilder.ts`, which exports only a mount function, `mountVoxelBuilder`. It takes the host element and returns a dispose function, like `docs/examples/explodedCubes.ts:94`. Mount through the shared scaffold `rotatingFigure` (`docs/examples/rotatingFigure.ts:105`) with the prefix `voxel`. That provides the SVG, the drag rotation with its glide, and the button. Relabel the button "reset". Leave the scaffold unchanged. Rationale: a new figure gets the inertia from the svg.js port for free, and it shares one interaction model with the other ten rotating figures.

- [ ] 2. Hold the state in one place, in the style of `docs/examples/explodedCubes.ts:96-99`. The state is:
  - a map from a cell key (column, layer, row) to that cube's grid position and color;
  - the current color;
  - the mode (build or erase);
  - yaw and pitch;
  - the target cell, which is the ghost, or none;
  - the keyboard's cursor column.

  A small starter build, about six cubes in a stepped corner, fills the scene on mount and on "reset". Constants: the floor size (8), the maximum height (6), the scale, the origin and a start angle. Choose the scale so that the full 8 × 8 × 6 volume fits the 960 × 500 viewBox at any rotation within the pitch limit. Rationale: one state object and one render function is the house pattern for figures with several input sources.

- [ ] 3. Build each cube's eight vertices in the order cubes3D expects. Mirror the vertex helper in `docs/examples/explodedCubes.ts:35-59`. The floor is centred on the origin at y = 0, and layers rise towards negative y, because screen y grows downward. Every vertex carries the cell key, column, layer, row and color, so the cube can be identified again after projection without a lookup. Rationale: the transform copies the datum's own fields onto every projected vertex, and the click and hover handlers rely on that.

- [ ] 4. Draw the floor once per render in its own group, before the cube group:
  - one `planes3D` quad for the floor's surface;
  - `lines3D` for the nine grid lines in each direction.

  Both renderers take the same scale, origin and rotation as the cube renderer. The floor is not sorted, because the pitch limit from step 5 keeps it behind everything. Rationale: one floor plane instead of 64 cell paths is the setup that makes `unproject` necessary, and it keeps the DOM small.

- [ ] 5. Write one render function.
  - **Rotation:** take it from the drag's yaw and pitch plus the start angle, as in `docs/examples/explodedCubes.ts:138`. Clamp the tilt so the camera stays between about 10 and 85 degrees above the floor.
  - **Projection:** project the built cubes plus the ghost cube, if there is one.
  - **Cube join:** join one group per cube, keyed by cell key.
  - **Face join:** inside each group, join one path per face, keyed by face name.
  - **Culling:** hide faces that point away from the camera through the visibility attribute, using the `ccw` flag. Do not filter them out, as in `docs/examples/explodedCubes.ts:150-158`.
  - **Painting order:** sort the cube groups with `sort` from `src/sort.ts:7`.
  - **Neighbour culling:** before the face join, drop a cube's face when the neighbouring cell in that face's direction holds a cube, and drop the bottom face of every cube on layer 0. The face directions:
    - front: next row;
    - back: previous row;
    - right: next column;
    - left: previous column;
    - top: next layer up;
    - bottom: next layer down.

    These follow the vertex directions in `docs/examples/explodedCubes.ts:47-57` and the face vertex sets in `src/shapes/cubes.ts:45-74`. The ghost never hides its neighbours' faces.

  Rationale: neighbour culling only changes when the build is edited, so during a drag no elements enter or leave. Only the camera-facing visibility changes.

- [ ] 6. Turn the pointer into a target cell on pointer move over the SVG.
  - **While dragging:** when any mouse button is down, a drag or a glide is running, so hide the ghost.
  - **Pointer over a face:** read the face's datum. In build mode, the target is the neighbouring cell in that face's direction, if it is inside the floor and below the height limit. In erase mode, the target is the cube itself.
  - **Pointer over the floor or empty space:** take the pointer position in the cube group's own coordinates with d3's pointer helper, then call the cube renderer's `unproject` with the plane through the origin whose normal points along y. If the result is null or off the floor, there is no target. Otherwise the column and row are the cell under the point, and the target layer is the first empty layer of that column.
  - **Readout:** show the floor position to two decimals on every move. That span is not a live region.
  - **Redraw only on a change:** redraw only when the target cell changes, not on every pointer move.
  - **Leaving the SVG:** clears the target.

  Rationale: this step is the figure's reason to exist. The face path answers "which cube", and `unproject` answers "where on the floor".

- [ ] 7. Place or remove on click. Work out the target from the click event itself, the same way as on hover, so a tap on a touch screen works without any hover. Shift-click inverts the mode for that click. After an edit:
  - update the map;
  - re-render;
  - announce the change in a polite live region, for example "Placed a blue cube at column 3, row 5, layer 2. 14 cubes."

  d3-drag already swallows the click that ends a drag that moved, as noted in `docs/examples/explodedCubes.ts:213-216`, so releasing a drag or a flick never places a cube. "Reset" restores the starter build, and the live region announces it.

- [ ] 8. Add a controls row below the SVG, inserted the same way as `docs/examples/explodedCubes.ts:122-130`. It holds:
  - six color swatches as a radio group, with visible labels and accessible names;
  - a build or erase radio pair;
  - a readout line with three parts: the floor position under the pointer, the live region for edits, and a count such as "14 cubes · 38 faces drawn".

  Rationale: native radio inputs give keyboard and screen-reader support without extra code, and the faces-drawn count makes neighbour culling visible.

- [ ] 9. Add keyboard building. Make the SVG focusable with a ring that only shows for keyboard focus (`:focus-visible`), as in `docs/examples/explodedCubes.ts:290-299`. While the SVG has focus:
  - the arrow keys move a cursor column over the floor, and the ghost sits at that column's top;
  - Enter or Space places a cube there;
  - Delete or Backspace removes the column's top cube;
  - the digits 1 to 6 pick a color;
  - E toggles the mode;
  - Escape hides the cursor.

  Attach the listener to the SVG only, as in `docs/examples/explodedCubes.ts:226`, so typing elsewhere on the page never builds anything. Rationale: placing by click is pointer-only, and building is the figure's main interaction.

- [ ] 10. Write the inline style constant, with tokens prefixed `--vb-` and dark-mode overrides under the `.dark` root, as in `docs/examples/explodedCubes.ts:252-280`. It covers:
  - the floor fill and the grid stroke;
  - six palette colors, each with a dark-mode variant;
  - face shading by face name, mixed from the cube's color, like the face rules in `docs/examples/explodedCubes.ts:315-330`;
  - the ghost: about 35 percent fill opacity, a dashed stroke, and no pointer events, so it never sits under the pointer itself;
  - an erase target tinted red;
  - the grab cursor and the focus ring;
  - a controls row that stacks in normal flow at phone width.

- [ ] 11. Write the page `docs/examples/voxel-builder.md`. Copy the frontmatter and mount block of `docs/examples/exploded-cubes.md:1-23` with the new mount function. Below them, write one interaction line and these sections, each with a short excerpt of the figure's code:
  - "The floor is one plane": why hit-testing elements cannot place a cube on an empty floor, the unproject call, and the readout.
  - "A face knows its neighbour": the face-name-to-step table.
  - "Faces nobody can see": neighbour culling and the faces-drawn count.
  - "Stable cubes": the keyed joins, the ghost, and the drag that never adds or removes an element.
  - "The whole source": a link to `docs/examples/rotatingFigure.ts` and the include of the module, as in `docs/examples/exploded-cubes.md:187-199`.

  Link the unproject entry of the README API reference from the first section.

- [ ] 12. Register the page. Add the sidebar entry "Voxel builder" right after "Exploded cube assembly" in `docs/.vitepress/config.ts:35`, so the three `cubes3D` figures sit together. Add a bullet after the exploded-cubes line in `docs/examples/index.md:7` that names `cubes3D`, `planes3D`, `lines3D` and `unproject`.

- [ ] 13. Run the type, lint, docs-build and audit gates, and fix what they report:
  - `npm run typecheck`, `npm run lint` and `npm run docs:build`;
  - the project-pinned fallow audit through npx. The global fallow install is outdated and reports false findings.

  If `fallow dupes` flags the vertex helper or the face join against `docs/examples/explodedCubes.ts`, extract only the reported piece into one shared docs helper used by both figures. Do not extract anything before fallow reports it.

## Verification Criteria

- `npm run typecheck`, `npm run lint` and `npm run docs:build` pass. The project-pinned fallow audit verdict is pass. The module exports only the mount function and reaches the library only through `index.ts`.
- `git diff --stat -- index.ts src tests` is empty, so the library is unchanged.
- **Placing and stacking.** In `npm run docs:dev` on `/examples/voxel-builder`:
  - Hovering the floor moves the ghost to the cell under the pointer at any rotation, including during and after a glide.
  - At a grid-line crossing, the floor readout shows whole numbers, give or take 0.05.
  - Clicking the floor places a cube there.
  - Clicking a top face stacks a cube on top, and clicking a side face places one beside it.
  - Shift-click and erase mode remove the cube under the pointer.
  - The ghost disappears beyond the floor's edge and at the sixth layer.
- **Neighbour culling.** A solid 2 × 2 × 2 block on an empty floor reports "8 cubes · 20 faces drawn": 24 outer faces minus the 4 bottom faces on the floor. A single cube reports 5.
- **Element stability.** During a drag, the number of child elements in the cube layer stays the same; a mutation observer sees no additions or removals. Elements are only added or removed when a cube is placed or erased.
- **Painting order.** Through a full turn with an L-shape, an overhang and a 3-high tower, no face shows through a cube in front of it, and the floor is never drawn over a cube.
- **Pitch limit.** The camera cannot be turned below the floor.
- **No accidental placing.** Releasing a drag or a flick never places a cube.
- **Keyboard.** With the SVG focused, the arrow keys, Enter, Delete, the digits 1 to 6 and E build a tower, remove it and switch color and mode. Typing in the docs search field does nothing to the figure.
- **Reduced motion.** With reduced motion turned on in the OS, a flick does not glide (this behaviour comes from the shared drag).
- **Clean unmount.** After navigating to another page, the console shows no errors, and no listener or timer keeps firing.
- **Themes and width.** Light and dark themes are both legible. At 375 px width, nothing overlaps and the page does not scroll horizontally.

## Potential Risks and Mitigations

1. **Sorting by cube centre paints a cube over one in front of it at some angles, especially the ghost against a neighbour.**
   Mitigation: equal unit cubes on a rectilinear grid sort correctly by centre under an orthographic projection, and the ghost sits on the same grid. If the dev check still shows a misorder, sort by grid order along the axes the view direction picks, instead of by centre.

2. **The pitch limit and the scaffold's unbounded drag offset create a dead zone.** Dragging past the limit and then back seems to do nothing until the offset returns into range.
   Mitigation: accept this for the first version, since the start angle sits mid-range. If it feels wrong, add an optional pitch clamp to the shared drag helper. That changes all eleven rotating figures, so do it in a separate commit.

3. **The ghost flickers because the pointer lands on the ghost itself.**
   Mitigation: the ghost style disables pointer events (step 10), so hit-testing always sees the real cube or the floor behind it.

4. **The floor readout or the target is offset when the figure is scaled responsively, or when the cube group has a transform.**
   Mitigation: take the pointer position relative to the cube group, whose coordinate system matches the projected coordinates. Check at 375 px width and at full width that the ghost lands under the pointer.

5. **Re-rendering on every pointer move costs frames at the full 384-cube volume.**
   Mitigation: re-render only when the target cell changes, and only update the readout text otherwise (step 6). Neighbour culling keeps the drawn faces down to the build's outer surface.

6. **`fallow dupes` flags the vertex helper or the face join shared with `docs/examples/explodedCubes.ts`.**
   Mitigation: step 13 extracts one shared docs helper, but only after fallow reports a duplicate.

## Alternative Approaches

1. **Floor as 64 cell paths (for example with `gridPlanes3D`) and per-cell hit-testing:** no unproject needed, but 64 more paths, no continuous floor position, and the page loses its main lesson.
2. **Other examples that need unproject:**
   - Terrain sculptor: a brush on the existing terrain plot. It shows the continuous floor position, but the surface is already a grid of hit-testable quads.
   - 3D spline editor: drag control points on a plane facing the camera. It's the clearest "drag in 3D" demo, but a less playful one.
   - Chart probe: a crosshair and readout on the scatter explorer's floor. It's the smallest diff, but it adds to an existing figure rather than making a new one.
   - Floor-plan furniture: drag pieces across each floor.
3. **Saving and undo:** encode the build in the URL hash so it can be shared, or keep an undo stack. Both are cheap later additions, and both are left out of the first version to keep the figure about projection and picking.
4. **Hiding interior faces with the visibility attribute instead of dropping them:** elements would stay stable even across edits, but hidden faces would still be in the DOM, and the faces-drawn count would teach nothing.
