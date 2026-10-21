# Mesh inspector example

## Objective

Add a docs example, "Mesh inspector", at `/examples/mesh-inspector`. It shows a low-poly triangulated object. Four checkboxes switch the faces, the edges, the normal vectors and the back faces on and off. Dragging rotates the object. Clicking a face selects it: the face and its normal are highlighted, and an inspector line shows the face number, whether it faces the camera, its `ccw` flag, its depth and its place in the paint order. The selection survives rotation and every toggle.

The page teaches four things, each tied to one part of the code:

- **`triangles3D`**: a mesh is a plain list of point triples. The renderer hands back each triangle with `ccw` and `centroid`.
- **`lines3D`**: a normal is a two-point segment from a face's centroid along its normal. It goes through a second renderer with the same settings as the faces, so every normal stays attached to its face.
- **Polygon orientation**: every triangle is wound the same way as seen from outside. After the rotation, `ccw` therefore says whether a face points at the camera or away from it. The inside of an open object consists of back faces, so turning back faces off makes the inside disappear.
- **Depth sorting**: back-face culling is not enough for a non-convex object, because front faces still overlap. The faces and the normals go into one painter's list, ordered by the library `sort`, so a normal that points away from the camera is hidden behind its own face.

**Styling lives in the TS module.** There is no `.css` file and no `<style>` block in the page, so the module is the only file a reader has to copy for the look. `docs/examples/floorPlan.ts` is the precedent. It defines its colors as `light-dark()` constants (`docs/examples/floorPlan.ts:36-45`), styles the box, the button, the SVG and the controls inline (`docs/examples/floorPlan.ts:317-354`), and sets the mark colors in the join with `style`, not `attr`. Its page explains this approach in "No stylesheet" (`docs/examples/floor-plan.md:207-227`).

Assumptions:

- **The object is a lathe vase**: a profile curve turned around the vertical axis, with an open top and a closed bottom (a fan), about 12 segments around and 6 rings, roughly 130 to 150 triangles. A vase is open, so its inside is made of back faces and the back-face toggle visibly changes something. A closed convex object would hide every back face behind a front face. Its profile is non-convex (a bulb, a neck and a flared lip), so front faces overlap and depth sorting matters. The faces are large enough to click.
- **Edges are the strokes of the face paths**, not a separate `lines3D` mesh. A stroke is hidden by the same painter's order as its face, so hidden edges need no separate handling. `lines3D` is used where only it fits: the normals.
- **The module keeps importing the two shared docs helpers**: `rotatingFigure` (`docs/examples/rotatingFigure.ts:42`) for the SVG and the drag, and `placeSegments` (`docs/examples/segments.ts:8`) for the normal lines. This is how `floorPlan.ts` and `networkExplorer.ts` do it. Inlining them would duplicate code that `fallow dupes` reports. The request covers the styling, and the page links both helpers, as `docs/examples/network-explorer.md` does.
- The library (`index.ts`, `src/**`) does not change. Everything the figure needs is already public: `triangles3D`, `lines3D`, `sort`, `Triangle`, `Line`, `Point3D` and `ShapeInstance` (`index.ts:8-50`). No new export means no new test.
- `CHANGELOG.md` is not touched, because it only records library changes.
- The working tree on `feat/terrain-plot` holds uncommitted work on other examples (exploded cubes, floor plan, network explorer, projection playground, solar system rename). This example only shares `docs/.vitepress/config.ts` and `docs/examples/index.md` with that work. Commit that work first, so this example lands in its own commit.

## Implementation Plan

- [ ] 1. Create `docs/examples/meshInspector.ts`. It exports only `mountMeshInspector(host)`, which returns a dispose function, like `docs/examples/floorPlan.ts`. Mount it through `rotatingFigure` with the prefix `mesh` and an aria-label that names the object and the interactions. Do not import a stylesheet. Rationale: this matches the newest house pattern for a self-styled figure, and the module stays the only file that carries the look.

- [ ] 2. Declare the theme colors as `light-dark()` string constants at the top of the module, following `docs/examples/floorPlan.ts:36-45`: ink, muted, line, paper, button, an accent for the selection, and two shading ramps, one for the outside (front faces) and one for the inside (back faces). For each ramp, use a light and a dark endpoint in each theme, so `light-dark()` wraps the interpolated color, as `shade` does in `docs/examples/floorPlan.ts:202`. Give the two ramps clearly different hues, for example a blue outside and a warm inside, so orientation reads at a glance. Rationale: a single place for every color, and a theme switch recolors the figure without a redraw.

- [ ] 3. Build the mesh once, at module level. Sample the profile as radius by height for the rings. For each ring pair and segment, emit two triangles, and for the bottom, emit a fan around a centre vertex. Wind every triangle the same way as seen from outside the vase. Up is negative y, as in the other figures. Precompute each face's unit normal in model space (the cross product of two edges) and the normal segment from the face's centroid to the centroid plus a fixed length along that normal. Rationale: `ccw` only means "faces the camera" if the winding is consistent. Computing the normals once in model space keeps them in step with the rotation for free.

