# Sorting sculpture example

## Objective

Add a docs example, "Sorting sculpture", at `/examples/sorting-sculpture`. Twenty-four columns stand in a ring on a floor, and the height of each one is its value. A sorting algorithm puts them in order around the ring, one comparison or swap at a time.

- **Algorithms:** a select picks bubble sort, insertion sort or quick sort.
- **Stepping:** a step button advances one comparison or swap, and play runs the steps at a speed set by a slider.
- **Highlighting:**
  - the two compared columns are highlighted;
  - a swap animates the two columns past each other around the ring;
  - a column turns solid once it has reached its final place.
- **Shuffling:** a shuffle button deals a new order from a seeded generator.
- **Readout:** the current step in words, and the number of comparisons and swaps.
- **Rotating:** dragging the background rotates the scene with the shared glide.

The page teaches three things:

1. **Stable elements carry the animation.** Columns are joined by their value's id, not by their index. A swap therefore moves the same two elements, and the tween only changes where they stand. This is the main lesson.
2. **Sort by the floor, not by the middle.** With the camera tilted above the floor, the depth of a column's centre also depends on its height. A tall column next to a short one can then be painted in the wrong order. The bar chart has the same problem and sorts each bar by the centroid of its bottom face (`docs/examples/barChart.ts:82-95`). The sculpture reuses that: `sort` on the footprint, not on the cube.
3. **An algorithm as a sequence of steps.** Each algorithm is a generator that yields every comparison and swap, so stepping, playing and counting all read the same sequence.

Assumptions:

- **No library changes.** `camera3D`, `cubes3D`, `planes3D`, `lines3D`, `box` and `sort` are public. So `git diff -- index.ts src tests` stays empty.
- **The values.** They are the whole numbers 1 to 24, each 0.25 units high per value. The ring has a radius of 6 units, and slot i sits at the angle 2π i / 24.
- **Insertion sort swaps.** Insertion sort moves an item down by adjacent swaps, so every move on the page is a swap. Quick sort uses the Lomuto partition with the last item as its pivot.
- **The camera.** Every renderer hangs on one `camera3D`, posed once per render by `pose` (`docs/examples/floorView.ts:20-32`), as in `docs/examples/voxelBuilder.ts:148-152` and `docs/examples/voxelBuilder.ts:205`. Its turn clamps the tilt between 10 and 85 degrees (`docs/examples/floorView.ts:12`), so the floor stays behind every column.
- **Orthographic.** The camera keeps the default orthographic projection, and `.perspective` (`src/shapes/shape.ts:81-94`) stays unset. Risk 5 covers a perspective variant.
- **Shared rules.** All `AGENTS.md` rules apply. The styles live in the module, as in `docs/examples/voxelBuilder.ts:439`. `CHANGELOG.md` is not touched.

## Implementation Plan

- [ ] 1. Create `docs/examples/sortingSculpture.ts`, which exports only `mountSortingSculpture`, returning a dispose function. Mount it through `rotatingFigure` (`docs/examples/rotatingFigure.ts:155-174`) with the prefix `sort`. Hand the scaffold's button to `playback` (`docs/examples/rotatingFigure.ts:181-204`), so it becomes play and pause.

  Keep the state in one place:
  - the items, each an id, a value and a display angle;
  - the running generator;
  - the last step;
  - the counters;
  - the set of settled indices;
  - yaw and pitch.

  Hang the `cubes3D`, `planes3D` and `lines3D` renderers on the one camera. Rationale: this is the house pattern of every rotating figure, and the display angle is what the swap tween moves.

- [ ] 2. Write the three algorithms as generators over the items array, which they sort in place. They yield three kinds of steps:
  - a comparison of two indices;
  - a swap of two indices, yielded after the swap is made;
  - a settle of one index, when that item has reached its final place.

  Where each algorithm settles:
  - bubble sort: the last unsettled index after every pass;
  - quick sort: every pivot at its final index;
  - insertion sort: every index only at the end.

  Shuffling or switching the algorithm resets the counters and starts a new generator. Rationale: the generator keeps each algorithm in its textbook shape, and the figure only consumes steps.

