# Furniture for the floor-plan explorer

## Objective

Extend the floor-plan explorer at `/examples/floor-plan` (`docs/examples/floorPlan.ts`) with furniture you can move:

- **Footprints:** every room holds a few flat furniture footprints, such as desks, a table, a sofa or a shelf, drawn on its floor.
- **Dragging:** a footprint can be dragged across its floor. It snaps to a 0.25 grid and turns by 90 degrees with the T key.
- **Placement rule:** a footprint must stay inside one room and must not overlap another footprint. A move that breaks this is refused, and the footprint stays at its last valid place.
- **Free area:** the inspector shows the free floor area of the selected room, which is its area minus its footprints. It updates during the drag.
- **Unchanged:** dragging a room or the background still rotates the building, and the spread, the zoom and the selection all keep working.

The page section teaches one thing: every floor is a plane at its own height. A drag on a raised, spread or zoomed floor uses `unproject` (`src/shapes/shape.ts:34`) on the plane at that floor's current height, so the footprint stays under the pointer whatever the building's pose.

Assumptions:

- **No library changes.**
- **Units.** Room plans are in metres, in plan x and z (`docs/examples/floorPlan.ts:71-81`, a 12 × 8 footprint). So areas are in square metres.
- **Floor heights.** Every renderer lifts a floor through its y accessor, set to the negated `elevation` (`docs/examples/floorPlan.ts:291` and `:297-299`). The world height of floor f is therefore the negated elevation of f at the current spread. That is the plane point for `unproject`, with a normal along y.
- **What unproject returns.** The x and z accessors are the defaults, so the x and z that `unproject` returns are plan coordinates directly.
- **Flat footprints.** Footprints are flat rectangles in the floor plane, not boxes. That fits the flat rooms, and they need no depth sort inside a floor.
- **No saving.** Furniture positions are not saved.
- **Shared rules.** All `AGENTS.md` rules apply, and the styles stay inline like the rest of the figure (`docs/examples/floorPlan.ts:40-45`).

## Implementation Plan

- [ ] 1. Add the furniture data.
  - **Items:** each has an id, the id of the room it starts in, a kind (desk, table, sofa or shelf), a width and a depth in metres, a centre in plan x and z, and a turn of 0 or 90 degrees.
  - **Starting places:** two to four items per room, each fully inside its room.
  - **Mutable state:** keep the positions in an array inside the mount function, because they change.
  - **Footprint helper:** a function returns the four plan corners of an item from its centre, its size and its turn.

  Rationale: the corners feed both the drawing and the validity check.

- [ ] 2. Add a `polygons3D` renderer for the footprints. Each vertex carries the plan x and z, the floor, and the item. Add it to the `renderers` list at `docs/examples/floorPlan.ts:297`, so it shares the spread accessor, the zoom and the rotation set in render (`docs/examples/floorPlan.ts:362`). In the floor join (`docs/examples/floorPlan.ts:386-411`), add a furniture group to every floor, after the rooms group and before the labels group, so the room names stay readable. Join one path per item by its id, with a class for its kind.

- [ ] 3. Drag footprints with a d3 drag on the footprint paths. d3-drag stops propagation on `mousedown` and `touchstart` (see `node_modules/d3-drag/src/drag.js`), so a footprint drag never turns the building.
  - **On start:**
    - select the item and its room;
    - unproject the pointer onto the item's floor plane at the current spread;
    - keep the grab offset between the item's centre and that hit.
  - **On each drag event:**
    - unproject again, onto the floor plane at the current spread, so a spread animation during the drag stays correct;
    - add the offset and snap to 0.25;
    - accept the new centre only if the move passes the check in step 4;
    - redraw.
  - **Edge-on floors:** when `unproject` returns null, keep the last position.

  Rationale: this is the lesson of the page. The plane height comes from the same `elevation` function the renderers use.

- [ ] 4. Check placements. A placement is valid when both of these hold:
  - all four corners lie inside one room of the same floor, using d3 `polygonContains` on the room's plan, with corners pulled 0.05 towards the centre, so a footprint touching a wall still counts as inside;
  - the footprint does not overlap any other footprint in that room. All footprints are axis-aligned, so a rectangle overlap test is enough.

  While the pointer is somewhere invalid, the item stays at its last valid place and gets an invalid style. The room containing the item is its room from then on, so items can move between the rooms of one floor.

