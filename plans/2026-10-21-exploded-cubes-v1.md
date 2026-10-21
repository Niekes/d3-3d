# Exploded cube assembly example

## Objective

Add a docs example, "Exploded cube assembly", at `/examples/exploded-cubes`. It shows a 4 × 4 × 4 block built from 64 small cubes. A slider moves the block between assembled and exploded, and as it explodes the four horizontal layers move apart along the block's own vertical axis. A button animates the same change. Dragging rotates the whole assembly in either state. Clicking a cube selects it: the cube is highlighted and an inspector panel shows its layer, row, column and kind (corner, edge, face or core). The selection survives rotation, explosion and the animation.

The page teaches three things, each tied to one part of the code:

- **`cubes3D`**: every cube is eight vertices, and the renderer hands back six named faces with `centroid` and `ccw`.
- **Coordinated transforms**: the explosion is a translation in model space, applied before the renderer's rotation. One state object holds yaw, pitch, the explode amount and the selection, and one render function reads it. The drag, the slider, the button animation and the keyboard all update that state and call the same render.
- **Object identity**: the cube id travels on every vertex through the projection, the join is keyed by that id, and the DOM elements are created once and never re-entered. As a result, the selection class, the click target and the inspector all point to the same cube from frame to frame.

Assumptions:

- The object is a 4 × 4 × 4 block. Four layers is the smallest count where middle layers exist, and eight of the 64 cubes are core cubes, which can only be reached once the block is exploded. That is the reason to explode it.
- The cubes explode along the vertical axis only, which is what "separate into layers" asks for. A radial explosion is listed under alternatives.
- The library (`index.ts`, `src/**`) does not change. Everything the figure needs is already public: `cubes3D` (`index.ts:8`), `sort` (`index.ts:19`), `Cube`, `CubeFace` and `CubeFaceName` (`index.ts:35`), `Cubes3DInstance` (`index.ts:47`) and `Point3D`. No new export means no new test.
- `CHANGELOG.md` is not touched. It only records library changes, and the scatter explorer page got no entry either.
- The working tree holds uncommitted work on `feat/terrain-plot`: `axes3D` and the scatter explorer. That work should be committed first so this example lands in its own commit. The example does not depend on it, apart from sharing the sidebar list in `docs/.vitepress/config.ts:34`.

## Implementation Plan

- [ ] 1. Create `docs/examples/explodedCubes.ts`, which exports only `mountExplodedCubes(host)` and returns a dispose function, like `docs/examples/terrainPlot.ts:42`. Mount it through the shared scaffold `rotatingFigure` (`docs/examples/rotatingFigure.ts:42`), which provides the SVG, the drag rotation and the button. Leave the scaffold unchanged. Import a sibling stylesheet `docs/examples/explodedCubes.css` from the module, as `docs/examples/terrainPlot.ts:13` does. Rationale: this is the newest house pattern for figures with controls, and it keeps the page's Markdown to prose.

- [ ] 2. Build the assembly data once at mount. For each layer, row and column, produce the eight vertices of a cube in the vertex order that `src/shapes/cubes.ts:46-74` expects (front top left, front bottom left, front bottom right, front top right, then the same four at the back). Use the same order as `makeBar` in `docs/examples/barChart.ts:37`. Every vertex carries the cube's `id`, `layer`, `row` and `column`, and the vertices sit in model units centred on the origin. Up is negative y, because screen y grows downward, as with the negative bar heights in `docs/examples/barChart.ts:200`. Rationale: the transform keeps every input property on each transformed vertex (the bar chart relies on this, `docs/examples/barChart.ts:91`), so the cube's identity and grid position survive the projection without a lookup table.

- [ ] 3. Apply the explosion before the projection. Keep the assembled grid unchanged. On every render, derive the displaced vertex lists by shifting each cube's vertices along y by its layer's offset from the centre (layer index minus 1.5) times a fixed gap times the explode amount, which runs from 0 to 1. The offset is symmetric around the centre, so the block's centre and the renderer's default rotation centre stay at the origin, and `rotationCenter` stays unset. Rationale: an offset in model space rotates together with the object, so the layers always separate along the block's own vertical axis. An offset in screen space, by moving the renderer origin per layer, would move the layers vertically on screen whatever the rotation. The page should call this difference out. Choose the gap and the renderer scale so that the fully exploded block fits the 960 × 500 viewBox at any rotation.

- [ ] 4. Use one `cubes3D` renderer, one state object (yaw, pitch, explode amount, selected id) and one render function. The render function sets the rotation from the scaffold's drag angles plus a fixed start angle, as in `docs/examples/barChart.ts:205`. It then projects the displaced cubes, re-attaches the id and grid fields from the first vertex onto each cube, as in `docs/examples/barChart.ts:90-99`, and draws. The scaffold's drag callback, the slider's input handler, the button animation and the keyboard handler only write to the state and call render. Rationale: this is the "coordinated transforms" the page teaches. The scatter explorer's single render loop (`docs/examples/scatterExplorer.ts:409`) shows the same reasoning: two sources of motion that each draw on their own fight each other.

