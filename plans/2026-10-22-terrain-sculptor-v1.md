# Terrain sculptor example

## Objective

Add a docs example, "Terrain sculptor", at `/examples/terrain-sculptor`. The figure is a 32 × 32 height field drawn with `gridPlanes3D` through the shared surface scaffold, `surfaceFigure` (`docs/examples/surfaceFigure.ts:35`).

- **Raise:** dragging on the surface raises the ground under a soft, round brush. Holding the pointer still keeps raising it, like an airbrush.
- **Lower:** an Alt drag (Option on macOS) or the "lower" mode lowers the ground instead.
- **Rotate:** dragging the background rotates the scene with the shared glide.
- **Brush ring:** a ring drawn on the terrain shows where the brush will act.
- **Readout:** shows the brush position and the height under it.
- **Reset:** the scaffold button restores the starting hills.
- **Keyboard:** the whole figure also works from the keyboard.

The page teaches three things:

1. **Unproject at the right height.** The pointer is unprojected onto the horizontal plane at the height of the quad under it, not onto y = 0. On a tilted view, the plane at y = 0 lands several cells away from the hill the pointer is over. Hit-testing the quad alone gives only cell resolution; unprojecting onto its plane gives a smooth position inside the cell. This is the main lesson.
2. **Two drags in one SVG.** A d3 drag on the surface group stops the event before the figure's rotation drag sees it, because d3-drag stops immediate propagation on `mousedown` and on `touchstart` (see `node_modules/d3-drag/src/drag.js`, the mousedowned and touchstarted handlers). So the surface sculpts and the background rotates, with no mode switch.
3. **Data at sixty frames a second.** The brush changes the sample heights in place, and the scaffold redraws them with a zero duration. There is no transition and no new join.

Assumptions:

- **No library changes.** `gridPlanes3D` and `unproject` are already public on every shape (`src/shapes/shape.ts:34`).
- **One additive scaffold change.** `surfaceFigure` returns its renderer as well, so the page can call `unproject` on it. The surface plot (`docs/examples/surfacePlot.ts:54`) keeps working unchanged.
- **Grid layout.** `sample` (`docs/examples/surfaceFigure.ts:20`) produces integer x and z from −16 to 15, z in the outer loop and x in the inner one. So the sample at x, z sits at index (z + 16) × 32 + (x + 16). The renderer scale is 10.
- **Up is negative y.** The screen y grows downwards, as with the bar heights in `docs/examples/barChart.ts`. Raising the ground therefore lowers y.
- **Height limits.** Heights are clamped to −12 and +12, the amplitude range of the surface plot.
- **No undo and no saving.**
- **Shared rules.** All rules from `AGENTS.md` apply: the docs zone reaches the library only through `../../index`, public functions are declared with `export function`, and there are no default exports.

## Implementation Plan

- [ ] 1. Return the renderer from `surfaceFigure`. In `docs/examples/surfaceFigure.ts`, add the `gridPlanes3D` renderer as `surface` to the returned object at `docs/examples/surfaceFigure.ts:102`, add it to the return type, and mention it in the doc comment. Rationale: `unproject` needs the renderer's current scale, origin and rotation, and only the scaffold holds it. The change is additive, so `docs/examples/surfacePlot.ts` needs no edit.

- [ ] 2. Create `docs/examples/terrainSculptor.ts`. It exports only `mountTerrainSculptor`, which takes the host element and returns a dispose function, like `docs/examples/surfacePlot.ts:54`.
  - Build it on `surfaceFigure` with the prefix `sculpt` and an aria label that names both drags and the keys.
  - The color function maps a height to a terrain ramp, built with d3 `piecewise` over six stops from the lowest height (+12) to the highest (−12): deep water, shallow water, sand, grass, rock, snow.
  - Import a sibling stylesheet `docs/examples/terrainSculptor.css`, as `docs/examples/surfacePlot.ts:14` does.

  Rationale: this is the house pattern of the surface family, and the scaffold already handles the drag rotation, the sort and the shading of back-facing quads.

- [ ] 3. Hold the terrain as the sample array returned by `sample`. The starting field is two or three gentle, overlapping sine hills about 4 high, so the ramp and the back-face tint show from the first frame. Keep a copy of the starting heights for "reset". Every edit writes the y of the samples in place and then calls the scaffold's `show` with duration 0. Rationale: `show` with a zero duration is how the surface plot's sliders redraw, so the surface plot's behaviour is the reference.

- [ ] 4. Turn the pointer into a brush centre. On pointer move over the surface group:
  - Read the quad under the pointer from the event target's datum: a `GridPlane` whose four corners carry their sample x, y and z.
  - Take the mean of the four corner heights as h.
  - Get the pointer position in the surface group's coordinates with d3's pointer helper.
  - Call the returned renderer's `unproject` with the plane through the point at height h whose normal points along y.
  - If the result is null, or outside the grid from −16 to 15 in x and z, there is no brush.
  - When the pointer is over the background rather than a quad, there is no brush either.
  - Store the brush centre and the pointer, so the ring and the readout can follow a glide as in `docs/examples/voxelBuilder.ts:320`.

  Rationale: this is the lesson of the page. Follow the pattern of the voxel builder's floor lookup at `docs/examples/voxelBuilder.ts:274`.

