# Pixel space example

## Context

The 2018 gist ([data-binding and canvas with d3.js](https://gist.github.com/Niekes/74a509b574e9e30b0e67d2c8cbd70699)) showed how to keep d3's data join and transitions while drawing many items on a canvas. It bound 22,500 image pixels to detached `custom` elements, transitioned their attributes when hue, saturation or lightness changed, and redrew from those elements with `d3.timer`. The idea still holds, but the technique is dated. The library now has helpers that do the job without any DOM node: `camera3D`, `.matrix()`, `projectPositions`, `viewDirection`, `box` and `normal`.

The new docs example is **Pixel space** (decided with the user), and it uses only a 2D canvas:

- **Points:** every pixel of Van Gogh's *The Starry Night* (public domain) is a 3D point, from 10k to 160k of them.
- **Layouts:** the points morph between four layouts, with an eased, staggered transition:
  - **image:** flat on the floor;
  - **relief:** lightness as height;
  - **RGB cube:** a framed cube;
  - **HSL cylinder:** hue as the angle, saturation as the radius, lightness as the height.
- **Hover:** shows the pixel and its color.
- **Click:** picks a color and dims every pixel that is not close to it. The selection stays across layouts, so a cluster picked in the cylinder shows where it lies in the image.
- **Sliders:** the gist's hue, saturation and lightness sliders recolor the pixels, and in the color-space layouts the cloud moves with them.

## Approach

Build on the shared canvas scaffold `canvasFigure` ([docs/examples/canvasFigure.ts](docs/examples/canvasFigure.ts)). It already provides the stage, sizing for the device pixel ratio, the count picker, drag-to-rotate with the click kept (`dragRotate`, `clickDistance(4)`), auto-spin, fps, the frame loop and dispose. Pass only a `canvas` renderer.

### Files

| File | Change |
|---|---|
| `docs/examples/pixelSpace.ts` | **new.** `export function mountPixelSpace(host): () => void` |
| `docs/examples/pixel-space.md` | **new.** The page, modelled on [point-cloud.md](docs/examples/point-cloud.md) |
| `docs/examples/pixelSpace.css` | **new.** The readout in the stage corner and the slider widths |
| `docs/examples/starry-night.jpg` | **new.** About 500×400 px, under 100 KB. Downloaded from Wikimedia Commons (PD-Art) and resized with `sips` |
| [docs/examples/canvasFigure.ts:79-81](docs/examples/canvasFigure.ts#L79-L81) | Without a `webgl` renderer, hide the renderer `<fieldset>` instead of disabling its radio |
| [docs/examples/canvasFigure.css:37](docs/examples/canvasFigure.css#L37) | Generalize `canvas[hidden]` to `.canvas-figure [hidden] { display: none; }`. The fieldset sets `display: flex`, which overrides the UA `[hidden]` rule |
| [docs/.vitepress/config.ts:91](docs/.vitepress/config.ts#L91) | Add a sidebar entry `{ text: 'Pixel space', link: '/examples/pixel-space' }` after Point cloud |
| [docs/examples/index.md](docs/examples/index.md) | Add a bullet after Point cloud |
| `plans/2026-10-22-pixel-space-v1.md` | A copy of this plan, following the repo's plan convention |

### `pixelSpace.ts` design

**Image and data.** These are rebuilt when the count changes, using the same key check as in `barField`.

- Load the painting with `new URL('./starry-night.jpg', import.meta.url).href`. `image.decode()` sets `ready`, and `draw` returns early until then.
- The counts are `[10_000, 40_000, 160_000]`, with 40k as the default; the unit is `pixels`.
- Fit the image to a w×h grid where `w*h ≈ count` and the aspect ratio is kept. Draw it onto an offscreen canvas at w×h and call `getImageData`.
- Per pixel, keep:
  - the base HSL, computed once with d3 `hsl(rgb(...))`, with a `NaN` hue or saturation set to 0 (grays, black and white);
  - its column and row.

**Color adjustment (the gist's sliders).**

- The sliders are:
  - hue shift, 0–360°;
  - saturation, 0–200%;
  - lightness, 0–200%.
- They listen to `input` and set a dirty flag. The next frame then:
  - recomputes the adjusted h, s, l and the adjusted rgb, through d3 `hsl(h,s,l).rgb()`;
  - packs the colors into a `Uint32Array`, in little-endian ABGR as `pointCloud` does;
  - recomputes the targets of the current layout.

**Layouts.** Each layout is a function from pixel `i` to world x, y, z, with up as −y and the floor at y = 0. Its results go into `targets: Float32Array(3n)`.

- **image:** `x = (2col − w)/L`, `z = (2row − h)/L` and `y = 0`, where L is the longer side. The image lies on the turntable, reads upright from the front, and the scaffold's tilt and spin turn it.
- **relief:** the same x and z, with `y = −l' · RELIEF`.
- **RGB cube:** `x = (r−½)·S`, `y = −(g−½)·S` and `z = (b−½)·S`.
- **HSL cylinder:** `x = s'·cos h'`, `z = s'·sin h'` and `y = −(l'−½)·H`.

**Morph.** This replaces the gist's DOM transition.

- On a layout change, snapshot `from.set(current)` and record the start time.
- Every frame:
  - each point gets `tᵢ = clamp((t − dᵢ·STAGGER)/(1 − STAGGER))` with `easeCubicInOut`, where `dᵢ = (col/w + row/h)/2` gives a diagonal wave;
  - `positions = from + (targets − from)·eᵢ`.
- Once the morph is done, the renderer projects `targets` directly.
- Under `prefers-reduced-motion` the duration is 0.

**Canvas renderer: software z-buffer plus id buffer.** No sort is needed, and the picking costs nothing extra.

- **Projection:** `projectPositions(current, camera.matrix(), screen)`. Depth is the rotated z, and larger values are nearer, so the test is `depth > zbuf[p]`.
- **Clear:** fill the color `Uint32Array`, a `Float32Array` depth buffer with `-Infinity`, and an `Int32Array` id buffer with `-1`, all at device-pixel size.
- **Splat:** each point is a square of `size = ceil(1.42 · cellPx · dpr)` device pixels. The factor 1.42 closes the gaps when the image grid is turned 45°. Wherever the point wins the depth test, write its color (or its dimmed color) and its index. Then call `putImageData` once.
- **Hover:** `ids[py·width + px]` at the last pointer position.
  - Convert the pointer with the canvas's CSS scale, `canvas.width / canvas.clientWidth`, because the canvas is drawn at 100% width.
  - Follow the `meshInspector` pattern: update only while `!event.buttons`, and clear on `pointerleave`.
  - Draw a ring at the hovered point.
  - Update the readout element only when the hovered pixel changes, for example `pixel 54, 12 · #26478c`.
- **Click:** a click on a pixel selects its color, and a click on the background clears the selection.
  - The selection is an RGB distance of at most `BRUSH` to the picked color.
  - Pixels outside it are mixed 80% towards the background. Compute these colors once per selection or slider change.
  - The readout shows `1,234 pixels near #26478c (3.1%)`.
  - Mark the RGB-distance heuristic with a `ponytail:` comment: Lab would match perception better, and d3 `lab` is available.
- **RGB cube frame:**
  - Use `box({x:0, y:S/2, z:0, width:S, height:S, depth:S})` for the 8 corners, with the six faces as index quads in `cubes3D` order (front 0123, back 7654, left 4510, right 3267, top 4037, bottom 1562).
  - Compute the face normals once with `normal(...)`, in world space.
  - Every frame, project the corners with `projectPositions` and the same matrix. A face faces the camera where `dot(normal, camera.viewDirection()) > 0`.
  - Stroke the back faces faint and dashed and the front faces solid, both after `putImageData`.
  - Fade the frame in only in the RGB layout.
- **Background:** one fixed dark neutral, as `pointCloud` uses, so that the light pixels show. Tune it in the browser.

**Controls.** After `canvasFigure()` returns, append them to the scaffold's form:

- a `<fieldset>` "layout" with four radios;
- three range inputs, each with a value `<span>`.

Add the readout `<output>` to the stage. The scaffold's own `change` handler reads only `count` and `renderer`, so these extra inputs do not disturb it.

**Constants to tune in the browser:** `SCALE ≈ 190`, `TILT = -0.6`, `RELIEF`, `S`, `H`, `DURATION ≈ 1800`, `STAGGER ≈ 0.4` and `BRUSH`.

### Page (`pixel-space.md`)

The usual `<script setup>` mount and unmount, then:

1. **Usage:** drag to rotate, pick a layout, hover, click a color, the sliders.
2. **From custom elements to typed arrays:** the gist's detached `custom` elements and `d3.timer`, next to one `Float32Array` per state. Link the gist.
3. **One transition for every pixel:** a snippet of the lerp and the stagger.
4. **Depth and picking from one buffer:** the z-buffer and the id buffer, with hover as one array read.
5. **The frame of the cube:** `box`, `normal` and `camera.viewDirection()`.
6. **The whole source:** `<<< @/examples/pixelSpace.ts`.
7. **Credit:** Vincent van Gogh, *The Starry Night* (1889), public domain, via Wikimedia Commons.

Write backtick API names so that they auto-link to `/api/`.

## Rules (from AGENTS.md)

- The docs import only from `../../index`.
- Functions use `export function`, and there are no default exports.
- No library changes are needed: every helper used is already public.

## Verification

1. `npm run typecheck`, `npm run lint` and `npm test`. The library is unchanged, but run them anyway for fallow dupes and dead code.
2. `npm run docs:build`: the SSR build has to accept `import.meta.url` and the asset.
3. Run `npm run docs:dev` and open `/d3-3d/examples/pixel-space` in Chrome (claude-in-chrome). Check:
   - the image renders, and the morph runs through all four layouts;
   - the hover readout and ring appear, the click brush persists across layouts, and a click on the background clears it;
   - the sliders move the cloud in HSL and RGB;
   - the frame rate at 40k and at 160k;
   - the light and dark themes;
   - the renderer toggle is hidden.
4. Regression check: [bar-field](docs/examples/bar-field.md) and [point-cloud](docs/examples/point-cloud.md) still show the WebGL toggle and work.
5. No commit unless the user asks. The current branch is `feat/terrain-plot`.
