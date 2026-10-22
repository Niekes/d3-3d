# Rotation pivot example

## Objective

Add a docs example, "Rotation pivot", at `/examples/rotation-pivot`. A box stands on a floor grid away from the middle, and an orange pivot marks the rotation center of the scene.

- **Moving the pivot:** dragging the pivot moves it across the floor at its current height. Three sliders set its x, its height and its z.
- **Turning:** dragging the background turns the scene with the shared glide, and the scaffold button spins it around the pivot.
- **Orbits:** clicking a corner of the box shows or hides its orbit, the circle that corner travels on as the scene turns. Two orbits show from the start.
- **The axis:** a vertical line through the pivot shows the axis the spin turns around.
- **Readout:** shows the pivot's coordinates and the radius of the orbit toggled last.

The page teaches one idea, the rotation center, in three steps. The projection playground (`docs/examples/projection-playground.md`) sets the center with a slider, next to all the other settings. This page shows what the center does to a scene that turns.

1. **A turn leaves one point in place.** The rotation moves every point around the rotation center and leaves the center itself where it is (`src/rotation.ts:36`). On the screen, the pivot stands still while the scene spins, and a corner on the pivot's axis does not move at all. This is the main lesson.
2. **An orbit is a circle in the world.** The figure never sets `rotateZ`, so its rotation is a tilt applied after a yaw. Changing the yaw by an angle turns every world point by that angle around the vertical line through the pivot. So the orbit of a corner is the circle around that line, through the corner and at the corner's height. It is a world shape like any other, drawn with `lineStrips3D`. While the scene spins, the circles stand still on the screen and the corners slide along them.
3. **Moving the pivot moves the picture.** A point p lands at the origin plus the scale times R(p − c) + c. Moving the center c by Δ therefore shifts every point on the screen by the scale times (I − R)Δ, and the shift is the same for every point. The figure takes that shift back out of the origin, so the pivot moves and the picture does not jump. Only the next turn shows the difference.

Assumptions:

- **No library changes.** `box`, `camera3D`, `cubes3D`, `lines3D`, `lineStrips3D`, `points3D`, `sort` and `unproject` are public.
- **One camera.** All renderers hang on one `camera3D` through `.camera` (`src/shapes/shape.ts:146`), as in the scatter plot (`docs/examples/scatterPlot.ts:246`). The camera's rotation center is the pivot.
- **Why not `pose`.** The figure does not use `pose` (`docs/examples/floorView.ts:20`). `pose` sets the origin so that the pivot lands in the middle of the view box (`docs/examples/floorView.ts:29`), which would hide lesson 3. The figure turns its camera through `turnCamera` (`docs/examples/rotatingFigure.ts:138`), as every figure does.
- **Orthographic.** The figure never sets `perspective`. The shift of lesson 3 is the same for every point only in an orthographic view. In perspective the eye sits at the center plus the distance times the view direction (`src/shapes/shape.ts:172-179`), so moving the pivot moves the eye too, and no shift of the origin can undo that. A node check at a distance of 12 puts the shifts of three points up to 109 px apart. The page says so in one section and links to the perspective street, where the eye is the subject.
- **The orbit formula.** Write α for the x angle and θ for the y angle. With z at zero, the rotation is Rx(α) · Ry(θ) (`src/rotation.ts:8-9`). A world point w drawn at yaw θ0 lands where p lands at yaw θ when w − c = Ry(θ − θ0)(p − c). Over a full turn, these points make up the circle around the vertical axis through c, whatever θ0 is. Prove the formula with the orbit criterion below, not by eye.
- **The shift is measured, not derived.** Project one fixed world point before and after the move, and subtract the difference from the origin. The docs code needs no rotation matrix, which it could not import anyway: it reaches the library only through `../../index`.
- **Coordinates.** The floor is the plane y = 0, from −5 to 5 in x and z, and up is negative y, as in `docs/examples/voxelBuilder.ts`. The box is about 2 wide, 1 deep and 3 high, and stands away from the middle. The pivot stays on the floor area, at a height from 0 to 4.
- **Tilt and start pose.** The figure shares the start yaw, the start tilt and the tilt limits of the floor figures, the `START` constant at `docs/examples/floorView.ts:12`. Step 2 exports it from `floorView.ts`, so the limits live in one place. The pivot starts at the world origin.
- **Shared rules.** All `AGENTS.md` rules apply. The styles live in the module, as in `docs/examples/splineEditor.ts`.

## Implementation Plan

- [ ] 1. Create `docs/examples/rotationPivot.ts`, which exports only `mountRotationPivot` and returns a dispose function.
  - Mount it through `rotatingFigure` (`docs/examples/rotatingFigure.ts:155`) with the prefix `pivot`.
  - Keep the state in one place: the pivot, the set of corners with an orbit, the selected corner, the drag yaw and pitch, and the spin yaw.
  - One render function reads the state.

  Rationale: this is the house pattern of every rotating figure.

