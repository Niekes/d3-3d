# Data-update stress test example

## Objective

Add a docs example, "Data-update stress test", at `/examples/data-update`. Up to 36 labelled cubes stand on a 6 × 6 floor, and buttons add, remove, reorder and move them. Each update is drawn as d3 sees it: which elements enter, which update and which exit.

- **Actions:**
  - "add" places one to three new cubes with fresh ids on free cells;
  - "remove" takes one to three cubes away;
  - "shuffle" reorders the data array and changes nothing else;
  - "move" sends one to three cubes to free cells.
- **Stress:** the scaffold button plays and pauses a loop that runs a random action every 500 ms and keeps between 6 and 30 cubes.
- **Key:** a toggle joins the cubes by id or by array index.
- **Colours:** entering cubes flash green and fade in. Updated cubes whose cell changed flash blue and slide. Exiting cubes turn red and fade out.
- **Adopted elements:** an element that is now bound to a different id from the one it entered with gets a dashed outline.
- **Counters:** the readout shows the sizes of the last enter, update and exit selections, their running totals, and the number of adopted elements.
- **Rotate:** dragging the figure rotates it with the shared glide, and no update ever resets the rotation.

The page teaches four things:

1. **A key is an identity.** Joined by id, a shuffle enters nothing, exits nothing and moves nothing. Joined by index, the same shuffle rebinds the elements to other cubes, which then slide across the floor, and the adopted count grows. Removing a cube from the middle of the array shows the same thing: by index, the last element exits and every later one slides. This is the main lesson.
2. **The id survives the projection.** `transform` spreads every datum into its transformed point (`src/transform.ts:33`), and `points3D` adds the centroid in place (`src/shapes/points.ts:17`), so a label still carries its id. `cubes3D` returns fresh arrays for the cubes, so the id rides on the vertices and is attached again from the first one, as the bar chart does (`docs/examples/barChart.ts:78`).
3. **The view is not the data.** The rotation lives in the camera, and the camera is never touched by an update. So adding cubes during a glide never makes the scene jump.
4. **Enter, update and exit.** These are the three sets of a keyed join. The page shows them with the counters next to the cubes they describe.

Assumptions:

- **No library changes.** `cubes3D`, `points3D`, `planes3D`, `lines3D`, `camera3D`, `box` and `sort` are public.
- **One camera.** All four renderers hang on one `camera3D` through `camera` (`src/shapes/shape.ts:146`). It is posed with `pose` (`docs/examples/floorView.ts:20`), which places the pivot and turns the camera through `turnCamera` (`docs/examples/rotatingFigure.ts:138`) within the floor's tilt limits, so the floor stays behind every cube and needs no sort.
- **Orthographic.** The camera keeps the default `perspective` of `Infinity` (`src/shapes/shape.ts:88`). The lesson is the join, not the projection.
- **Cubes.** Each cube is built with `box` (`src/box.ts:15`): it stands on its cell at y = 0 with a footprint of 0.7, and a height from 0.5 to 2.5 is drawn once at birth. Up is negative y. Every vertex carries the id and the height.
- **Ids.** They are "c1", "c2" and so on from a counter that never repeats an id.
- **Shared rules.** All `AGENTS.md` rules apply. The styles live in the module, as in `docs/examples/voxelBuilder.ts:439`.

## Implementation Plan

- [ ] 1. Create `docs/examples/dataUpdate.ts`, which exports only `mountDataUpdate`, returning a dispose function. Mount it through `rotatingFigure` (`docs/examples/rotatingFigure.ts:155`) with the prefix `update`. Add the change since the last report of the scaffold to yaw and pitch, as `docs/examples/floorPlan.ts:306` does, so the keys can turn the view too, and hand both to `pose` on every draw.
  - Keep the state in one place: the cube data in array order, the key mode, the next id, the counters, yaw and pitch.
  - One draw function takes a duration: zero while the figure rotates, 600 ms after an action.

  Rationale: this is the pattern of the bar chart's draw (`docs/examples/barChart.ts:110`), and it keeps a drag frame from replaying a transition.

- [ ] 2. Project on every draw.
  - The floor is a `planes3D` slab under the 6 × 6 cells, and its grid lines come from `lines3D`, placed with `placeSegments` (`docs/examples/segments.ts:8`).
  - The cubes come from `cubes3D`, with the id attached again from the first vertex as in `docs/examples/barChart.ts:86`.
  - The labels are `points3D` at 0.3 above the top centre of each cube, carrying the id and drawn as text.

- [ ] 3. Join the cube groups with the key from the toggle: the id, or the index in the array. Use the join callbacks to classify the elements.
  - **Enter:** append the group, store the id it was born with in a d3 local, and fade it in with a green flash.
  - **Update:** compare the datum with the cell last drawn, which is kept in a second d3 local. Flash blue only when the cell changed.
  - **Exit:** mark it red, fade it out over the duration, then remove it.
  - Count the three selection sizes into the last-update and running counters.
  - Mark an element as adopted when its born-as id differs from its datum's id, and count the adopted elements.
  - Sort the groups with `sort` on the centroid of each cube's bottom face, as the bar chart does (`docs/examples/barChart.ts:82`). The cubes differ in height, and the centre of a tall cube would paint over a short cube in front of it.

  Join the labels with the same key, so they slide to other cubes when the cubes do.

  Rationale: the d3 locals hold an element's history without touching the data, which is what makes adoption visible.