- [ ] 3. Build each column from `box` (`src/box.ts:15-42`), standing on its ring slot, with a 0.8 × 0.8 footprint. Turn its corners around the vertical axis through the slot by the slot's angle, so that every column faces the centre. Spread the item's id and value onto the corners, as `docs/examples/barChart.ts:42-48` does.

  Join one group per column, keyed by id, and join the faces with `joinFaces` (`docs/examples/cubeFaces.ts:10-19`). Draw the floor in its own group before the columns: one `planes3D` square, and the 24 slot ticks with `lines3D` and `placeSegments` (`docs/examples/segments.ts:8`). Rationale: keyed groups mean that a swap moves two elements and recreates none.

- [ ] 4. Sort the column groups by their footprint, as the bar chart does (`docs/examples/barChart.ts:86-95`).
  - **The key:** after `cubes.data`, set each column's `centroid` to the centroid of its `bottom` face.
  - **The order:** sort the groups with `sort`, so that the farthest footprint is painted first.

  Rationale: the footprints are disjoint, equal squares on the floor, and the camera looks down on them, so their floor depth decides which column hides which. The centroid of the whole cube also carries half the height, and that breaks the order between a tall and a short neighbour. The bar chart fixed exactly this, so the sculpture copies its two lines rather than deriving a new key.

- [ ] 5. Animate a swap by tweening the two items' display angles, from their old slots to their new ones, through a named d3 transition on the host, as in `docs/examples/explodedCubes.ts:180-194`.
  - **Passing each other:** the column moving clockwise rides on a radius of 6 + 0.8 · sin(π t), and the other on 6 − 0.8 · sin(π t). The two never pass through each other.
  - **Duration:** the shorter of 250 ms and 80 percent of the step interval.
  - **A step during a swap:** a new step interrupts the running tween and snaps it to its end.
  - **Reduced motion:** with reduced motion turned on, the columns jump to their slots without a tween.

- [ ] 6. Show the step state through classes on the column groups:
  - "is-compared" for the pair of the last comparison;
  - "is-swapped" for the pair of the last swap;
  - "is-settled" for every settled index;
  - "is-done" on the figure when the generator ends, which settles every column.

  Shade each face by its name, as in `docs/examples/voxelBuilder.ts:537-552`. Rationale: the colour shows the state of the algorithm, and the height already shows the value.

- [ ] 7. Add a controls row below the SVG, inserted as in `docs/examples/voxelBuilder.ts:167-185`. It holds:
  - the algorithm select;
  - a step button;
  - a shuffle button;
  - a speed slider, from 1 to 30 steps per second, with an output;
  - a readout with the step in words, for example "compare 12 and 7" or "swap 12 and 7", and the comparison and swap counters;
  - a polite live region.

  Play accumulates the elapsed time from `playback` and takes one step per interval of the speed. It stops when the generator ends.

- [ ] 8. Add keyboard control on the focusable SVG, with a ring that shows only for keyboard focus, as in `docs/examples/voxelBuilder.ts:493-501`. While the SVG has focus:
  - Enter or the right arrow takes one step;
  - Space plays or pauses;
  - S shuffles;
  - the digits 1 to 3 pick the algorithm.

  The live region announces each manual step in words, and the result once at the end, for example "Sorted in 276 comparisons and 131 swaps." Attach the listener to the SVG only.

- [ ] 9. Handle motion and disposal.
  - **No autoplay:** the figure starts paused on a shuffled ring.
  - **The glide:** it follows the shared drag (`docs/examples/rotatingFigure.ts:48`).
  - **Dispose:** stop play, interrupt the swap transition, clear the host and remove its class, as in `docs/examples/explodedCubes.ts:231-235` and `docs/examples/solarSystem.ts:179-182`.

- [ ] 10. Write the inline style constant with the prefix `--ss-` and its dark-mode overrides under `.dark`. It covers:
  - the floor and the slot ticks;
  - the base, compared, swapped and settled colours;
  - the face shading;
  - the focus ring;
  - the controls row, which stacks at phone width.

  Follow `docs/examples/voxelBuilder.ts:439-643`.

