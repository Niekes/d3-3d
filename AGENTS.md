<!-- fallow:setup-hooks:start -->

## Fallow checks

Use fallow for code-quality, cleanup, and setup tasks in this repository. Fallow checks the changed code before each `git commit` and `git push`. In Claude Code and Codex, a PreToolUse hook from `fallow agent install` runs this check and blocks the command when the verdict is `fail`. Other agents run the check themselves: `fallow audit --format json --quiet --explain --gate-marker agent`. If the verdict is `fail`, fix the reported findings before you try again. A JSON runtime error such as `{ "error": true, ... }` does not block.

Audit defaults to `gate=new-only`: only findings introduced by the current changeset affect the verdict. Inherited findings on touched files are reported under `attribution` and annotated with `introduced: false`, but do not block the commit. Set `[audit] gate = "all"` in `fallow.toml` to gate every finding in changed files.

For non-skill agents, treat the task map below as the local onboarding source: run the listed fallow command before destructive edits, before commits, and before pull request handoff.

## Fallow task map

| When the agent is about to...                                        | Run                                                                                                                                                           |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| delete an "unused" export or file                                    | `fallow dead-code --trace <file>:<export>`                                                                                                                    |
| prove a TypeScript symbol's exact consumers before refactoring       | `fallow dead-code --type-aware --symbol-impact <file>:<export-or-class.method>`                                                                               |
| find how one module reaches another                                  | `fallow trace --path <from> <to>` (Reports `reachable: false` instead of failing when no import path exists; type-only hops are reported, not skipped.)       |
| delete an "unused" dependency                                        | `fallow dead-code --trace-dependency <name>`                                                                                                                  |
| migrate a dependency                                                 | `fallow trace --dependency <name> --sites` (Counts each imported name, follows one hop through project wrappers, and counts each use that it cannot resolve.) |
| commit or open a PR                                                  | `fallow audit --base <ref>`                                                                                                                                   |
| read a diff before approving it                                      | `fallow review --base <ref> --brief` (orientation, never gates: deterministic and always exit 0, unlike the audit row)                                        |
| prioritize refactoring                                               | `fallow health --hotspots --targets`                                                                                                                          |
| ask who owns code                                                    | `fallow health --ownership`                                                                                                                                   |
| check untested-but-reachable code                                    | `fallow health --coverage-gaps`                                                                                                                               |
| consolidate duplication                                              | `fallow dupes --trace dup:<fingerprint>`                                                                                                                      |
| find feature flags                                                   | `fallow flags`                                                                                                                                                |
| check which architecture rules apply to a file before changing it    | `fallow guard <files>`                                                                                                                                        |
| check import cycles, boundaries and policy rules after changing code | `fallow architecture`                                                                                                                                         |
| surface security candidates                                          | `fallow security`                                                                                                                                             |
| understand a finding                                                 | `fallow explain <issue-type>`                                                                                                                                 |
| scope a monorepo                                                     | `--workspace <glob> / --changed-workspaces <ref>` (global flags, prefix any command)                                                                          |

<!-- fallow:setup-hooks:end -->

## Releasing

A release is a pull request that bumps the version in `package.json` and
updates `CHANGELOG.md` (for example the `release/2.2.0` branch). Merging it
into `master` triggers `.github/workflows/release.yml`, which publishes the
new version to npm and pushes the `vX.Y.Z` tag — but only when `package.json`
changed and the version is not on npm yet. Never run `npm publish` or push a
version tag by hand.

## The library template

`d3-3d` is a published library. Its template is not a convention - it is
enforced by `npm run lint`, which runs in CI, in the Git pre-commit hook and
in the agent hooks above.

```bash
npm run lint           # the whole gate
npm run lint:template  # naming and shape conventions
npm run lint:fallow    # layering, dead code, test coverage, duplication
```

### The layers

Dependencies point inwards only. The zones are declared in `.fallowrc.jsonc`
and a violation fails the build.