- [ ] 4. Set up two renderers: `triangles3D` for the faces and `lines3D` for the normals. Give both the same scale and origin once, and the same rotation on every render, through one list of renderers, as in `docs/examples/networkExplorer.ts:99`. Rationale: this is the lesson of the `lines3D` part. If one renderer drifts from the other, the normals come loose from their faces.

- [ ] 5. Keep one state (yaw, pitch, the four toggles, the selected face index) and one render function. The drag callback, the checkboxes, the face number input and the reset button only write to the state and call render, as in `docs/examples/explodedCubes.ts`.

- [ ] 6. Render the faces. Project the mesh, then stamp each projected triangle with its index and its shade after the projection, as in `docs/examples/solarSystem.ts:149`. Compute the shade from the triangle's rotated vertices: the absolute z component of the rotated normal over its length. Pick the outside ramp when `ccw` marks the face as front-facing, and the inside ramp otherwise. Join the paths keyed by index. Set the fill and the stroke in the join with `style`, following floorPlan: the fill is `none` when the faces toggle is off, and the stroke is `none` when the edges toggle is off. A back face gets a `visibility` attribute of `hidden` while the back-face toggle is off. Do not filter it out of the data, so a drag never adds or removes elements (`docs/examples/explodedCubes.ts:155`). Give the face paths the `pointer-events` value `visible`, so an unfilled face in wireframe mode can still be clicked, while a hidden back face cannot. Rationale: stable elements keep the selection on the same node, and the shade from the rotated normal shows that orientation and lighting come from the same vector.

- [ ] 7. Render the normals. Project the normal segments with `lines3D` and join them as `<line>` elements keyed by face index, in the same group as the face paths. Place them with `placeSegments`. Hide a normal with its face when its face is a hidden back face, and hide all normals while the normals toggle is off. Give the lines `pointer-events: none`, so clicks reach the faces. Rationale: the normals are optional, as the brief says, and they never get in the way of picking.

- [ ] 8. Sort faces and normals together. After both joins, select the paths and the lines of the group as one selection and order it with the library `sort`, which only reads `centroid.z`, a field both `Triangle` and `Line` have. Rationale: one painter's list, so a normal that points away from the camera is painted under its own face, and a front-facing normal is painted over the faces behind it. This is the depth-sorting lesson. Culling alone does not order the overlapping front faces of the vase's neck and lip.

- [ ] 9. Highlight the selection in the same join. The selected face gets the accent stroke and a thicker stroke width, and its normal gets the accent color, both set with `style` on every render, as floorPlan sets the selected room's stroke (`docs/examples/floorPlan.ts:431`). Show the selected face's normal even while the normals toggle is off, so a selected face always shows which way it points.

- [ ] 10. Add the controls and the inspector below the SVG with `insertAdjacentHTML` and inline styles, following `docs/examples/floorPlan.ts:335-347`. Add four labelled checkboxes (faces, edges, normals, back faces), with faces, edges and back faces on and normals off by default. Add a number input "face" from 0 to the face count minus 1, where an empty value means no selection. Add an inspector paragraph with two spans. The first, with `aria-live="polite"`, names the selected face and its vertices in model coordinates, and changes only when the selection changes. The second shows what changes with the rotation: front or back facing, the `ccw` flag, the rotated normal's z, the centroid depth, and the face's paint position as "painted k of N". With nothing selected, it shows a one-line hint. Split it the same way as the two inspector spans in `docs/examples/explodedCubes.ts`. Rationale: a screen reader hears the selection once instead of a stream of depth values during a drag, and the number input is the keyboard path to every face.

- [ ] 11. Wire the input. A click on the SVG reads the datum of a face path under the pointer. Clicking the selected face or empty space clears the selection, as in `docs/examples/explodedCubes.ts:215`, and d3-drag swallows the click that ends a drag. The checkboxes write their toggle and render. The face input selects by index. The scaffold button becomes "reset": it restores the default toggles and clears the selection, as in `docs/examples/networkExplorer.ts:282`. Style the host box, the SVG (grab cursor, `touch-action: none`) and the button inline, as in `docs/examples/floorPlan.ts:317-354`. Dispose clears the host's markup and removes its inline style, as in `docs/examples/floorPlan.ts:627`, so the Vue host is left as it was mounted.

- [ ] 12. Write the page `docs/examples/mesh-inspector.md`. Copy the frontmatter and mount block of `docs/examples/floor-plan.md:1-23`, with the host class `mesh-inspector` and no `<style>` block. Below them, write one interaction line, then these sections, each with a short excerpt of the figure's code:
  - "A vase of triangles": the lathe and the consistent winding.
  - "Front or back": `ccw`, the rotated normal's z, and why the inside of the vase is made of back faces.
  - "Normals with lines3D": two renderers, one set of settings.
  - "One painter's list": faces and normals sorted together, and why culling is not enough for this shape.
  - "Picking a face": the index stamped after the projection, `pointer-events: visible`, the face input.
  - "No stylesheet": two sentences and a link to the floor plan's section, not a repeat of it.
  - "The whole source": link `meshInspector.ts`, `rotatingFigure.ts` and `segments.ts`, then include the module with `<<< @/examples/meshInspector.ts`.

