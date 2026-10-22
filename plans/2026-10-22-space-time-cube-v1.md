# Space-time cube example

## Objective

Add a docs example, "Space-time cube", at `/examples/space-time-cube`. It is Hägerstrand's cube from time geography: the floor is the map of a small town, and up is the time of one day, from 6:00 to 22:00.

- **Paths:** four people go about their day between home, school, the office, a café and a gym. Each path is drawn with `lineStrips3D`: upright while someone stays, slanted while they travel.
- **Stations:** every place stands as a dashed upright line from the floor to the top of the cube, drawn with `lines3D`.
- **Routes:** every path is also drawn flat on the floor, which is the route without the time.
- **Time plane:** a slider moves a translucent horizontal plane, drawn with `planes3D`. Markers drawn with `points3D` show where everyone is at that time, with drop lines to the floor.
- **Perspective:** a checkbox moves the eye from infinitely far away to a few units from the cube, so the cube narrows towards the floor.
- **Meetings:** the readout names who is at the same place at the same time.
- **Playback:** the scaffold button plays the day in 32 seconds and wraps around.
- **Rotating and keyboard:** dragging rotates the scene with the shared glide, and the keys step the time.

The page teaches three things:

1. **One plane, two lists.** The time plane cuts the scene in two, and wherever the two halves overlap on the screen, the half on the side of the eye is in front. In the orthographic view the eye is infinitely far up, because `pose` keeps the camera at least 10° above the floor (`docs/examples/floorView.ts:12`). So the past always lies behind the plane and the future in front. In perspective the eye sits at the rotation center plus the distance times `viewDirection` (`src/shapes/shape.ts:176-178`), at a finite height, and once the plane rises above the eye the two lists swap. The figure paints the far side, then the plane, then the near side, and never sorts across the plane. This is the main lesson.
2. **Time is an axis like any other.** `axes3D` frames the cube with hour ticks through `drawChartBox`, exactly as it frames a chart (`docs/examples/axisEdges.ts:8`), and `axisSpec` turns the time scale into its axis.
3. **Reading a path.** A stay is an upright line over its station, the slant of a trip is its speed, and a meeting is two paths that run together.

Assumptions:

- **No library changes.** `axes3D`, `axisSpec`, `camera3D`, `lineStrips3D`, `lines3D`, `planes3D`, `points3D`, `sort` and `strips` are public.
- **Synthetic data.** Six places on a map of 10 × 10 km and four people, A to D. A schedule is a list of stays, each with a start, an end and a place, and a trip fills every gap between two stays at constant speed. The paths are sampled every 5 minutes, 193 samples per person. The schedules are written so that at least three meetings happen during the day.
- **Data axes.** As in the scatter plot and the trajectory explorer, data x is east, data y is north and data z is the time in hours. The accessors map them to x, to the depth and to a negated y, because the screen y grows downwards, each through a linear scale onto −1 to 1, as at `docs/examples/trajectoryExplorer.ts:77`.
- **The view.** All renderers hang on one `camera3D`, posed once per render with `pose` from `docs/examples/floorView.ts:20`, as the spline editor does at `docs/examples/splineEditor.ts:137` and `docs/examples/splineEditor.ts:183`. The scene turns around the middle of the cube.
- **Perspective is a toggle.** The page opens orthographic, at the default distance of `Infinity`. The checkbox sets the distance to 3, in the units of the cube from −1 to 1. The cube reaches √3 from its middle, so all of it stays in front of the eye, as the perspective street keeps its scene inside its nearest eye at `docs/examples/perspectiveStreet.ts:19-20`. At that distance the eye drops below the top of the cube once the tilt falls under about 19°.
- **Shared rules.** All `AGENTS.md` rules apply. The styles live in the module, as in `docs/examples/splineEditor.ts:455`.

## Implementation Plan

- [ ] 1. Create `docs/examples/spaceTimeCube.ts`, which exports only `mountSpaceTimeCube`, taking the host and returning a dispose function.
  - Mount it through `rotatingFigure` at `docs/examples/rotatingFigure.ts:155` with the prefix `stc`.
  - Keep the state in one place: the time t in hours, the selected person, the yaw and the pitch. One render function reads the state.

  Rationale: this is the house pattern of every rotating figure.