| Zone         | Files           | May import                     |
| ------------ | --------------- | ------------------------------ |
| `public-api` | `index.ts`      | `shapes`, `core`               |
| `shapes`     | `src/shapes/**` | `shapes`, `draw`, `core`       |
| `draw`       | `src/draw/**`   | `draw`, `core`                 |
| `core`       | `src/**/*.ts`   | `core`                         |
| `tests`      | `tests/**`      | `public-api`, `shapes`, `core` |
| `tooling`    | `scripts/**`    | nothing                        |
| `docs`       | `docs/**`       | `public-api`, `shapes`, `core` |

Two consequences worth remembering:

- **`core` never imports from `shapes` or `draw`.** The core holds the maths
  (`transform`, `rotation`, `centroid`, `ccw`, `orthographic`) and knows
  nothing about the shapes built on top of it.
- **The test suite goes through `index.ts`.** A test that imports
  `../src/shapes/cubes` directly leaves the public export untested, which the
  `coverage-gaps` rule reports.

### The shape module template

`src/shapes/cubes.ts` is the reference. A shape module named `<name>.ts`
owns exactly three things:

```ts
import { Point3D, ShapeFields, TransformedPoint } from '../types';
import { ShapeInstance, ShapeRenderer } from './shape';

export type Cube<Datum = Point3D, Shape extends Datum[] = Datum[]> = TransformedPoint<Datum>[] &
    ShapeFields<Shape> & {
        centroid: Point3D;
    };

// The contract: what a consumer of the shape may call.
export interface Cubes3DInstance<Datum = Point3D> extends ShapeInstance<Datum> {
    data<Shape extends Datum[]>(data: Shape[]): Cube<Datum, Shape>[];
}

// The implementation: extends ShapeRenderer, implements the contract.
class Cubes3DRenderer<Datum = Point3D>
    extends ShapeRenderer<Datum>
    implements Cubes3DInstance<Datum>
{
    data<Shape extends Datum[]>(data: Shape[]): Cube<Datum, Shape>[] {
        return data.map((cube) => {
            const transformedCube = this.transformShape(cube) as Cube<Datum, Shape>;
            transformedCube.centroid = centroid(transformedCube);
            return transformedCube;
        });
    }
}

// The factory: the only thing the module exports at runtime.
export function cubes3D<Datum = Point3D>(): Cubes3DInstance<Datum> {
    return new Cubes3DRenderer<Datum>();
}
```

The rules that `scripts/check-template.mjs` enforces:

- the factory is `<name>3D`, the contract is `<Name>3DInstance`, the class is
  `<Name>3DRenderer`;
- the contract extends `ShapeInstance`, the class extends `ShapeRenderer` and
  implements the contract, and the factory builds the class;
- public functions are declared with `export function` - never with
  `export const` arrow functions, and there are no default exports;
- `src/draw/<name>.ts` exports `draw<Name>`;
- `index.ts` re-exports the factory and the contract of every shape module;
- a core module never imports from `shapes` or `draw`.

`ShapeRenderer.transformOptions()` is the shared wiring for the renderer
state. Use it instead of assembling the transform options by hand - that is
what keeps the shape modules from drifting apart. A shape whose input is a
list of point arrays transforms each array with `this.transformShape()`,
which also keeps the fields set on the array, such as a `color` (#44).

### The public API

`index.ts` is the public API and the only entry point of the package. Two
rules keep it honest:

- **No private type leaks.** Every type that appears in a public signature
  has to be exported and re-exported from `index.ts`. The
  `private-type-leaks` rule reports the ones that are not.
- **Every public export is tested.** `fallow health --coverage-gaps` reports
  a public export that no test can reach. A new export needs a test.

### Adding a shape

1. Create `src/shapes/<name>.ts` following the template above.
2. Add the factory, the result type and the contract to `index.ts`.
3. Add `tests/<name>.test.ts` that imports from `../index`.
4. Run `npm run lint` and `npm test`.

### Adding a core helper

`src/<name>.ts` holds one cohesive unit, declared with `export function`, and
may not import from `shapes` or `draw`. A unit is a single export in most
cases; `src/point.ts` groups three related accessors and `src/iso.ts` three
functions that only one shape module consumes. If the helper is part of the
public API, re-export it from `index.ts` and cover it with a test.
