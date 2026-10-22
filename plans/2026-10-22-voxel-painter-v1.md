# Voxel painter: painting and saving in the voxel builder

## Objective

Extend the docs example "Voxel builder" at `/examples/voxel-builder`, rather than adding a new page. The builder can already add and remove cubes in six colours. This version adds three things:

- **Paint mode:** a third mode next to build and erase. Clicking a cube recolours it to the current colour without changing the build. The hovered cube previews its new colour.
- **Picking a colour:** in paint mode, Shift-click picks the colour of the clicked cube, as an eyedropper.
- **Saving and loading:** export writes the build as JSON into a text field and offers it as a file download. Load reads JSON pasted into the field, or a file chosen from disk, and rebuilds the scene from it.

The page teaches two new things, next to its four existing lessons:

1. **A recolour is a class change.** Cubes are joined by their cell key (`docs/examples/voxelBuilder.ts:226-235`), so painting changes one group's colour class and adds or removes no element. The scene's state is the map of cells, and the drawing follows from it.
2. **A saved build is untrusted input.** A pasted text or a chosen file can hold anything. The loader checks the size, the format, the bounds and the colour of every cube before it touches the build, and either loads everything or nothing. This is the main lesson.

Assumptions:

- **No library changes.** Only `docs/examples/voxelBuilder.ts`, `docs/examples/voxel-builder.md` and `docs/examples/index.md` change, so `git diff -- index.ts src tests` stays empty.
- **The palette stays fixed.** Colours remain the six named palette entries (`docs/examples/voxelBuilder.ts:27`), each with a light and a dark token (`docs/examples/voxelBuilder.ts:449-454` and `:473-478`). A saved cube stores its colour by name, for example "blue", and a name outside the six is rejected. Custom colours are listed under alternatives.
- **The file format.** A JSON object with:
  - the format name "d3-3d-voxels";
  - the version 1;
  - the grid size as columns, layers and rows (8, 6, 8);
  - a list of cubes, each a column, a layer, a row and a colour name.

  Coordinates count from 0, as in the code. Cubes are written in layer, row, column order, so the same build always exports the same text.
- **No persistence.** Nothing is kept in the URL or in browser storage. Export and load are explicit.
- **Moved helpers.** At 1e92cf8, `Cell`, the face steps, `keyOf` and `neighborOf` still live in the voxel builder (`docs/examples/voxelBuilder.ts:30`, `:48-55`, `:99` and `:112-115`). The cellular automaton and packing playground plans move them into `docs/examples/cubeFaces.ts`. If either is built first, the `voxelBuilder.ts` line numbers below have shifted, so re-read the module before step 1. The move changes only imports, so no step of this plan depends on it.
- **The builder's camera.** The builder already builds its cubes with `box` (`docs/examples/voxelBuilder.ts:118-130`) and hangs its renderers on one `camera3D` posed by `pose` (`docs/examples/voxelBuilder.ts:148-152`, `:205`). Painting and loading change neither. The camera keeps the default orthographic projection.
- **Shared rules.** All `AGENTS.md` rules apply. The page stays "Voxel builder", so its sidebar entry does not change. `CHANGELOG.md` is not touched.

## Implementation Plan

- [ ] 1. Replace the erase flag with a mode of build, erase or paint. The flag is `erasing` at `docs/examples/voxelBuilder.ts:139`, and the target's `erase` field is at `docs/examples/voxelBuilder.ts:42`. The target carries an action instead: build, erase, paint or pick.
  - Shift-click keeps its meaning of "the other action": build becomes erase, erase becomes build, and paint becomes pick.
  - The keyed comparison in `retarget` (`docs/examples/voxelBuilder.ts:301-316`) compares the action instead of the flag.

  Rationale: four actions behind one field keep `targetAt`, `apply` and the keyboard in step.