- [ ] 2. Hang every renderer on one `camera3D`, and turn the camera rather than the renderers.
  - **The renderers:**
    - `lines3D` for the floor grid and the pivot axis;
    - `cubes3D` for the box;
    - `points3D` for the corners and the pivot;
    - `lineStrips3D` for the orbits.
  - **The floor turn:** export `START` from `docs/examples/floorView.ts:12` as `FLOOR_TURN`, and use it in `pose` as before.
  - **On each render:**
    - call `turnCamera(camera, dragYaw + spinYaw, dragPitch, FLOOR_TURN)`, as the scatter plot turns its camera (`docs/examples/scatterPlot.ts:461`);
    - set the rotation center to the pivot.
  - **The start origin:** choose it so that the middle of the scene lands in the middle of the 960 × 500 view box, with the pivot at the world origin. After that, only step 6 changes the origin.

  Rationale: the pivot lives in the camera and nowhere else, so lessons 2 and 3 read straight from it. `turnCamera` sets the yaw before the tilt, which is what the orbit formula assumes.

- [ ] 3. Draw the scene in five groups, in this order: floor grid, box, orbits, pivot axis, then the corner dots and the pivot.
  - **The grid:** a line every unit, built like `GRID` in `docs/examples/voxelBuilder.ts:88` and drawn with `placeSegments` (`docs/examples/segments.ts:8`).
  - **The box:** its corners come from `box` (`src/box.ts:15`), as the voxel builder builds its cubes (`docs/examples/voxelBuilder.ts:118`), and its faces are drawn with `joinFaces` (`docs/examples/cubeFaces.ts:10`).
  - **The corner dots:** circles joined by the corner index, each over an invisible wider circle for touch.
  - **The pivot:** a larger orange circle over a wide hit circle.

  The orbits, the axis and the dots paint above the box, as the spline editor keeps its handles on top. Rationale: they are guides, and a guide hidden behind the box teaches nothing.

- [ ] 4. Compute every orbit on each render as a closed loop of 64 world points around the vertical line through the pivot.
  - The radius is the horizontal distance from the corner to that line, and the height is the corner's height.
  - A corner on the line has radius zero: draw no loop for it, and mark its dot as fixed.

  Rationale: this is lesson 2. The orbit is world data, so the camera turns it with everything else, and a spin maps it onto itself.

- [ ] 5. Spin the scene with `playback` (`docs/examples/rotatingFigure.ts:181`) on the scaffold button, at about a quarter turn per second.
  - Add the spin yaw to the drag yaw, as the scatter plot adds its auto yaw (`docs/examples/scatterPlot.ts:461`).
  - With prefers-reduced-motion, the button turns the scene by 30° per click instead of starting the timer.

  Rationale: a steady spin shows the orbits standing still, while a drag changes speed all the time.

- [ ] 6. Move the pivot through one function that every input calls. It keeps the picture still.
  - Project a fixed world point, the world origin, with the `points3D` renderer.
  - Set the camera's rotation center to the new pivot, clamped to the floor area and to heights from 0 to 4.
  - Project the same point again, and subtract the difference from the camera's origin.

  Rationale: this is lesson 3. The shift is the same for every point, so one point is enough to measure it.

- [ ] 7. Drag the pivot with a d3 drag on the pivot circle, unprojecting onto the horizontal plane through the pivot.
  - **On start:**
    - unproject the pointer with `unproject` (`src/shapes/shape.ts:159`) onto the plane through the pivot with normal 0, 1, 0;
    - keep the difference between the pivot and that hit as a grab offset, as the spline editor does (`docs/examples/splineEditor.ts:293`).
  - **On each drag event:** unproject again, add the offset, keep the height, and move the pivot through step 6.
  - **Edge-on plane:** when `unproject` returns null, keep the last position.

  The drag subject is the pointer in the units of the view box (`docs/examples/splineEditor.ts:282`). d3-drag stops the press from reaching the figure's own drag, so dragging the pivot never turns the scene. Because step 6 keeps the picture still, the floor under the pointer does not move while the pivot is dragged.

- [ ] 8. Toggle an orbit with a click on its corner dot, and start with two top corners on opposite sides of the box.
  - The readout shows the radius of the orbit toggled last.
  - The scaffold's drag swallows the click that ends a rotation (`docs/examples/rotatingFigure.ts:76-81`), so turning the scene never toggles an orbit.

- [ ] 9. Add keyboard control on the focusable SVG, with a ring that shows only for keyboard focus (`docs/examples/splineEditor.ts:506`).
  - The arrow keys move the pivot by 0.5 along x and z.
  - Page Up and Page Down change its height by 0.5.
  - The left and right bracket keys select the previous or next corner, and Enter toggles its orbit.
  - Home puts the pivot back at the world origin.

  Every key moves the pivot through step 6. The polite live region announces the pivot's coordinates or the orbit's radius. Attach the listener to the SVG only, and leave Cmd and Ctrl shortcuts alone (`docs/examples/splineEditor.ts:397`).