- [ ] 5. Sculpt with a d3 drag on the surface group.
  - **On start:** remember whether Alt is held, then start a d3 timer.
  - **Each timer tick:** apply the brush once at the current centre, using the elapsed time since the last tick, then redraw.
  - **Each drag event:** update the centre from the drag's source event, exactly as in step 4.
  - **On end:** stop the timer.

  The brush changes every sample within the radius R of the centre by the strength times the elapsed time times a Gaussian falloff of the distance, with sigma R / 2. Raise mode lowers y and lower mode raises it, and the result is clamped to ±12. Rationale: the timer makes a resting pointer keep sculpting, and the propagation stop described in the objective keeps the surface from also rotating.

- [ ] 6. Draw the brush ring as a closed `lineStrips3D` loop of 48 points at radius R around the centre. Each point takes the bilinear height of the samples at its position, so the ring lies on the terrain. Draw it in its own group after the quads so it stays on top, and turn off its pointer events in CSS. Hide it when there is no brush. Rationale: a ring on the surface is the cursor of a sculpting tool, and it also shows the radius setting.

- [ ] 7. Add a controls row below the SVG, in the style of `.surface-controls` in `docs/examples/surfacePlot.css`:
  - a radius slider, from 2 to 8 cells;
  - a strength slider;
  - a raise or lower radio pair;
  - a readout line with the brush position and the height under it to two decimals, and a polite live region for key actions.

  Relabel the scaffold button "reset", which restores the starting heights.

- [ ] 8. Add keyboard sculpting on the focusable SVG. Give it tabindex 0 and a ring that shows only for keyboard focus, as the exploded cube example does.
  - The arrow keys move the brush centre by one cell.
  - Enter raises once and Shift with Enter lowers once, each by one strength step.
  - The left and right bracket keys shrink and grow the radius.
  - Escape hides the brush.

  Announce the height under the brush in the live region. Attach the listener to the SVG only. Rationale: sculpting by drag is pointer-only.

- [ ] 9. Write `docs/examples/terrainSculptor.css`. Copy the token block and the dark-mode overrides of `docs/examples/surfacePlot.css`, then add:
  - the brush ring stroke, with no pointer events;
  - a crosshair cursor over the quads and the grab cursor over the background;
  - the controls row;
  - stacking at phone width.

- [ ] 10. Write the page `docs/examples/terrain-sculptor.md`. Copy the frontmatter and mount block of `docs/examples/voxel-builder.md`, then add one interaction line and these sections, each with a short excerpt:
  - "Two drags in one figure";
  - "Unproject at the right height", with a sentence on how far off the plane at y = 0 lands on a tilted hill;
  - "A brush is a falloff";
  - "Sixty frames without a transition";
  - "The whole source", which includes the module and links `docs/examples/surfaceFigure.ts` and `docs/examples/rotatingFigure.ts`.

- [ ] 11. Register the page in the sidebar and the gallery:
  - add the sidebar entry "Terrain sculptor" anywhere in the example list of `docs/.vitepress/config.ts`, which sorts its entries by name;
  - add a bullet after the surface plot line in `docs/examples/index.md:5`, naming `gridPlanes3D`, `lineStrips3D` and `unproject`.

- [ ] 12. Run the type, lint, docs-build and audit gates, and fix what they report:
  - `npm run typecheck`, `npm run lint` and `npm run docs:build`;
  - the project-pinned fallow audit through npx.

  If `fallow dupes` flags code shared with the surface plot, such as the tooltip positioning, extract the reported piece only.

## Verification Criteria

- `npm run typecheck`, `npm run lint`, `npm run docs:build` and the fallow audit pass, and `git diff --stat -- index.ts src tests` is empty.
- The surface plot page still renders and behaves exactly as before.
- **Brush position:** with a hill 10 high and the default tilt, the readout's x and z lie inside the quad under the pointer at every point of the hill's slope. The brush ring is drawn around the pointer, not offset towards the base.
- **Sculpting:** a drag on the surface changes heights only within the radius, and the change is strongest at the centre. A resting pointer keeps raising. Alt or "lower" mode lowers. Heights never pass ±12.
- **Two drags:** a drag on the surface never rotates the scene, and a drag on the background rotates it and glides.
- **Frame time:** in the browser's performance panel, a sculpting frame (brush, redraw and sort of 1024 quads) stays under 16 ms on a laptop.
- **Keyboard:** the arrows, Enter, Shift with Enter, the brackets and Escape work, and the live region announces the height.
- **Clean unmount:** after leaving the page during a sculpt or a glide, the console has no errors and no timer keeps firing.
- **Themes and width:** light and dark themes are legible, and at 375 px nothing overlaps.

## Potential Risks and Mitigations

1. **The 1024-quad redraw and sort per frame drop frames on slow machines.**
   Mitigation: the timer applies the brush once per frame, not once per pointer event. If it is still slow, redraw only every other frame during a sculpt. Do not change the grid size of the shared scaffold.

2. **The scene keeps gliding while the user starts sculpting,** because the glide only stops when the figure's own drag starts.
   Mitigation: accept this in the first version, since a glide ends within about two seconds. If it bothers, expose a stop function from `dragRotate` in a separate commit, because that touches every rotating figure.

3. **The quad under the pointer faces away from the camera**, seen from below.
   Mitigation: its corner heights are still correct, so the plane at its height is still right. Check it once at a steep tilt.

4. **The ring intercepts the pointer and the target becomes the ring.**
   Mitigation: the ring has no pointer events (step 9).

## Alternative Approaches

1. **A sculpt mode inside the surface plot:** no new page, but it mixes a tool into a chart and conflicts with the plot's tooltip.
2. **Unproject onto y = 0:** simpler, but on a tilted view the brush lands beside the hill. This is the error the page teaches.
3. **Hit-testing the quad only:** no unproject at all, but the brush jumps from cell to cell and the position has whole-cell resolution.
