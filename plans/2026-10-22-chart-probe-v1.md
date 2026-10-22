# Chart probe for the scatter plot

## Objective

Extend the scatter plot at `/examples/scatter-plot` (`docs/examples/scatterPlot.ts`) with a probe that reads values off the floor of the chart box:

- **Crosshair:** while the pointer rests over the plot, a crosshair is drawn on the floor wall of the box, along the data x and data y axes from wall edge to wall edge.
- **Readout:** a readout in the controls shows the data x and data y under the pointer.
- **Sample hovered:** when the pointer is over a sample, a drop line runs from the sample down to the floor wall, and the crosshair moves to the sample's foot.
- **Rotation:** the probe follows the scene through the drag glide and the auto-rotation, with the pointer at rest.

The page section teaches one thing: the floor of a chart is one plane, so `unproject` (`src/shapes/shape.ts:34`) turns the pointer into data coordinates. You take the world point on that plane and invert the axis scales.

Assumptions:

- **No library changes.**
- **The coordinate mapping.** All renderers of the figure share one mapping (`docs/examples/scatterPlot.ts:243-252`): data x becomes world x through `scales.x`, data y becomes world z through `scales.y`, and data z becomes world y through the negated `scales.z`. Every axis spans −1 to 1 in world units.
- **What unproject returns.** `unproject` returns world coordinates, which are what the accessors produce. So the data values are `scales.x.invert` of world x and `scales.y.invert` of world z.
- **Which wall is the floor.** It is whichever of the two horizontal walls is currently drawn. The figure draws only the walls that face away from the camera (`docs/examples/scatterPlot.ts:317`), so seen from above that is the bottom wall at world y = +1, and seen from below the top wall at world y = −1.
- **Pointer only.** The probe is an extra aid for pointer users. The existing tooltip and halo stay as they are, and the readout is not a live region.
- **Shared rules.** All `AGENTS.md` rules apply, and the styles go in `docs/examples/scatterPlot.css`.

## Implementation Plan

- [ ] 1. Add a probe renderer: a `lines3D` over plain points in data units. Add it to the `renderers` list at `docs/examples/scatterPlot.ts:245`, so it shares the scale, the origin, the accessors and every rotation. Add a probe group after the walls and the axes, before the data group, so samples paint over the crosshair. Rationale: in data units, the crosshair follows dataset switches and the axis mapping without extra code.

- [ ] 2. Find the floor plane. On every draw, find the drawn horizontal wall: among the walls from the box renderer that face away, it is the one whose four vertices share one data z. Its world height is the negated `scales.z` of that z, and its normal points along y. If no horizontal wall is drawn, because the view is exactly level, there is no probe. Rationale: the floor flips to the top wall when the user turns the box upside down, and the drawn wall is the one the user sees behind the data.

- [ ] 3. Track the pointer. On pointer move over the SVG, not only over the data group, keep the pointer position while no button is down. Clear it when a button is down or on pointer leave. Compute the probe inside the existing scene draw (`docs/examples/scatterPlot.ts:384`), which the drag callback and the auto-rotation frame (`docs/examples/scatterPlot.ts:430`) both call. That way the probe follows a turning scene with a resting pointer, the same pattern as the voxel builder's retarget (`docs/examples/voxelBuilder.ts:320`).

- [ ] 4. Compute the probe from the hovered sample or the pointer.
  - **Pointer over a sample:** the hovered sample is the one the existing tooltip handler sets (`docs/examples/scatterPlot.ts:529`). Its foot is the sample's data x and data y at the floor's data z.
  - **Otherwise:** call `unproject` on one of the posed renderers with the pointer in the group's coordinates (d3's pointer helper) and the floor plane from step 2. Convert the world point to data with the inverted scales, and keep it only if both values lie within their domains.

  The probe draws:
  - two segments on the floor through the probed point, each spanning the full domain of the other axis;
  - with a sample hovered, a vertical drop line from the sample to its foot.

  Draw them with `placeSegments` (`docs/examples/segments.ts:8`).

- [ ] 5. Add the readout to the scatter controls row: "x … · y …" in the data units of the current dataset, formatted with the figure's existing three-significant-digit formatter. Leave it blank when there is no probe. The axis titles of the dataset can name the values if the dataset carries them.

- [ ] 6. Style the probe in `docs/examples/scatterPlot.css`:
  - thin dashed crosshair lines in the ink color at reduced opacity;
  - a solid drop line in the hovered sample's series color;
  - no pointer events on the probe group;
  - a crosshair cursor over the plot area, while keeping the grab cursor while dragging.

- [ ] 7. Update `docs/examples/scatter-plot.md` with a section "Reading the floor". It explains:
  - why a screen point has no data value until a plane is chosen;
  - which wall is the floor;
  - the unproject call and the inverted scales, with a short excerpt;
  - that the drop line shows which floor point a sample sits above.

  Link the README entry of `unproject`, at the anchor unprojectpoint-planepoint-planenormal.

- [ ] 8. Run the type, lint, docs-build and audit gates, and fix what they report:
  - `npm run typecheck`, `npm run lint` and `npm run docs:build`;
  - the project-pinned fallow audit through npx.

## Verification Criteria

- The gates pass, and `git diff --stat -- index.ts src tests` is empty.
- **Crosshair position:** in `npm run docs:dev`, the crosshair's two lines cross within 1 px of a pointer resting over the floor, at three different rotations.
- **Readout accuracy:** with the pointer on a gridline crossing of the floor, the readout shows the two tick values of that crossing, within the formatter's precision.
- **Hovered sample:** the drop line ends on the floor directly below the sample, and the readout equals the sample's x and y in the tooltip.
- **Upside down:** after turning the box over, the probe moves to the top wall and still reads correct values.
- **Auto-rotation:** with auto-rotate on and the pointer at rest, the crosshair stays under the pointer, and the readout changes as the floor turns beneath it.
- **During a drag:** the probe is hidden while a drag is on, and the existing tooltip, halo, legend and dataset switch behave as before.
- **Clean unmount:** no console errors after leaving the page.
- **Themes and width:** light and dark themes are legible, and at 375 px the readout wraps without overflow.

## Potential Risks and Mitigations

1. **Both horizontal walls are drawn, or neither is, when the view is level.**
   Mitigation: when no single horizontal wall faces away, hide the probe. `unproject` also returns null for an edge-on plane.

2. **Recomputing the probe every auto-rotation frame costs time.**
   Mitigation: it is one unproject call and three segments per frame, which is negligible next to the samples.

3. **Inverting a scale with a reversed or nice-extended domain gives values outside the data.**
   Mitigation: keep the probe only while both values lie within the scale domains (step 4). The crosshair spans the domains, not the data extent.

## Alternative Approaches

1. **Probe on the trajectory explorer instead:** it also uses `axes3D`, but its curves give the drop line less to point at.
2. **Snap the crosshair to the nearest sample's foot:** easier to read near samples, but it hides the continuous coordinate the page is about.
3. **A full 3D crosshair with lines to all three walls:** more complete, but it crowds the box. The floor alone already shows the technique.