- [ ] 10. Add a controls row below the SVG, with x, height and z sliders that also go through step 6, the readout and the live region.
  - Write the inline style constant with the prefix `--rp-`, as `docs/examples/projectionPlayground.ts:185` does, with its `.dark` overrides (`docs/examples/projectionPlayground.ts:206`).
  - Style the orange pivot, the dashed orbits, the axis line and the mark of a fixed corner.
  - Set a grab cursor on the background, a move cursor on the pivot and a pointer cursor on the corners.
  - Stack the controls at phone width.

- [ ] 11. Write the page `docs/examples/rotation-pivot.md`, with the mount block of `docs/examples/spline-editor.md` and an input table.
  - "The point a turn leaves alone";
  - "Orbits are circles in the world", with the orbit formula and a pointer to `rotationMatrix` (`src/rotation.ts:14`);
  - "Moving the pivot without a jump", with the shift formula and an excerpt of step 6. It also explains that the floor figures re-center their pivot through `pose` instead (`docs/examples/floorView.ts:29`).
  - "The pivot carries the eye": in perspective the eye sits in front of the pivot, so moving the pivot moves the eye, and the shift is no longer the same for every point. Link the perspective street.
  - A link to the hinge and pivot presets (`docs/examples/projectionPlayground.ts:128-137`) and the orbit preset (`docs/examples/projectionPlayground.ts:143-147`) of the projection playground.
  - "The whole source".

- [ ] 12. Register the page in the sidebar and in the gallery.
  - Add a sidebar entry "Rotation pivot" in `docs/.vitepress/config.ts`, which sorts its list by name.
  - Add a bullet after the perspective street line (`docs/examples/index.md:21`), below the coordinate explorer and rotation order bullets if they are already there. Name `cubes3D`, `lineStrips3D`, `points3D`, `lines3D`, `camera3D` and `unproject`.

- [ ] 13. Run the type, lint, docs-build and audit gates, and fix what they report.
  - Run `npm run typecheck`, `npm run lint` and `npm run docs:build`.
  - Run the project-pinned fallow audit through npx.

  Extract a shared helper only for a duplicate that fallow reports, for example the floor grid this page shares with the voxel builder and the spline editor.

## Verification Criteria

- The gates pass, and `git diff --stat -- index.ts src tests` is empty.
- **The pivot stands still:** during a spin and during a drag, its projected position stays within 0.5 px of where it started.
- **Orbits:** check four yaws during a spin, including one after a pivot move and one at the steepest tilt. At each, the projected position of every corner with an orbit lies within 1 px of the projected loop of its orbit. This proves the orbit formula.
- **A fixed corner:** with the pivot moved under a bottom corner of the box, that corner and the top corner above it stay within 0.5 px during a spin, and both dots show as fixed.
- **No jump:** moving the pivot by drag, slider or key leaves every other drawn point within 0.5 px. Only the next turn differs.
- **Round trip:** at three rotations, including the steepest tilt, a dragged pivot stays within 1 px of the pointer plus the grab offset.
- **Two drags:** dragging the pivot never turns the scene, and dragging the background turns it and glides.
- **Reduced motion:** with prefers-reduced-motion, the button turns the scene by 30° per click, and no timer runs.
- **Keyboard:** the arrows, Page Up and Page Down, the brackets, Enter and Home work, and the live region announces the change.
- **Clean unmount:** after leaving the page mid-spin or mid-drag, the console shows no errors and no timer keeps firing.
- **Themes and width:** light and dark themes are legible, and at 375 px nothing overlaps.

## Potential Risks and Mitigations

1. **The orbit formula fails once `rotateZ` is not zero.**
   Mitigation: the figure never sets `rotateZ`, and the page states that condition. The orbit criterion catches any error at once.

2. **The pivot is hard to grab behind the box or on a touch screen.**
   Mitigation: the pivot paints last, over a hit circle about 12 px in radius. The sliders and the keys reach it too.

3. **The horizontal plane is nearly edge-on at the lowest tilt, so the drag jumps.**
   Mitigation: the floor limits of `FLOOR_TURN` keep the camera at least 10° above the floor. A null from `unproject` keeps the last position, and the pivot is clamped to the floor area.

4. **A glide or a spin keeps turning the scene while the pivot is dragged.**
   Mitigation: every drag event unprojects with the current pose, so the pivot still follows the pointer across the floor. Accept the motion in the first version.

5. **Readers mix up the origin and the rotation center.**
   Mitigation: the page links to the projection playground, which draws both, and lesson 3 names the origin as what absorbs the shift.

## Alternative Approaches

1. **Re-center the pivot with `pose`, as the floor figures do:** less code, but the picture jumps on every pivot move and lesson 3 disappears. A checkbox could compare the two later.
2. **Trace orbits as trails of past positions:** shows every motion, the tilt included, but a trail depends on the drag history and fades away. The circle is exact and shows that an orbit is a world shape.
3. **A perspective toggle:** shows how the eye follows the pivot, but lesson 3's still picture breaks, because no shift of the origin undoes a moved eye. The perspective street already teaches the eye.
4. **Draw the tilt orbits as well:** the tilt turns around the horizontal axis across the screen through the pivot. That axis turns with the yaw, so its circles are not fixed in the world, and two kinds of orbit would muddle the lesson.