- [ ] 5. Turn an item with the T key while it is selected, by 90 degrees about its centre, if the turned footprint is valid. The R key already resets the view, see the actions map at `docs/examples/floorPlan.ts`.

- [ ] 6. Show the free area. Extend `describe` (`docs/examples/floorPlan.ts:207`) for a selected room with its free floor area: the absolute d3 `polygonArea` of the room plan minus the footprint areas of its items, as for example "17.5 m² free of 24 m²". With an item selected, prefix the item's kind and size. The inspector already updates on every render, so it follows the drag.

- [ ] 7. Selection and hover.
  - **Click:** in the click handler (`docs/examples/floorPlan.ts:545`), a click on a footprint selects its room and the item.
  - **Hover:** extend `roomAt` (`docs/examples/floorPlan.ts:251`) so that a footprint target resolves to its item's room, which keeps the hover name and the selection working over furniture.
  - **Clearing:** selecting another room, a floor or nothing clears the item.
  - **Highlight:** the selected item is drawn with an ink outline.

- [ ] 8. Keyboard. While an item is selected:
  - the arrow keys move it by 0.25 in plan x and z, taking precedence over walking the selection, within the same validity check;
  - T turns it;
  - the first Escape clears the item and the next one clears the room.

  Extend the keydown handler (`docs/examples/floorPlan.ts:608`) and the help list in `CONTROLS` (`docs/examples/floorPlan.ts:235`) with the new keys, and announce the item's position and the free area in the existing inspector text.

- [ ] 9. Update `docs/examples/floor-plan.md` with a section "Moving furniture". It covers:
  - the plane of a floor at its current spread;
  - the unproject call with the grab offset;
  - the validity check with `polygonContains`;
  - the free-area sum.

  Link the README entry of `unproject`, at the anchor unprojectpoint-planepoint-planenormal. Update the page's interaction line with dragging footprints and the T key.

- [ ] 10. Run the type, lint, docs-build and audit gates, and fix what they report:
  - `npm run typecheck`, `npm run lint` and `npm run docs:build`;
  - the project-pinned fallow audit through npx.

## Verification Criteria

- The gates pass, and `git diff --stat -- index.ts src tests` is empty.
- **Footprint under the pointer:** while dragging a footprint, its grabbed point stays within 1 px of the pointer at three rotations, at spread 0 and spread 1, and at zoom 0.5 and 3.
- **Two drags:** dragging a footprint never turns the building, and dragging a room or the background still turns it with the glide.
- **Placement rule:** a footprint cannot be dragged through a wall into the outside or onto another footprint. Moving it into another room of the same floor works, and the room it belongs to changes.
- **Snapping and turning:** positions snap to multiples of 0.25. T turns an item only where the turned footprint fits.
- **Free area:** the inspector's free area equals the room area minus the listed footprints, and it updates during a drag.
- **Unchanged behaviour:** clicking a footprint selects its room, and the hover name, the spread slider, the button animation, the zoom and the existing keys behave as before.
- **Clean unmount:** no console errors after leaving the page mid-drag.
- **Themes:** light and dark themes are legible.

## Potential Risks and Mitigations

1. **Corners that lie exactly on a wall flicker between valid and invalid.**
   Mitigation: test corners pulled 0.05 towards the centre (step 4), and snap to a grid of 0.25.

2. **The spread animation moves the floor during a drag**, so the footprint slides away from the pointer.
   Mitigation: every drag event unprojects onto the plane at the current elevation (step 3), so the footprint keeps up with the floor.

3. **The arrow keys now have two meanings.**
   Mitigation: they move an item only while one is selected, and the help list says so. Escape always steps back to the plain room selection.

4. **The furniture adds paths to every floor and slows the render** during the spread animation.
   Mitigation: at two to four items per room, that is about 60 paths, which is small next to the rooms and the slabs.

## Alternative Approaches

1. **Furniture as low boxes with `cubes3D`:** more realistic, but boxes need a depth sort inside a floor, and they hide the room colors.
2. **Free movement with collision only against the outer walls:** simpler, but rooms lose their meaning, and the free area per room becomes unclear.
3. **Drag by hit-testing room paths instead of unproject:** this only gives the room under the pointer, not a position inside it, so no smooth drag.
