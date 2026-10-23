# Contributing to d3-3d

Thanks for taking the time to contribute. d3-3d is maintained by one person in
spare time, so every pull request that saves a day of debugging is worth a lot.

## Getting started

```bash
git clone https://github.com/Niekes/d3-3d.git
cd d3-3d
npm install
```

Node 22, 24 or newer is required.

## The checks that have to pass

```bash
npm run lint     # the whole gate
npm test         # the test suite
npm run build    # typecheck + bundle
```

`npm run lint` runs two things:

- `npm run lint:template` checks that the shape modules follow the library
  template in [AGENTS.md](./AGENTS.md). The template is not a convention — it is
  enforced in CI, in the pre-commit hook and by the agent hooks.
- `npm run lint:fallow` checks layering, dead code, test coverage and
  duplication.

Both run in CI on every pull request, so running them locally saves you a
round trip.

## Repository layout

| Path            | Zone         | What lives there                                      |
| --------------- | ------------ | ----------------------------------------------------- |
| `index.ts`      | `public-api` | The public API. The only entry point of the package.  |
| `src/shapes/**` | `shapes`     | One module per shape.                                 |
| `src/draw/**`   | `draw`       | The SVG path builders.                                |
| `src/*.ts`      | `core`       | The maths: transform, rotation, centroid, projection. |
| `tests/**`      | `tests`      | The test suite.                                       |
| `docs/**`       | `docs`       | The VitePress documentation site.                     |
| `scripts/**`    | `tooling`    | Repository tooling. Imports nothing from the library. |

Dependencies point inwards only. `core` never imports from `shapes` or `draw`,
and the test suite goes through `index.ts` so the public export stays covered.

## Adding a shape

1. Create `src/shapes/<name>.ts` following the template in [AGENTS.md](./AGENTS.md).
2. Add the factory, the result type and the contract to `index.ts`.
3. Add `tests/<name>.test.ts` that imports from `../index`.
4. Run `npm run lint` and `npm test`.

## Adding a core helper

`src/<name>.ts` holds one cohesive unit, declared with `export function`, and
may not import from `shapes` or `draw`. If the helper is part of the public
API, re-export it from `index.ts` and cover it with a test.

## Code style

- Four spaces, no semicolons where the surrounding code omits them — match the
  file you are editing.
- Public functions are declared with `export function`. Never
  `export const` arrow functions, and there are no default exports.
- Types that appear in a public signature have to be exported and re-exported
  from `index.ts`. A private type in a public signature is a build failure.
- Every new public export needs a test. An export that no test can reach is
  reported by the coverage rule.

## Pull requests

- Keep them focused. One change per pull request makes review fast.
- Open an issue first for anything larger than a bug fix, so the approach can
  be agreed on before you write the code.
- Describe what changed and why. Screenshots or a CodePen are welcome for
  anything visual.
- Make sure `npm run lint` and `npm test` pass locally.

## Releasing

A release is a pull request that bumps the version in `package.json` and
updates `CHANGELOG.md` — for example the `release/2.2.0` branch. Merging it
into `master` is all that is left to do: when `package.json` changed, the
[Release workflow](.github/workflows/release.yml) publishes the new version
to npm with provenance and pushes the `vX.Y.Z` tag. It needs the `NPM_TOKEN`
secret, and it skips itself when the version is already on npm, so dependency
updates that touch `package.json` without a version bump never trigger a
publish. Do not run `npm publish` or push a version tag by hand.

## Reporting bugs

Open an issue with the [bug report template](https://github.com/Niekes/d3-3d/issues/new/choose).
A reproduction is worth more than a description: a CodePen, a minimal snippet
or a failing test case is ideal.

## Documentation

The documentation site lives in `docs/` and is built with VitePress:

```bash
npm run docs:dev      # local dev server
npm run docs:build    # production build
```

Pages are deployed to GitHub Pages from `master`.

## Support

d3-3d is free and always will be. If it is useful to you and you want to help
keep it maintained, [become a sponsor](https://github.com/sponsors/niekes).