- [ ] 11. Write the page `docs/examples/sorting-sculpture.md`, with the mount block of `docs/examples/voxel-builder.md`, an interaction line, and these sections:
  - "An algorithm, one step at a time": the generators and the three kinds of steps;
  - "The same column, moved": the keyed join, and the tween of the display angle;
  - "Sort by the floor": why the footprint and not the centroid decides the painting order, linking the section "The painter's algorithm, twice" of the bar chart (`docs/examples/bar-chart.md:94`);
  - "Counting the work": the counters, and why bubble sort and insertion sort make the same number of swaps;
  - "The whole source".

- [ ] 12. Register the page in the sidebar and the gallery:
  - a sidebar entry "Sorting sculpture" in the list at `docs/.vitepress/config.ts:79-100`, which sorts by name;
  - a bullet in `docs/examples/index.md` after the bar chart line, naming `cubes3D`, `box` and `sort`.

- [ ] 13. Run the type, lint, docs-build and audit gates, and fix what they report:
  - `npm run typecheck`, `npm run lint` and `npm run docs:build`;
  - the project-pinned fallow audit through npx.

  Extract a shared helper only for a duplicate that fallow reports.

## Verification Criteria

- The gates pass, and `git diff --stat -- index.ts src tests` is empty.
- **The result:** after every algorithm runs to the end, the values rise around the ring from slot 0 to slot 23, and every column is settled.
- **The counters:**
  - For one shuffle, bubble sort and insertion sort report the same number of swaps. Both equal the number of inversions of that order.
  - Bubble sort reports at most 276 comparisons, which is 24 · 23 / 2.
- **Element stability:** a mutation observer on the column layer sees no additions or removals during a whole run, or during a drag.
- **The swap tween:** two swapped columns never cross through each other's footprint mid-tween, and a step during a tween leaves both on their slots.
- **Painting order:** in a full turn at the lowest and the highest tilt, with a value-24 column next to a value-1 column, no face shows through a column in front of it.
- **Keyboard:** Enter, the right arrow, Space, S and the digits 1 to 3 work, and the live region announces manual steps and the end of a run.
- **Reduced motion:** with reduced motion turned on in the OS, swaps jump without a tween, and a flick does not glide.
- **Clean unmount:** no console errors and no running timer or transition after leaving the page mid-run.
- **Themes and width:** light and dark themes are legible, and at 375 px nothing overlaps and the page does not scroll sideways.

## Potential Risks and Mitigations

1. **The footprint-depth sort misorders two columns at a steep tilt.**
   Mitigation: the footprints are disjoint and equal, and the tilt clamp in `pose` keeps the camera above the floor, so the floor depth decides the order. The painting-order criterion checks the worst pair. If it still fails, add the slot angle as a tie-breaker.

2. **At 30 steps per second, the tweens never finish and the ring looks blurry.**
   Mitigation: the duration shrinks with the interval (step 5), and above about 15 steps per second the swap jumps without a tween.

3. **Quick sort's far swaps cross half the ring and pass over many columns.**
   Mitigation: the inner and outer radii keep the two travellers off the ring itself, so they pass in front of and behind the columns in between.

4. **The live region floods a screen reader during play.**
   Mitigation: only manual steps and the end of a run are announced (step 8).

5. **A perspective camera breaks the footprint order.** `sort` compares the rotated z, the depth along the view axis. In perspective the eye sits at a point, at the rotation centre plus `.perspective` times `viewDirection` (`src/shapes/shape.ts:172-178`), so the footprints near the edge of the view would need to sort by their distance from that point instead.
   Mitigation: this version stays orthographic. A perspective variant computes that distance per footprint and sorts by it, which is the test `normal` describes for faces (`src/normal.ts:7-11`).

## Alternative Approaches

1. **Columns in a straight row:** the familiar picture from textbooks, but a row is a 2D chart, and the ring is what makes the 3D view worth turning.
2. **Precomputing the whole run as a list of steps:** scrubbing backwards becomes easy, but large inputs need memory, and the generator shows the algorithm as written.
3. **More algorithms, such as merge sort or heap sort:** merge sort does not swap, so it would need a second kind of animation. These can come in a later version.
4. **Colour by value:** a sequential scale would repeat the height, and the step state would need another channel.