- [ ] 2. Extend `targetAt` (`docs/examples/voxelBuilder.ts:277-298`) and `columnTarget` (`docs/examples/voxelBuilder.ts:261-270`).
  - **Over a face, in paint or pick:** the target is the cube itself.
  - **Over the floor, in paint or pick:** there is no target, as for erase today.
  - **From the keyboard cursor:** the target is the column's top cube, as for erase.

  Rationale: painting and erasing both act on an existing cube, so they share the erase path.

- [ ] 3. Show the paint target in `render` (`docs/examples/voxelBuilder.ts:226-235`).
  - **Paint:** the target cube's group takes the current colour's class in place of its own, plus an "is-paint" class with a dashed outline, so the hover previews the result.
  - **Pick:** the target cube takes an "is-pick" outline.
  - **Erase:** the existing "is-target" tint is unchanged.

  Rationale: a class swap previews the paint without touching the build.

- [ ] 4. Extend `apply` (`docs/examples/voxelBuilder.ts:319-331`).
  - **Paint:** set the cube's colour in the map and announce it, for example "Painted the cube at column 4, row 4, layer 1 orange, was blue."
  - **Pick:** set the current colour through `setColor` (`docs/examples/voxelBuilder.ts:333-337`) and announce "Picked orange."

  The cube count and the faces-drawn count do not change, because neither action changes which cells are built.

- [ ] 5. Add paint to the controls and the keyboard.
  - **The mode radio:** a third "paint" radio in the mode fieldset at `docs/examples/voxelBuilder.ts:178-182`, wired like the existing ones at `:420-422`.
  - **The keys** (`docs/examples/voxelBuilder.ts:384-414`):
    - P switches to paint, or back to build when paint is on;
    - E keeps switching between build and erase;
    - Enter in paint mode recolours the cursor column's top cube.
  - **The label:** update the figure's label (`docs/examples/voxelBuilder.ts:157`) to mention painting.

- [ ] 6. Add a "save and load" disclosure to the controls row, as a native `<details>` element. It holds:
  - a labelled text field;
  - an export button;
  - a load button;
  - a file input that accepts JSON;
  - a download link.

  Export writes the JSON of the current build, with two-space indentation, into the field. It also points the link at a new blob URL with the file name "voxels.json", and revokes the previous URL. Rationale: `<details>` keeps the row short until it is needed, and a blob link downloads without any library.

- [ ] 7. Write one loader that both the load button and the file input go through. It returns either a list of voxels or one error message, and it works in this order:
  - **Size:** reject a text over 64 KB. For a file, check its size before reading it.
  - **Parsing:** parse the JSON inside a try block. A parse error becomes the message "Not valid JSON."
  - **The envelope:** require a plain object whose format is "d3-3d-voxels", whose version is 1, and whose cubes field is an array of at most 384 entries, one per cell of the 8 × 6 × 8 grid.
  - **Each entry:**
    - it must be a plain object;
    - column and row are whole numbers from 0 to 7, checked with `Number.isInteger` and the bounds;
    - layer is a whole number from 0 to 5;
    - colour is exactly one of the six palette names.
  - **Duplicates:** two entries in the same cell are rejected.
  - **Copying:** build each voxel as a new object from those four checked fields only, and ignore any other key. A `__proto__` key in the file then never reaches an object the figure uses.
  - **The message:** name the first failing entry by its index and field, for example "Cube 12: layer must be a whole number from 0 to 5."

  Rationale: the file is the trust boundary of the page. Every checked number becomes a map key and a coordinate, and the colour becomes a class name, so nothing unchecked may pass.

- [ ] 8. Apply a load all at once.
  - **On success:** clear the build, insert the voxels, clear the target and the cursor, render, and announce "Loaded 23 cubes."
  - **On failure:** leave the build untouched, announce the message in the live region and mark the field invalid with an accessible description.
  - **Text only:** messages are set as text, never as markup. Nothing from the file is ever inserted as HTML.

- [ ] 9. Extend the inline style constant (`docs/examples/voxelBuilder.ts:439-643`), with the existing `--vb-` tokens and dark-mode overrides. It covers:
  - the paint preview's dashed outline;
  - the pick outline;
  - the disclosure, the text field with a monospace font, and its invalid state;
  - the file input and the download link;
  - the stacking of the controls at phone width, so the field takes the full width.