- [ ] 13. Register the page. Add the sidebar entry "Mesh inspector" right after "Solar system" in `docs/.vitepress/config.ts:43`, next to the other `triangles3D` figure. Add one bullet after `docs/examples/index.md:15` that names `triangles3D`, `lines3D`, the four toggles and click-to-inspect.

- [ ] 14. Run the gates: `npm run typecheck`, `npm run lint` and `npm run docs:build`. If `fallow dupes` reports a clone against `docs/examples/solarSystem.ts` (the triangle join) or `docs/examples/explodedCubes.ts` (the click handler or the inspector), extract only the reported piece into a small shared docs helper. Do not extract anything before fallow reports it.

## Verification Criteria

- `npm run typecheck`, `npm run lint` and `npm run docs:build` pass.
- `git diff --stat -- index.ts src tests` is empty.
- `docs/examples/meshInspector.ts` imports only `d3`, `../../index`, `./rotatingFigure` and `./segments`.
- No `meshInspector.css` exists, and `docs/examples/mesh-inspector.md` contains no `<style>` block.
- In `npm run docs:dev` on `/examples/mesh-inspector`:
  - At the start angle, the outside of the vase shows in the outside hue and the inside, seen through the open top, in the inside hue.
  - With back faces off, the inside disappears and the far wall shows through the opening as empty space. No front face disappears at any drag angle.
  - For every face, the inspector's front/back label, the `ccw` flag and the sign of the rotated normal's z agree at every angle.
  - With normals on, every normal starts on its face and stays attached through a full drag rotation. A normal that points away from the camera is hidden behind its face and never painted over it.
  - In a full drag rotation, no face of the neck or lip shows through a face in front of it.
  - With faces off and edges on, the figure is a wireframe and its faces can still be clicked. A hidden back face cannot be clicked.
  - Clicking a face highlights it and its normal, and fills the inspector. The highlight and the inspector stay on the same face through drags and every toggle. Releasing a drag over a face does not select it. Clicking the selected face or empty space clears the selection.
  - Typing an index in the face input selects that face, and clearing the input clears the selection.
  - Reset restores faces, edges and back faces on, normals off, and no selection.
  - The number of child nodes of the figure group stays constant during a drag and when the toggles change.
- Light and dark themes are both legible, and switching the theme recolors the figure without a reload.
- At 375 px width, the controls wrap, nothing overlaps and the page does not scroll horizontally.
- After navigating away from the page, the console shows no errors, and the Vue host carries no leftover inline style.

## Potential Risks and Mitigations

1. **The winding is the wrong way round, so `ccw` marks the outside as the back.**
   Mitigation: check one known orientation in `docs:dev` while building step 6 and flip the winding of the generator once, for every triangle, including the bottom fan. Do not invert the test per face. If only some faces are wrong, the generator's winding is inconsistent and needs a fix there.

2. **Sorting by centroid misorders some faces at certain angles.** A painter's sort with one depth per triangle can fail where long triangles overlap, for example where the neck meets the lip.
   Mitigation: keep the triangles small and evenly sized by sampling the profile densely enough where it bends. If a misorder still shows, add a sentence to the page saying this is the known limit of a painter's sort, rather than adding a depth-splitting step to the example.

3. **A normal sorted by its midpoint is partly covered by a neighbouring face near its base.**
   Mitigation: this only clips the first few pixels of the normal and is acceptable. If it hides the direction, shorten the gap by sorting each normal by its face's centroid nudged toward the camera, and mention it in the "One painter's list" section.

4. **Inline styles override nothing the theme sets, and `light-dark()` falls back to light outside VitePress.**
   Mitigation: this is intended. VitePress sets `color-scheme` on the root (`node_modules/vitepress/dist/client/theme-default/styles/base.css:246-252`), so the docs follow the theme. A copied module on a page without `color-scheme` shows the light colors. The "No stylesheet" section states this in one sentence, as the floor plan's section does.

5. **The inspector rewrites its text on every drag frame.**
   Mitigation: only the second span updates during a drag, and only its text changes. The `aria-live` span changes only with the selection.

## Alternative Approaches

1. **A torus instead of a vase**: it is closed and non-convex, so depth sorting shows, but a closed mesh hides every back face behind a front face, and the back-face toggle would change nothing while the faces are opaque. It could come back as a second object in a picker.
2. **Edges as a separate `lines3D` mesh of unique edges**: this shows `lines3D` twice, but the edges would need their own hidden-line handling, and they would be drawn twice per shared edge or need an edge index. Strokes on the faces get occlusion for free.
3. **A sibling `meshInspector.css` with classes toggled on the host**, as in `docs/examples/explodedCubes.ts`: a toggle would need no redraw, but the look would live in a second file, which the request rules out.
4. **A "depth sort" toggle that paints in data order**: this would show sorting failures live, at the cost of one more control. Add it if the page section alone does not land.
5. **Inlining the drag and `placeSegments`**, to make the module a single file with no local imports: easier to copy, but it duplicates `rotatingFigure.ts` and `segments.ts`, and `fallow dupes` would fail the lint.