- [ ] 5. Draw the cubes with keyed joins and stable elements. Keep one group per cube, keyed by id, and one path per face inside it, keyed by face name, as in `docs/examples/barChart.ts:101-122`. Hide the faces that point away from the camera with a visibility attribute, based on the `ccw` flag. Do not filter them out of the data, so no element enters or exits during a drag. Sort the cube groups with the library `sort` on every render. Do not sort the faces inside a cube: the visible faces of a convex cube never overlap, so culling removes the need for the second sort level that the bar chart has (`docs/examples/barChart.ts:179`). Color the cubes by layer from a four-step ordinal scheme. Shade each face by its face name with a fixed darkening per name (top lightest, then the side faces), and give every face a thin darker stroke, so the seams of the assembled block show where one cube ends and the next begins. Rationale: stable elements are the "object identity" lesson, and culling halves the painted faces.

- [ ] 6. Add the explode slider and the button. Below the SVG, add a controls row like `.terrain-controls` (`docs/examples/terrainPlot.ts:56`): an "explode" range input from 0 to 1 with an `<output>` showing a percentage. The input event interrupts any running animation, sets the explode amount and renders. Relabel the scaffold button "explode" or "assemble" to match the current target. A click animates the explode amount to 0 or 1 with a named d3 transition on the host, using a tween that writes the state and the slider value and renders on every tick, eased with `easeCubicInOut` over about 900 ms. With reduced motion preferred, the click jumps straight to the target, following the media check in `docs/examples/scatterExplorer.ts:255`. Rationale: tweening the shared number, not the path attributes, lets a drag during the animation keep working. A transition on `d` would be overwritten by the drag's redraw.

- [ ] 7. Add click-to-inspect. Put one click listener on the cube layer group, following the group-level listener in `docs/examples/terrainPlot.ts:101`. It reads the target face's datum and takes the id from its first vertex. A click on empty SVG clears the selection. The selected cube group gets an `is-selected` class, and the host gets a `has-selection` class that dims the other cubes through CSS, so selecting needs no redraw. Rely on d3-drag to suppress the click that follows a drag that moved (`node_modules/d3-drag/src/drag.js:69`), so a rotation never selects a cube.

- [ ] 8. Add the inspector panel. Next to the controls, add a panel with `aria-live="polite"`. It shows the selected cube's id, its layer (for example "2 of 4", counted from the bottom), row, column, and kind. The kind comes from how many of the three grid coordinates lie on the boundary: three is a corner, two an edge, one a face and none a core cube. It also shows the cube's current displacement from its assembled position in model units. With nothing selected, it shows a one-line hint. Rationale: every value comes from the vertex's own fields plus the shared explode amount, which shows that the identity carried through the projection is enough to inspect a cube.

- [ ] 9. Add keyboard access. Make the SVG focusable with a visible focus ring. While it has focus, the arrow keys move the selection by row and column, Page Up and Page Down move it by layer, and Escape clears it. The first key press with nothing selected picks a corner cube. Attach the listener to the SVG, not to `window`, unlike `docs/examples/isoCommon.ts:143`, so the figure never takes keys from the rest of the page, and remove it in dispose. Rationale: clicking a path is mouse-only, and selection is the figure's main interaction.

- [ ] 10. Write `docs/examples/explodedCubes.css`. Copy the token block and dark-mode overrides of `docs/examples/terrainPlot.css:1-21` with an `--ec-` prefix. Add the grab cursor and `touch-action: none` for the SVG, the scaffold button, the controls row and the inspector panel. Add the `is-selected` rule (accent stroke, thicker stroke), the `has-selection` dim rule for the other cubes, and the SVG focus ring. Below a phone-width breakpoint, stack the controls and the inspector in normal flow so nothing covers the figure.

- [ ] 11. Write the page `docs/examples/exploded-cubes.md`. Copy the frontmatter and mount block of `docs/examples/terrain-plot.md:1-23` with the host class `exploded-cubes`. Below them, write one interaction line and these sections, each with a short excerpt of the figure's code:
  - "An assembly is 64 cubes": the eight vertices and the id on every vertex.
  - "Explode before you rotate": the model-space offset, and why moving the origin per layer would be wrong.
  - "One state, one render": the coordinated sources of motion.
  - "Identity survives the projection": the keyed joins, the stable elements and the selection class that stays put.
  - "Only the faces that face you": `ccw` culling, which removes the per-face sort.
  - "Inspecting a cube": the click target, the kinds of cube, and the core cubes that only an exploded block can show.
  - "The whole source": include the module, as in `docs/examples/terrain-plot.md:150-169`.