- [ ] 2. Write the data as constants: the six places with a name and a map position, and the four schedules as lists of stays.
  - Build every path once at mount: the samples of a person, each a position and a time with the person's id, as the samples at `docs/examples/trajectoryExplorer.ts:40` carry theirs.
  - Give every person a color as a CSS variable, as `docs/examples/trajectoryExplorer.ts:65` does, so the dark theme can step it.

  Rationale: written schedules make the meetings deliberate, so the page can point at them.

- [ ] 3. Frame the cube with `axes3D` and draw its back walls and axes with `drawChartBox` from `docs/examples/axisEdges.ts:8`. Build the spec with `axisSpec` from the three scales, as the trajectory explorer does at `docs/examples/trajectoryExplorer.ts:80-84`.
  - The time axis has ticks every 2 hours, labelled as times of day.
  - The map axes have ticks every 2 km.
  - The axis titles follow the constant at `docs/examples/areaChart.ts:30`: "east, km", "time" and "north, km".

  Rationale: the walls behind the data never cover it, and the floor wall becomes the map grid.

- [ ] 4. Cut everything that crosses the time plane at the plane, each frame.
  - Split every path at t: the samples up to t and the position at t make the past, and the position at t and the samples after it make the future. Interpolate the position at t like `docs/examples/trajectoryExplorer.ts:153`.
  - Cut both parts with `strips` into pieces of 6 samples that share their end points, as the trajectory explorer cuts its trails at `docs/examples/trajectoryExplorer.ts:165`.
  - Cut every station line at t into a lower and an upper part.

  Rationale: this sorts every piece into the past or the future, which step 5 paints in order.

- [ ] 5. Paint the scene in this order of groups: walls and axes, routes on the floor, the far side of the time plane, the plane, the markers, the near side.
  - **The near side:** the future while the eye is above the plane, the past while it is below. Compare the plane's height with the eye's, the rotation center plus the distance times `viewDirection`. In the orthographic view the near side is always the future.
  - **Routes:** every path flattened to the floor, faint, with `lineStrips3D`.
  - **The past:** path pieces, the lower station parts and the drop lines from the markers, sorted with `sort` inside its group.
  - **The time plane:** one translucent quad with `planes3D` spanning the map at t.
  - **The markers:** one circle per person at t with `points3D`, with a ring around a place where a meeting happens.
  - **The future:** path pieces and upper station parts, sorted inside its group, faded and dashed.

  Rationale: with the eye on one side of the plane, the order between the groups is exact in both projections, and `sort` handles only what lies on one side of the plane.

- [ ] 6. Label the places at the foot of their stations, on the floor. Where two labels would overlap, step one down, as the labels at `docs/examples/trajectoryExplorer.ts:204` do.

- [ ] 7. Find the meetings at t: two or more people whose stays at the same place both cover t. List them in the readout, such as "B and C at school", and ring the place.

- [ ] 8. Add a controls row below the SVG, in the style of the trajectory explorer's row at `docs/examples/trajectoryExplorer.ts:126`.
  - A time slider from 6:00 to 22:00 in steps of 5 minutes, with the time as text.
  - A person filter as a radio fieldset, as at `docs/examples/trajectoryExplorer.ts:130`; the other people fade but stay.
  - A "perspective" checkbox.
  - A readout with where everyone is at t, such as "A · at the office" or "D · on the way to the café", and the meetings.
  - A polite live region for the keys.

  Write the inline style constant with the prefix `--stc-` and its dark-mode overrides, following `docs/examples/splineEditor.ts:455`.

- [ ] 9. Turn the scaffold button into play and pause with `playback` at `docs/examples/rotatingFigure.ts:181`, at 30 minutes of the day per second, wrapping from 22:00 to 6:00. The slider waits while the reader holds it, as at `docs/examples/trajectoryExplorer.ts:228`.

- [ ] 10. Add keyboard control on the focusable SVG, with a ring that shows only for keyboard focus.
  - The left and right arrow keys step the time by 15 minutes, and with Shift by an hour.
  - Space plays and pauses.
  - The digits 1 to 4 select a person, and 0 or Escape selects everyone.
  - Cmd and Ctrl keep their browser shortcuts, as `docs/examples/splineEditor.ts:397` does.

  The live region announces the time and the meetings. Attach the listener to the SVG only.

