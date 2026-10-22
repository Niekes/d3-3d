# Linked views example

## Objective

Add a docs example, "Linked views", at `/examples/linked-views`. Two views of the same 150 samples in three clusters sit side by side: a free view that turns on drag, and a top view that looks straight down like a map. Selecting samples in either view highlights the same samples in both.

- **Free view:**
  - dragging rotates it with the shared glide;
  - clicking a sample selects it, and Shift with a click adds it to the selection or takes it out;
  - clicking the background clears the selection.
- **Top view:**
  - a brush selects every sample inside its rectangle, and Shift adds to the selection;
  - a click on the background clears the selection.
- **Hover:** the sample under the pointer grows in both views.
- **The brush in 3D:** the brushed rectangle is drawn on the floor of the free view.
- **The camera on the map:** the top view shows an arrow from the middle of the scene towards the camera of the free view.
- **Cluster buttons:** select a whole cluster at once.
- **Readout:** counts the selected samples per cluster.

The page teaches four things:

1. **The selection lives in the data.** It is one set of ids. Each view only draws it, so a third view would need no wiring between the views. This is the main lesson.
2. **One camera per view.** A renderer holds exactly one view: `camera` gives up the renderer's own view and shares the camera's (`src/shapes/shape.ts:146`). So each view gets its own renderers, hung on its own `camera3D` (`src/shapes/shape.ts:205`). The data array is shared, and every view projects it anew.
3. **A brush is a query in world space.** The corners of the brush are unprojected onto the floor with `unproject` (`src/shapes/shape.ts:159`). The selection then compares world x and z, not pixels, so it would still be right if the map were turned.
4. **Where the other camera looks from.** `viewDirection` (`src/shapes/shape.ts:180`) of the free camera, flattened onto the floor, points the arrow in the top view.

Assumptions:

- **No library changes.** `points3D`, `lines3D`, `camera3D`, `sort`, `unproject` and `viewDirection` are public.
- **Coordinates.** The floor is the plane y = 0, the samples stand above it at heights from 0 to 3, and up is negative y, as in `docs/examples/voxelBuilder.ts`. The samples spread over x and z from −5 to 5.
- **The top view.** Its camera turns by −π/2 about x and never moves. Its view direction is then 0, −1, 0, pointing up out of the floor, and world z grows down the screen. Verify both with `viewDirection` before drawing the map.
- **Orthographic, both views.** Neither camera sets `perspective`. The top view is a map, so x and z have to keep one scale everywhere and a sample has to sit over its own place on the floor. A perspective free view is listed under alternatives.
- **The data.** Three Gaussian clusters of 50 samples each, drawn from a seeded d3 `randomLcg`, so the page looks the same on every load.
- **Shared rules.** All `AGENTS.md` rules apply. The styles live in the module, as in `docs/examples/voxelBuilder.ts:439`.

## Implementation Plan

- [ ] 1. Create `docs/examples/linkedViews.ts`, which exports only `mountLinkedViews`, returning a dispose function.
  - Write the host markup by hand, as the bar chart does (`docs/examples/barChart.ts:65`): two SVGs of 480 × 420 in a two-column grid, each with a short caption, "free" and "top".
  - Call `dragRotate` (`docs/examples/rotatingFigure.ts:26`) on the free SVG only. Add the change since the last report to yaw and pitch, as `docs/examples/floorPlan.ts:306` does, so the keys can turn the free view too.
  - Keep the state in one place: the samples, the selected ids, the hovered id, the brush rectangle in world space, yaw and pitch.
  - One render function draws both views from the state.

  Rationale: the scaffold `rotatingFigure` makes exactly one SVG, and only the free view turns.

- [ ] 2. Build two cameras and two sets of renderers.
  - The free camera's origin is the middle of its view box and its pivot the middle of the scene. It turns with `turnCamera` (`docs/examples/rotatingFigure.ts:138`), with the start and the tilt limits of the floor figures (`docs/examples/floorView.ts:12`), so it stays above the floor. Import that constant as `FLOOR_TURN`, which the rotation-pivot plan exports; whichever page is built first adds the export. `pose` itself does not fit, because it centres the pivot in a 960 × 500 view box.
  - The top camera is turned once, with `turnCamera` and a tilt of π/2, which is the angle of the assumptions.
  - Each view gets a `points3D` for the samples and a `lines3D` for the floor grid and its overlay, hung on its camera with `camera`, as `docs/examples/scatterPlot.ts:246` does.

  Rationale: two renderer sets are the lesson of the page, and a shared renderer would carry only one of the views.

- [ ] 3. Draw each view in three groups, in this order: floor, overlay, samples.
  - Draw the floor grid with `placeSegments` (`docs/examples/segments.ts:8`).
  - The overlay of the free view is the brushed rectangle as four segments on the floor.
  - The overlay of the top view is the camera arrow:
    - take the free camera's view direction with its y set to zero, and normalise it;
    - draw a segment of length 4 from the middle of the floor along it, with two short barbs;
    - hide it when the flattened direction is shorter than 0.05, that is when the free camera looks straight down.
  - Draw the samples as circles joined by id and sorted with `sort`, coloured by cluster.
  - Mark the state with classes, as the network explorer does (`docs/examples/networkExplorer.ts:317`): selected samples get a ring, the others are dimmed while anything is selected, and the hovered sample is drawn larger.

- [ ] 4. Select in the free view by pointer.
  - Find the sample nearest the pointer within 10 px, as `nodeAt` in `docs/examples/networkExplorer.ts:404` does.
  - A click selects only that sample, Shift with a click toggles it, and a click on nothing clears the selection. d3 drag already swallows the click that ends a rotation.
  - A pointer move with no button pressed sets the hovered id, as `docs/examples/networkExplorer.ts:421` does, and redraws only when it changes.

