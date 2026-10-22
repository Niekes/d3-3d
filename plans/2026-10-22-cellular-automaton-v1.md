# 3D cellular automaton example

## Objective

Add a docs example, "Cellular automaton", at `/examples/cellular-automaton`. A 12 × 12 × 12 grid of cells stands on a floor, and every live cell is a unit cube. One generation follows from the last by a rule that counts each cell's 26 neighbours.

- **Rule presets:** a select picks one of three rules, written as survive and birth counts:
  - "4555": survive on 4 or 5, born on 5;
  - "5766": survive on 5 to 7, born on 6;
  - "Clouds": survive on 13 to 26, born on 13, 14 or 17 to 19.
- **Stepping:** a step button advances one generation, and play runs the generations at a speed set by a slider.
- **Seeding:** a "new seed" button scatters a random soup. A seeded generator makes every seed reproducible.
- **Age colours:** a cube is coloured by how many generations it has lived.
- **Rotating:** dragging the background rotates the scene with the shared glide.
- **Readout:** the generation, the number of live cells and the number of faces drawn.

The page teaches three things:

1. **Only the surface is drawn.** A face that touches another live cell, or rests on the floor, is dropped before the face join, exactly as in the voxel builder (`docs/examples/voxelBuilder.ts:198-201`). In a dense rule such as "Clouds", most faces are hidden, and the faces-drawn count makes the saving visible. This is the main lesson.
2. **Stable elements across generations.** Cubes are joined by their cell key, so a cell that survives keeps its element. Only births and deaths add or remove elements. Faces are joined by their face name, through `joinFaces` (`docs/examples/cubeFaces.ts:10-19`).
3. **Equal cubes on a grid sort exactly.** Under an orthographic projection, `sort` (`src/sort.ts:7`) orders unit cubes on a grid correctly by their centres. Nothing more is needed, even for a thousand cubes.

Assumptions:

- **No library changes.** `camera3D`, `cubes3D`, `planes3D`, `lines3D`, `box` and `sort` are exported from `index.ts`. So `git diff -- index.ts src tests` stays empty.
- **A dead border.** Cells outside the grid count as dead, and the grid does not wrap around. The torus is listed under alternatives.
- **Two states only.** A cell is alive or dead. The multi-state rules from the literature, with decaying cells, are left out.
- **The floor is the bottom of the grid.** Layer 0 rests on the plane y = 0, and layers rise towards negative y, as in `docs/examples/voxelBuilder.ts:118-130`. The camera stays above the floor because `pose` clamps its tilt between 10 and 85 degrees (`docs/examples/floorView.ts:12`), so the floor never enters the depth sort.
- **Orthographic.** The camera keeps the default orthographic projection, and `.perspective` (`src/shapes/shape.ts:81-94`) stays unset. Lesson 3 holds only without perspective.
- **Shared rules.** All `AGENTS.md` rules apply. The styles live in the module, as in `docs/examples/voxelBuilder.ts:439`. `CHANGELOG.md` is not touched.

## Implementation Plan

- [ ] 1. Share the voxel grid helpers. If `docs/examples/cubeFaces.ts` does not export them yet, move the `Cell` type, the face steps, `keyOf` and `neighborOf` out of the voxel builder and into `cubeFaces.ts`. They live at `docs/examples/voxelBuilder.ts:30`, `:48-55`, `:99` and `:112-115`.
  - The voxel builder imports them back and behaves exactly as before.
  - `cubeFaces.ts` holds `joinFaces`, its only export since `box` replaced the cube corners, so the face steps belong next to it.
  - If the packing playground has already done this move, reuse its exports.

  Rationale: both new grid figures need the same face-to-neighbour table. A third copy is what `fallow dupes` would report.

- [ ] 2. Create `docs/examples/cellularAutomaton.ts`, which exports only `mountCellularAutomaton`, returning a dispose function. Mount it through `rotatingFigure` (`docs/examples/rotatingFigure.ts:155-174`) with the prefix `cells`. Hand the scaffold's button to `playback` (`docs/examples/rotatingFigure.ts:181-204`), so it becomes play and pause.

  Keep the state in one place:
  - the cells as a `Uint8Array` of 12³ entries, indexed by layer, row and column;
  - a matching array of ages;
  - the rule;
  - the seed;
  - the generation;
  - yaw and pitch.

  One render function reads the state. Rationale: this is the house pattern of every rotating figure.