- [ ] 10. Update the page `docs/examples/voxel-builder.md`.
  - **The interaction text** at `docs/examples/voxel-builder.md:25-32`: add paint mode, Shift-click to pick a colour, P and the save-and-load panel.
  - **A section "Painting is a class change"** after "Stable cubes": the keyed join, and why painting adds no element.
  - **A section "Saving a build"** before "The whole source": the file format, and every check of the loader as a short list, with the reason it exists.

- [ ] 11. Update the gallery bullet for the voxel builder at `docs/examples/index.md:11`, so it mentions painting and JSON export and import. The sidebar entry stays as it is, because the page does not move.

- [ ] 12. Run the type, lint, docs-build and audit gates, and fix what they report:
  - `npm run typecheck`, `npm run lint` and `npm run docs:build`;
  - the project-pinned fallow audit through npx.

## Verification Criteria

- The gates pass, and `git diff --stat -- index.ts src tests` is empty. All of the voxel builder's existing verification criteria still hold.
- **Painting:** in paint mode, a click recolours a cube, and the cube and faces-drawn counts stay the same. A mutation observer on the cube layer sees no element added or removed by a paint. Shift-click in paint mode moves the swatch selection to the clicked cube's colour.
- **The keyboard:** P, Enter in paint mode, and E work as described. P twice returns to build.
- **Round trip:** export, then reset, then load the exported text. The build matches the exported one, and a second export gives byte-identical text. The same holds through the downloaded file and the file input.
- **Rejected inputs:** each of these leaves the build unchanged and announces a specific message:
  - text that is not JSON;
  - an empty array;
  - a wrong format name;
  - version 2;
  - 385 cubes;
  - a column of 8;
  - a layer of 2.5;
  - a layer given as the string "1";
  - the colour "teal";
  - a colour that holds HTML markup;
  - two cubes in one cell;
  - a pasted text of 100 KB.
- **Files:** a file of 1 MB is rejected before it is read.
- **Prototypes:** a file whose cube entries carry a `__proto__` key loads its valid cubes, and `Object.prototype` is unchanged.
- **Downloads:** the download link offers "voxels.json", and leaving the page revokes its blob URL.
- **Themes and width:** light and dark themes are legible, the panel is usable at 375 px, and the page does not scroll sideways.

## Potential Risks and Mitigations

1. **An unchecked colour name becomes a class name and styles or breaks the figure.**
   Mitigation: the loader accepts only the six palette names (step 7), and stores the colour as the palette index, never as the raw string.

2. **A huge or deeply nested file freezes the tab.**
   Mitigation: the 64 KB ceiling is checked before parsing, and for files before reading. 384 cubes of JSON fit easily within it.

3. **Paint mode and Shift-click confuse visitors who know Shift as erase.**
   Mitigation: the interaction text and the live region name the action of every click. Pick is the opposite of paint, as erase is the opposite of build.

4. **The blob URLs leak memory over many exports.**
   Mitigation: revoke the previous URL on every export, and the last one on dispose, in the function at `docs/examples/voxelBuilder.ts:431-434`.

5. **The controls row grows too wide.**
   Mitigation: the save panel sits inside a closed `<details>`, and the row wraps at phone width.

## Alternative Approaches

1. **A new "Voxel painter" page:** a clean slate, but it would copy most of the builder, and fallow would report the duplicate.
2. **Custom colours from a native colour input:** any colour, but the dark-mode tokens per palette slot would no longer apply. A saved colour would then be a hex string, checked by a strict pattern of six hex digits.
3. **Saving in the URL hash or local storage:** a build would survive a reload without a file, but the page would lose its focus on the trust boundary, and a URL hash has a length limit.
4. **Undo and redo:** a stack of edits would make painting forgiving. It is a cheap later addition, and it is left out of this version.