- [ ] 11. Respect reduced motion and clean up after the figure. With `prefers-reduced-motion`, start paused at 12:30, when everyone is somewhere, as `docs/examples/trajectoryExplorer.ts:243-246` does. The dispose function stops the playback and empties the host.

- [ ] 12. Write the page `docs/examples/space-time-cube.md` with the mount block of `docs/examples/spline-editor.md:1-23`, an interaction line, a line crediting Torsten Hägerstrand's time geography, and these sections:
  - "Time goes up": the axes and the accessors;
  - "A stay is a station": how to read a path;
  - "One plane, two lists": the painting order, why it is exact, and why it swaps when the eye in perspective sinks below the plane;
  - "Meetings": paths that run together;
  - "The whole source".

- [ ] 13. Register the page in the sidebar and the gallery.
  - Add the sidebar entry "Space-time cube" to the example list of `docs/.vitepress/config.ts`, which sorts the entries by name at `docs/.vitepress/config.ts:100`.
  - Add a bullet after the trajectory explorer line at `docs/examples/index.md:17`, naming `lineStrips3D`, `planes3D`, `points3D` and `axes3D`.

- [ ] 14. Run the type, lint, docs-build and audit gates, and fix what they report.
  - Run `npm run typecheck`, `npm run lint` and `npm run docs:build`.
  - Run the project-pinned fallow audit through npx.

  Extract a shared helper only for a duplicate that fallow reports, for example the interpolation at the playhead, which the trajectory explorer has too.

## Verification Criteria

- The gates pass, and `git diff --stat -- index.ts src tests` is empty.
- **Painting order:** at the lowest and the highest tilt and at two other rotations, in both projections, nothing on the far side of the time plane is painted over it, and everything on the near side is painted over it.
- **Perspective:** with perspective on, at the lowest tilt and the plane at 22:00, the eye is below the plane and the past is painted over it. Turning perspective off at once paints the future over it again.
- **Stays:** a person who stays draws an upright line exactly over the station of the place.
- **Markers:** at every time every marker lies on the time plane, its drop line ends on the floor straight below it, and its place in the readout matches the schedule, for example A at the café at 12:30.
- **Meetings:** at least three meetings happen during the day, and the readout names the right people at the right place and time.
- **Playback:** the day plays in about 32 seconds and wraps from 22:00 to 6:00. With reduced motion the figure opens paused at 12:30.
- **Keyboard:** the arrows, Shift with the arrows, Space, the digits and Escape work, and the live region announces the time and the meetings.
- **Clean unmount:** no console errors and no running timer after leaving the page mid-play or mid-glide.
- **Themes and width:** light and dark themes are legible, the translucent plane leaves the past readable in both, and at 375 px nothing overlaps.

## Potential Risks and Mitigations

1. **Inside one group, the centroid sort paints a piece over a closer one where two paths cross at nearly the same depth.**
   Mitigation: the pieces are only 6 samples long, so a wrong pair is short. The paths have different colors, so a wrong order rarely shows.

2. **The translucent plane hides the past too much in one of the themes.**
   Mitigation: set its fill and opacity with CSS variables per theme, and check both themes at the highest tilt, where the plane covers the most.

3. **The place labels overlap at some rotations.**
   Mitigation: the stepped labels from step 6, and six places only.

4. **Sixteen hour ticks crowd the time axis.**
   Mitigation: ticks every 2 hours, which makes nine labels.

5. **The eye sits inside the scene, and points behind it project wrongly.**
   Mitigation: one fixed distance of 3, more than the √3 the cube reaches from its middle, and no slider for it.

## Alternative Approaches

1. **One painter's list for everything, sorted with `sort`:** less code, but the large plane has one centroid and sorts wrongly against long pieces, and the page loses its main lesson.
2. **A flat map with a time slider:** familiar, but it shows one moment at a time, and the whole day at a glance is the point of the cube.
3. **Real GPS traces:** real data, but they need a data file and care for privacy. Written schedules make the meetings deliberate.