- [ ] 5. Brush in the top view with a d3 brush over the whole view box.
  - On every brush event, unproject both corners of the brush rectangle through the top camera onto the floor through the origin, with the normal 0, 1, 0.
  - Store the world rectangle, and select every sample whose x and z lie inside it. With Shift held at the start of the brush, add to the selection that was there before it.
  - An empty brush clears the selection and the rectangle.
  - The top view also hovers, as in step 4.

  d3 brush does not stop the press from bubbling up (`node_modules/d3-brush/src/brush.js:334`). That is harmless here, because the top view has no rotation drag. Rationale: the world rectangle is what the free view draws in step 3, so one value serves both views.

- [ ] 6. Add a controls row below the views:
  - three cluster buttons that select a cluster;
  - a "clear" button that also clears the brush;
  - the readout of the counts per cluster;
  - a polite live region.

  Write the inline style constant with the prefix `--lv-`, its dark-mode overrides under the dark class, the ring, the dimmed state, the brush, the overlay strokes, the cursors (grab over the free view, crosshair over the top view), and stacking of the two views below 640 px. Follow `docs/examples/voxelBuilder.ts:439`.

- [ ] 7. Add keyboard control on the focusable free SVG, with a ring that shows only for keyboard focus, as `docs/examples/voxelBuilder.ts:493` does.
  - The arrow keys turn the free view.
  - The left and right bracket keys walk a cursor through the samples in id order, and the cursor is the hovered sample.
  - Enter or Space toggles the cursor's sample, and Escape clears the selection.

  The live region announces the cursor's sample and the counts. Leave keys with Ctrl, Meta or Alt to the browser, as `docs/examples/floorPlan.ts:606` does. The glide already respects reduced motion (`docs/examples/rotatingFigure.ts:48`), and nothing else animates.

- [ ] 8. Write the page `docs/examples/linked-views.md` with the mount block of `docs/examples/voxel-builder.md`, an interaction line, and these sections:
  - "One selection, two views": the set of ids;
  - "A camera per view": `camera` and `camera3D`, and why a renderer holds one view;
  - "Brushing the floor": the corners through `unproject`;
  - "Where the other camera is": the arrow from `viewDirection`;
  - "The whole source".

- [ ] 9. Register the page in the sidebar and the gallery:
  - a sidebar entry "Linked views" in `docs/.vitepress/config.ts`, which sorts the list by name;
  - a bullet in `docs/examples/index.md` after the network explorer line (`docs/examples/index.md:19`), naming `points3D`, `camera3D` and `unproject`.

- [ ] 10. Run the type, lint, docs-build and audit gates, and fix what they report:
  - `npm run typecheck`, `npm run lint` and `npm run docs:build`;
  - the project-pinned fallow audit through npx.

  Extract a shared helper only for a duplicate that fallow reports, for example the nearest-sample lookup shared with the network explorer.

## Verification Criteria

- The gates pass, and `git diff --stat -- index.ts src tests` is empty.
- **Top view:** the top camera's `viewDirection` is 0, −1, 0, the sample with the largest z is drawn lowest in the view, and every sample's circle sits over its own place on the floor grid.
- **Brush:** a brush over one cluster in the top view selects exactly the samples whose circles lie inside the rectangle. The free view rings the same samples, and draws the rectangle on its floor around their feet.
- **Click:** selecting a sample in the free view rings it in the top view too. Shift with a click toggles it, and a click on the background clears both views.
- **Hover:** hovering a sample in either view enlarges it in both.
- **Arrow:** turning the free view by 90 degrees about y turns the arrow in the top view by 90 degrees, and the arrow disappears when the free view looks straight down.
- **Independence:** rotating the free view never moves the top view, and brushing never rotates the free view.
- **Keyboard:** the arrows, the brackets, Enter, Space and Escape work, and the live region announces the counts.
- **Clean unmount:** no console errors after leaving the page mid-glide or mid-brush.
- **Themes and width:** light and dark themes are legible, and at 375 px the views stack and nothing overlaps.

## Potential Risks and Mitigations

1. **The top view comes out from below**, mirrored, because the sign of the angle about x is wrong.
   Mitigation: check `viewDirection` against 0, −1, 0, as the verification criteria say, before drawing anything else.

2. **The brush and the hover fight over the pointer in the top view.**
   Mitigation: the hover listens on the SVG and reads only the pointer position, so the brush overlay may keep the events. Hover is skipped while a button is down.

3. **The free view's tilt clamp hides the "looks straight down" case of the arrow.**
   Mitigation: the floor figures' `maxTilt` allows up to 85 degrees (`docs/examples/floorView.ts:12`). The arrow still shrinks visibly, and the hide threshold is checked once with the clamp temporarily raised during development.

4. **Two views at 480 px each are cramped on a laptop sidebar layout.**
   Mitigation: the page sets `aside: false`, as `docs/examples/projection-playground.md:3` does, and the views stack below 640 px.

## Alternative Approaches

1. **One camera for both views, with a "lock" toggle:** shows the opposite lesson of `camera`, but a locked pair of identical views links nothing.
2. **Brush in the free view as well:** a screen rectangle selects through the depth of the scene, which is powerful but confusing in a turned view.
3. **A perspective free view:** one `perspective` call, and the brushed rectangle on its floor still lines up, because the free view only projects it. But the depth cue competes with the lesson, and the arrow would point at an eye rather than along a direction.
4. **Lasso instead of a rectangle:** closer to how maps select, at the cost of a polygon test and of losing d3 brush's handles.
