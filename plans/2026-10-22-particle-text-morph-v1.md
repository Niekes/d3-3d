# Particle text morph example

## Objective

Add a docs example, "Particle text morph", at `/examples/particle-text-morph`. 1500 particles drawn with `points3D` form a word, and they fly into another word or a shape.

- **Presets:** buttons for two words, "d3-3d" and "hello", and three shapes, a sphere, a torus and a helix.
- **Your own text:** a text field of up to 12 characters. Enter morphs the particles into it.
- **Morph:** the particles fly from shape to shape in about 1.4 seconds, starting from the left in a short stagger.
- **Rotating:** dragging rotates the scene with the shared glide, during a morph too. The words have a little depth, so a turn shows a slab, not a sheet.
- **Next:** the scaffold button steps to the next preset.

The page teaches three things:

1. **Morph the data, not the picture.** The figure interpolates the positions in model space and projects them again every frame. A turn during a morph stays correct, because the renderer projects whatever positions the frame holds. The pixel space does the same with up to 160,000 points on a canvas (`docs/examples/pixelSpace.ts:9-18`); this page does it with SVG elements that keep their identity. This is the main lesson.
2. **Text into data.** The text is drawn onto a hidden 2D canvas, and its opaque pixels become points in the model. The canvas is the sampler, so any font the browser has works.
3. **The same circles all the way.** The circles are joined by the index of their particle, so no particle ever enters or exits. A morph is an update and nothing else.

Assumptions:

- **No library changes.** `points3D` and `sort` are public.
- **Orthographic.** The renderer keeps the default perspective of `Infinity`. The morph runs in the model, so nothing in it depends on the projection.
- **A fixed count.** There are always 1500 particles. A source with more opaque pixels is subsampled with the seeded d3 `randomLcg` generator, and a source with fewer repeats its pixels with a small jitter.
- **The sampler.** A canvas of 320 × 100 px, with a bold `system-ui` font that shrinks until the text fits the width. Every pixel with an alpha above 127 counts.
- **The model.** The canvas maps onto x from −1.6 to 1.6 and y from −0.5 to 0.5. The canvas y grows downwards like the screen y, so the text stands upright. Every particle gets a z jitter of up to 0.06.
- **The shapes.** A Fibonacci sphere of radius 0.8, a torus with radii 0.7 and 0.25 and a helix of two turns, each sampled at 1500 points.
- **The matching.** Both the source and the target are sorted by x and paired by rank. The code marks this with a `ponytail:` comment naming the ceiling, paths that cross, and the upgrade, an assignment by nearest neighbor.
- **User text crosses a trust boundary.** It is drawn on the canvas and shown with `textContent` only. It never reaches `innerHTML`, which `rotatingFigure` uses for its label at `docs/examples/rotatingFigure.ts:164-165`. The length is capped in the code as well as by the field.
- **Shared rules.** All `AGENTS.md` rules apply. The styles live in the module, as in `docs/examples/splineEditor.ts:455`.

## Implementation Plan

- [ ] 1. Create `docs/examples/particleTextMorph.ts`, which exports only `mountParticleTextMorph`, taking the host and returning a dispose function.
  - Mount it through `rotatingFigure` at `docs/examples/rotatingFigure.ts:155` with the prefix `morph`, and relabel the button "next".
  - Set one `points3D` renderer to scale 220, with the origin in the middle of the 960 × 500 view box, and turn it with `turnCamera` from `docs/examples/rotatingFigure.ts:138`. A renderer is a camera itself, so a figure with one renderer needs no `camera3D`, as the surface figure turns its one renderer at `docs/examples/surfaceFigure.ts:59`.
  - Keep the state in one place: the current positions, the running morph, the preset index, the yaw and the pitch. One render function reads the state.

  Rationale: this is the house pattern of every rotating figure.

- [ ] 2. Write the text sampler, which turns a string into 1500 model points.
  - Create the canvas once, and ask for its 2D context with `willReadFrequently`, because the figure reads it back every time.
  - Clear it, shrink the font until the measured text fits, and draw the text centered.
  - Read the image data and collect the opaque pixels, then map them into the model and pick 1500 of them as the assumptions describe.
  - Return nothing when no pixel is opaque, such as for a string of spaces.

- [ ] 3. Write the three shape samplers for the sphere, the torus and the helix, each returning 1500 model points from the parameters in the assumptions.

- [ ] 4. Pair the particles with the target points by rank: sort the current positions and the target by x, and give each particle the target of its rank. Keep the particle ids fixed, so only the targets move. Rationale: particles fly to the same part of the new shape, so the morph reads from left to right.

- [ ] 5. Run a morph with a d3 timer.
  - Each particle starts after a delay of up to 30 % of the duration, by the x of its target, and eases with the cubic in-out ease, the stagger of the pixel space at `docs/examples/pixelSpace.ts:370-371`.
  - Each frame interpolates every particle in model space between where it was when the morph began and its target, and renders.
  - A morph that starts during another one begins at the current positions, so nothing jumps.
  - With `prefers-reduced-motion`, the duration is 0 and the particles jump to their targets.

  Rationale: interpolating in the model, not on the screen, is the main lesson.