- [ ] 12. Register the page. Add the sidebar entry "Exploded cube assembly" right after "Bar chart" in `docs/.vitepress/config.ts:33`, so the two `cubes3D` figures sit together. Add one bullet in `docs/examples/index.md:7` that names `cubes3D`, the slider and click-to-inspect.

- [ ] 13. Run the gates. Run `npm run typecheck`, which covers the figure through `tsconfig.json:21`, then `npm run lint` and `npm run docs:build`. Fix any `fallow dupes` finding against `docs/examples/barChart.ts` (the vertex builder or the face join). Do this by extracting the duplicated piece into one small shared docs helper used by both figures, the same way `docs/examples/surfaceFigure.ts` was introduced. Do not extract anything before fallow reports it.

## Verification Criteria

- `npm run typecheck`, `npm run lint` and `npm run docs:build` pass. The module exports only `mountExplodedCubes` and imports the library only through `index.ts`.
- `git diff --stat -- index.ts src tests` is empty: the library is unchanged.
- In `npm run docs:dev` on `/examples/exploded-cubes`:
  - At explode 0, the figure is one solid 4 × 4 × 4 block with visible seams. At 1, it shows four evenly spaced layers, centred in the viewBox, and nothing is clipped at any rotation.
  - When the block is rotated 90 degrees by drag, the layers still separate along the block's own axis, not straight up the screen.
  - In a full drag rotation at explode 0, 0.5 and 1, no face shows through a cube in front of it, and no back face is visible.
  - Clicking a cube highlights it and fills the inspector with the correct layer, row, column and kind. A core cube, such as layer 2, row 2, column 2, can only be clicked once the layers are apart.
  - The selection stays on the same cube through drags, slider moves and the button animation. In the elements panel, the selected `g` node is the same node before and after a drag, and the number of child nodes in the cube layer stays constant during a drag.
  - Releasing a drag over a cube does not select it. Clicking empty space or pressing Escape clears the selection.
  - Dragging during the button animation rotates the block while the animation finishes. Moving the slider during the animation stops the animation.
  - With the SVG focused, the arrow keys and Page Up and Page Down move the selection, and typing in the docs search field does not.
- With reduced motion enabled in the OS, the button jumps to the target without animating.
- After navigating from the example to another page, the console shows no errors, and no transition timer keeps firing.
- Light and dark themes are both legible. At 375 px width, nothing overlaps and the page does not scroll horizontally.
- `docs/examples/barChart.ts` and `docs/examples/rotatingFigure.ts` have no diff, unless step 13 had to extract a shared helper.

## Potential Risks and Mitigations

1. **The `ccw` sign is the wrong way round for the culling.** All six face windings in `src/shapes/cubes.ts:46-74` run the same way (each normal points into the cube), so one test fits every face. Which value of the flag means "facing the camera" still has to be checked.
   Mitigation: check one known start orientation in `docs:dev` while building step 5, and flip the test once for all faces. If only some faces cull wrongly, the winding in `cubes.ts` is the bug: fix it in the library with a test. Do not special-case faces in the example.

2. **Sorting by centroid misorders cubes at some angles once the layers are apart.** The painter's sort uses one depth per cube.
   Mitigation: equal, axis-aligned cubes on a rectilinear lattice sort correctly by centroid under an orthographic projection, and a uniform vertical gap keeps them on such a lattice. If the dev check still shows a misorder, sort by layer, row and column, in the order the view direction sets per axis.

3. **A drag lands on a different cube than the one under the pointer at the start, or a short touch drag selects a cube.**
   Mitigation: d3-drag already suppresses the click after a moved drag (`node_modules/d3-drag/src/drag.js:37`, `:69`). If touch jitter still selects cubes, raise `clickDistance` in the shared scaffold for every figure. Do not special-case it here.

4. **The transition keeps running after unmount.**
   Mitigation: dispose interrupts the named transition on the host before clearing it, alongside removing the keyboard listener.

5. **`fallow dupes` flags the vertex builder or the face join shared with `docs/examples/barChart.ts`.**
   Mitigation: step 13 extracts one shared helper, but only after fallow reports a duplicate.

## Alternative Approaches

1. Radial explosion: each cube moves out along its direction from the centre. It reveals every core cube at once, but it loses the "layers" reading the brief asks for. A second mode on the same slider could add it later.
2. One `cubes3D` renderer per layer, offset by its origin: less work per frame, but the offset is in screen space and ignores the rotation. This is the wrong behaviour the page uses as its counter-example.
3. A d3 transition on each face's `d` attribute for the button: the usual d3 approach, but a drag during the animation overwrites it, and 384 path strings get interpolated instead of one number.
4. `iso3D` instead of `cubes3D`: rounded isometric boxes like `docs/examples/isoStack.ts`, but the view is fixed, so there is no drag rotation, and the brief names `cubes3D`.