- [ ] 3. Write the generation step as a plain function of the cells, the ages and the rule.
  - **Counting:** for every live cell, add one to the count of each of its 26 neighbours that lies inside the grid.
  - **The new state:** a live cell survives when its count is in the survive set. A dead cell is born when its count is in the birth set.
  - **Ages:** a survivor's age grows by one, and a newborn starts at 0.
  - **The end of a run:** the step reports whether the grid changed. Play stops on its own when the grid dies out or stands still, and the live region says which.

  The rule presets are data: a name, the survive counts, the birth counts and the seed spec (the soup's size and density). The soups:
  - "4555" and "5766": the central 6³ cells, at a density of 0.3;
  - "Clouds": the whole grid, at a density of 0.5.

  Seed with `randomLcg` from d3, so "new seed" draws a fresh seed and switching the rule replays the current one. Rationale: counting outwards from the live cells costs 26 operations per live cell rather than 26 per cell, and a pure step is easy to check by hand.

- [ ] 4. Hang every renderer on one `camera3D`, as in `docs/examples/voxelBuilder.ts:148-152`, and pose that camera once per render with `pose` (`docs/examples/floorView.ts:20-32`), with a view whose centre is the middle of the grid. `pose` turns it through `turnCamera` (`docs/examples/rotatingFigure.ts:138-148`). Choose the scale so that the 12³ volume fits the 960 × 500 view box at every tilt the clamp allows. The renderers:
  - `planes3D` for the floor;
  - `lines3D` for its 13 grid lines in each direction, placed with `placeSegments` (`docs/examples/segments.ts:8`);
  - `cubes3D` for the live cells.

  Draw the floor in its own group before the cubes, as in `docs/examples/voxelBuilder.ts:188-190`. Rationale: the shared camera keeps the floor behind everything, so the scene needs no extra sort.

- [ ] 5. Build each live cell's cube from `box` (`src/box.ts:15-42`), with a unit footprint and a unit height, and spread the cell's datum onto its corners. `docs/examples/barChart.ts:42-48` does the same with its bars. Every vertex carries:
  - the cell key;
  - the column, layer and row;
  - the age bucket.

  Join one group per cube, keyed by the cell key, and sort the groups with `sort`. Drop a face before the face join when `neighborOf` lands on a live cell or below the floor, then join the remaining faces with `joinFaces`. Rationale: the datum survives the transform, so a face knows its cell without a lookup.

- [ ] 6. Colour by age in four buckets: born this generation, 1, 2 to 4, and 5 or more. Use classes on the cube group, as the colour classes do in `docs/examples/voxelBuilder.ts:513-535`. Shade each face by its name, as in `docs/examples/voxelBuilder.ts:537-552`. Rationale: classes keep the figure free of inline fills and give dark mode its own tokens.

- [ ] 7. Add a controls row below the SVG, inserted as in `docs/examples/voxelBuilder.ts:167-185`. It holds:
  - the rule select;
  - a step button;
  - a "new seed" button;
  - a speed slider, from 1 to 10 generations per second, with an output;
  - a readout with the generation, the live count and "faces drawn";
  - a polite live region.

  Play accumulates the elapsed time from `playback` and advances one generation per interval of the speed. Rationale: native controls give keyboard and screen-reader support for free.

- [ ] 8. Add keyboard control on the focusable SVG, with a ring that shows only for keyboard focus, as in `docs/examples/voxelBuilder.ts:493-501`. While the SVG has focus:
  - Enter or the right arrow steps one generation;
  - Space plays or pauses;
  - N draws a new seed;
  - the digits 1 to 3 pick a rule.

  The live region announces the generation and the live count after a manual step, a new seed or a rule change, and once when play stops. Attach the listener to the SVG only. Rationale: announcing every frame of play would flood a screen reader.

- [ ] 9. Handle motion and disposal.
  - **No autoplay:** the figure starts paused on its seed, so nothing moves until someone presses play.
  - **Reduced motion:** the glide follows the shared drag (`docs/examples/rotatingFigure.ts:48`).
  - **Dispose:** stop play with `play(false)`, as in `docs/examples/solarSystem.ts:179-182`, clear the host and remove its class.

- [ ] 10. Write the inline style constant with the prefix `--ca-` and its dark-mode overrides under `.dark`. It covers:
  - the floor and grid;
  - the four age colours;
  - the face shading;
  - the focus ring;
  - the controls row, which stacks at phone width.

  Follow `docs/examples/voxelBuilder.ts:439-643`.

- [ ] 11. Write the page `docs/examples/cellular-automaton.md`, with the mount block of `docs/examples/voxel-builder.md`, an interaction line, and these sections:
  - "Twenty-six neighbours": the Moore neighbourhood, the survive and birth notation and the dead border;
  - "One generation": counting outwards from the live cells;
  - "Only the surface": the face culling shared with the voxel builder, and the faces-drawn count;
  - "Cubes that live on": the keyed join, and the ages;
  - "The whole source".

- [ ] 12. Register the page in the sidebar and the gallery:
  - a sidebar entry "Cellular automaton" in the list at `docs/.vitepress/config.ts:79-100`, which sorts by name;
  - a bullet in `docs/examples/index.md` after the voxel builder line, naming `cubes3D`, `planes3D`, `lines3D` and `box`.

- [ ] 13. Run the type, lint, docs-build and audit gates, and fix what they report:
  - `npm run typecheck`, `npm run lint` and `npm run docs:build`;
  - the project-pinned fallow audit through npx.

  Extract a further shared helper only for a duplicate that fallow reports, for example the floor and grid constants of the voxel builder.

## Verification Criteria

- The gates pass, and `git diff --stat -- index.ts src tests` is empty. The voxel builder still passes its own verification criteria after step 1.
- **The rule, by hand:** a throwaway script in the scratchpad (not committed) runs the step function on a 2 × 2 × 2 block in the middle of the grid. Every block cell has 7 live neighbours, and no empty cell has more than 4.
  - Under "5766" the block is unchanged, and the step reports "no change".
  - Under "4555" the block is gone after one step.
- **Reproducible seeds:** switching away from a rule and back restarts the same soup. After 20 steps, the live count is the same in both runs.
- **Face culling:** a single isolated cube in mid-air shows 6 faces in the count, and one on the floor shows 5.
- **Element stability:** a mutation observer on the cube layer sees no additions or removals during a drag. During a step, it sees exactly the births and the deaths.
- **Painting order:** through a full turn of a dense "Clouds" grid, no face shows through a cube in front of it, and the floor is never drawn over a cube.
- **Play:** at speed 5, ten generations take about two seconds. Play stops by itself on a still grid and announces it.
- **Keyboard:** Enter, the right arrow, Space, N and the digits 1 to 3 work. Typing in the docs search field does nothing to the figure.
- **Clean unmount:** no console errors and no running timer after leaving the page mid-play.
- **Themes and width:** light and dark themes are legible, and at 375 px nothing overlaps and the page does not scroll sideways.

## Potential Risks and Mitigations

1. **A dense rule fills the grid and makes the rotation drag stutter.** "Clouds" can hold more than 800 live cells.
   Mitigation: face culling keeps the DOM to the outer surface. If a drag still drops frames at the full grid, shrink it to 10³, which is one constant.

2. **The random soups of "4555" and "5766" die out within a few generations.**
   Mitigation: tune the soup size and density per preset during the dev check, and keep them in the preset data. The stop message tells the visitor to draw a new seed.

3. **Moving the helpers in step 1 changes the voxel builder.**
   Mitigation: the move only changes imports. Run the voxel builder's neighbour-culling check, "8 cubes · 20 faces drawn" for a solid 2 × 2 × 2 block, before and after.

4. **A run of steps during a glide re-renders twice per frame.**
   Mitigation: render once per animation frame. Both the step and the rotation only write the state and request a render.

## Alternative Approaches

1. **A wrap-around grid (a torus):** shapes that leave one side come back on the other, but a cluster split across an edge is hard to read in 3D.
2. **Click to toggle a cell:** the voxel builder's face-to-neighbour picking would allow drawing seeds by hand, at the cost of a second interaction mode on the page.
3. **Multi-state rules with decaying cells:** the colourful rules from the literature need an age threshold per rule. The age colours already show some of that look.
4. **Canvas rendering through `.matrix`:** much larger grids become possible, but the page would lose its face-culling lesson.