- [ ] 6. Render the particles: join one circle per particle, keyed by its index, as `docs/examples/solarSystem.ts:155` keys its triangles. Fill each circle by the x of its target on a sequential ramp, and paint them back to front with `sort`. Measure the frame time with 1500 circles; risk 1 says what to do if it is too slow.

- [ ] 7. Add a controls row below the SVG.
  - The five preset buttons.
  - A form with a text field limited to 12 characters and a "morph" submit button.
  - A polite live region.

  Validate the text on submit: trim it and cut it to 12 characters. An empty text shows "Type at least one character." and a text without opaque pixels shows "Nothing to draw for that text."; both keep the current shape. Rationale: the field is the trust boundary from the assumptions.

- [ ] 8. Make every control work from the keyboard: the presets are buttons and the text field is a form, so Tab, Enter and Space work natively. Keep the focus in the field after a submit, and announce "Morphing into" and the text in the live region with `textContent`.

- [ ] 9. Write the inline style constant with the prefix `--pm-`, its dark-mode overrides under the `dark` class, the particle color ramp for both themes, and a controls row that wraps at phone width, following `docs/examples/splineEditor.ts:455`.

- [ ] 10. Clean up after the figure: the dispose function stops a running morph timer and empties the host, and the timer also stops by itself once the host has left the page, as the glide at `docs/examples/rotatingFigure.ts:55` does.

- [ ] 11. Write the page `docs/examples/particle-text-morph.md` with the mount block of `docs/examples/spline-editor.md:1-23`, an interaction line, and these sections:
  - "Text into data": the canvas as a sampler;
  - "Morph the data, not the picture": interpolating in the model;
  - "The same circles all the way": the keyed join;
  - "Your own text": the field and why it never becomes markup;
  - "The whole source".

- [ ] 12. Register the page in the sidebar and the gallery.
  - Add the sidebar entry "Particle text morph" to the example list of `docs/.vitepress/config.ts`, which sorts the entries by name at `docs/.vitepress/config.ts:100`.
  - Add a bullet after the pixel space line at `docs/examples/index.md:16`, naming `points3D`.

- [ ] 13. Run the type, lint, docs-build and audit gates, and fix what they report.
  - Run `npm run typecheck`, `npm run lint` and `npm run docs:build`.
  - Run the project-pinned fallow audit through npx.

  Extract a shared helper only for a duplicate that fallow reports.

## Verification Criteria

- The gates pass, and `git diff --stat -- index.ts src tests` is empty.
- **Sampling:** "d3-3d" is legible at the starting view, a text of 12 characters fits the width, and a single character still uses all 1500 particles.
- **Morph:** a morph takes about 1.4 seconds. Turning the figure during a morph makes no particle jump, and a new morph started during one continues from the current positions.
- **Join:** after ten morphs the SVG still holds exactly 1500 circles.
- **Input:** an empty or blank text shows its status and keeps the shape. Markup typed into the field is drawn as text and never becomes an element.
- **Frame time:** a morph frame with 1500 circles, including the sort, stays under 16 ms on a laptop, or the sort is dropped as risk 1 says.
- **Reduced motion:** the particles jump to every new shape without a flight.
- **Clean unmount:** no console errors and no running timer after leaving the page mid-morph or mid-glide.
- **Themes and width:** light and dark themes are legible, and at 375 px the field and the buttons wrap without overlapping.

## Potential Risks and Mitigations

1. **Sorting and moving 1500 circles every frame takes longer than 16 ms on slow machines.**
   Mitigation: drop the sort, because dots of 2 px rarely overlap where the order would show. If it is still slow, move the figure to the canvas scaffold listed under alternatives.

2. **A thin font or a short word gives too few opaque pixels.**
   Mitigation: the bold weight, and the repeat with jitter from the assumptions.

3. **The fonts differ between platforms, so the sample differs.**
   Mitigation: the sampler runs in the browser, so every platform samples its own `system-ui`, and the page says so.

4. **A long text squeezes into a line too thin to read.**
   Mitigation: the cap of 12 characters and the shrinking font.

5. **Particles cross each other in a tangle during a morph.**
   Mitigation: the pairing by rank from step 4. The upgrade is named in the `ponytail:` comment.

## Alternative Approaches

1. **A canvas figure like the pixel space, through `docs/examples/canvasFigure.ts:50` and `projectPositions`:** a hundred times the particles, but the keyed join that the page shows is gone, and the pixel space already teaches that way.
2. **An optimal assignment between the shapes:** the cleanest paths, but its cost grows with the cube of 1500.
3. **Glyph outlines from a font parser:** exact letters, but it needs a new dependency, and the canvas samples the text natively.
4. **A perspective camera:** a turn would show the depth of the slab more, but the words are only 0.12 deep, so it would barely show.