- [ ] 4. Draw the faces inside every group, keyed by face name and hidden when their `ccw` is false, as `joinFaces` (`docs/examples/cubeFaces.ts:10`) does. Set the path through a transition of the draw's duration, as `docs/examples/barChart.ts:130` does, so updated cubes slide between cells. A zero-duration draw interrupts a running transition and snaps it. Rationale: the slide is what shows a wrong key. The same number of path commands on every face keeps the string interpolation exact.

- [ ] 5. Write the four actions as pure changes to the data array, each followed by a draw with the action duration:
  - add picks free cells at random;
  - remove picks random cubes;
  - shuffle uses d3 `shuffle` on a copy of the array;
  - move picks random cubes and free cells.

  Disable add at 36 cubes and remove at none. Drive stress with `playback` (`docs/examples/rotatingFigure.ts:181`) on the scaffold button: collect the elapsed time, and every 500 ms run add below 6 cubes, remove above 30, and otherwise a random action. Rationale: `playback` already gives a play and pause button that names its next click.

- [ ] 6. Add a controls row below the SVG:
  - the four action buttons;
  - a key radio pair, "id" and "index";
  - the readout with the last and total enter, update and exit counts and the adopted count;
  - a polite live region that names the last action, for example "added c17 and c18: 2 entered, 14 updated, 0 exited".

  Write the inline style constant with the prefix `--du-`, its dark-mode overrides under the dark class, the enter, update and exit colours, the dashed adopted outline, and stacking at phone width. Follow `docs/examples/voxelBuilder.ts:439`.

- [ ] 7. Add keyboard control on the focusable SVG, with a ring that shows only for keyboard focus, as `docs/examples/voxelBuilder.ts:493` does.
  - A adds, D or Delete removes, S shuffles and M moves.
  - P plays or pauses stress, and K switches the key.
  - The arrow keys turn the view.

  Leave keys with Ctrl, Meta or Alt to the browser, as `docs/examples/floorPlan.ts:606` does. With reduced motion, every action draws with a zero duration, so cubes appear, jump and vanish without a fade or a slide. Stress mode still runs, because the user starts it.

- [ ] 8. Write the page `docs/examples/data-update.md` with the mount block of `docs/examples/voxel-builder.md`, an interaction line, and these sections:
  - "A key is an identity": the shuffle by id and by index side by side;
  - "Ids through the projection": `transform` spreads the datum, and the cube id rides on its vertices;
  - "The view stays put": the camera holds the rotation;
  - "Enter, update, exit": the counters;
  - "The whole source".

- [ ] 9. Register the page in the sidebar and the gallery:
  - a sidebar entry "Data-update stress test" in `docs/.vitepress/config.ts`, which sorts the list by name;
  - a bullet in `docs/examples/index.md` after the bar chart line (`docs/examples/index.md:8`), naming `cubes3D`, `points3D` and keyed joins.

- [ ] 10. Run the type, lint, docs-build and audit gates, and fix what they report:
  - `npm run typecheck`, `npm run lint` and `npm run docs:build`;
  - the project-pinned fallow audit through npx.

  Extract a shared helper only for a duplicate that fallow reports, for example the face join shared with the bar chart.

## Verification Criteria

- The gates pass, and `git diff --stat -- index.ts src tests` is empty.
- **Stable ids:** joined by id, a shuffle reports 0 entered, n updated and 0 exited, no cube moves, and the adopted count stays 0 through a minute of stress.
- **Index key:** joined by index, a shuffle makes cubes slide and raises the adopted count. Removing the first cube exits the last element and slides all the others.
- **Counters:** after "add" with 12 cubes on the floor, the readout shows between 1 and 3 entered, 12 updated and 0 exited, and the totals add up.
- **Rotation:** an action during a glide neither stops the glide nor changes the angle, and a drag during a slide snaps the cubes to their cells.
- **Limits:** add is disabled at 36 cubes and remove at none. Stress keeps the count between 6 and 30.
- **Keyboard:** A, D, Delete, S, M, P, K and the arrows work, and the live region announces each action.
- **Reduced motion:** with the preference set, no fade and no slide runs.
- **Clean unmount:** no console errors and no running timer after leaving the page during stress or a transition.
- **Themes and width:** light and dark themes are legible, green, blue and red are distinct in both, and at 375 px nothing overlaps.

## Potential Risks and Mitigations

1. **A face's visibility flips mid-slide**, because the visibility is set at the end state while the path still moves.
   Mitigation: accept it for a 600 ms slide. Cubes on one floor rarely change which faces they show between cells.

2. **The groups are sorted by their end positions during a slide**, so a sliding cube can briefly paint over a nearer one.
   Mitigation: accept this in the first version. Tweening the data instead of the paths, as the area chart does (`docs/examples/areaChart.ts:296`), is listed under alternatives.

3. **Stress mode piles up transitions faster than they end.**
   Mitigation: a new draw interrupts the running transitions. The 500 ms step is shorter than the 600 ms transition on purpose, so the page shows that interruption is safe.

## Alternative Approaches

1. **Tween the data, not the paths:** re-project every frame of a slide, as the area chart does. The depth order stays right, but enter and exit lose d3's own transitions, which the page is about.
2. **Points instead of cubes:** a smaller scene, but it would not show that a cube's id rides on its vertices.
3. **Two figures side by side, one per key:** the difference shows at once, at the cost of twice the scene and a crowded phone layout.
