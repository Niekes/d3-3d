#!/usr/bin/env node
/**
 * Checks the d3-3d library template.
 *
 * The template is the shape of the library, not just its behaviour:
 *
 *   index.ts          the public barrel - the only entry point of the package
 *   src/shapes/<n>.ts one module per shape, exporting a `<n>3D` factory,
 *                    a `<N>3DInstance` contract and a `<N>3DRenderer` class
 *   src/draw/<n>.ts   one module per SVG path helper, exporting `draw<N>`
 *   src/<n>.ts        the core: pure helpers that know nothing about shapes
 *   tests/<n>.test.ts the test suite, exercising the public API only
 *
 * Fallow covers the parts of the template that need a real dependency graph
 * (layering, dead code, test coverage). This script covers the parts that
 * are about naming and shape, which are cheaper to check by reading the
 * source directly - and which keep working without Fallow installed.
 *
 * Usage: node scripts/check-template.mjs
 */

import { readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** @type {string[]} */
const violations = [];

/** @param {string} message */
const fail = (message) => violations.push(message);

/** @param {string} relativePath */
const read = (relativePath) => readFileSync(join(ROOT, relativePath), 'utf8');

/** @param {string} relativeDir */
const listModules = (relativeDir) =>
    readdirSync(join(ROOT, relativeDir))
        .filter((entry) => entry.endsWith('.ts'))
        .sort()
        .map((entry) => `${relativeDir}/${entry}`);

const camelCase = (value) => value.charAt(0).toLowerCase() + value.slice(1);
const pascalCase = (value) => value.charAt(0).toUpperCase() + value.slice(1);

/** @param {string} source */
const matches = (source, pattern) => pattern.test(source);

/**
 * Shape modules: `src/shapes/cubes.ts` owns `cubes3D`, `Cubes3DInstance`
 * and `Cubes3DRenderer`.
 */
const shapeModules = listModules('src/shapes').filter((file) => file !== 'src/shapes/shape.ts');

for (const file of shapeModules) {
    const stem = basename(file, '.ts');
    const factory = `${camelCase(stem)}3D`;
    const contract = `${pascalCase(stem)}3DInstance`;
    const renderer = `${pascalCase(stem)}3DRenderer`;
    const source = read(file);

    if (!matches(source, new RegExp(`export\\s+function\\s+${factory}\\s*(<[^>]*>)?\\s*\\(`))) {
        fail(`${file}: must export a factory function '${factory}'`);
    }

    if (!matches(source, new RegExp(`export\\s+interface\\s+${contract}\\b`))) {
        fail(`${file}: must export the interface '${contract}'`);
    }

    if (
        !matches(
            source,
            new RegExp(`export\\s+interface\\s+${contract}\\b[\\s\\S]*?extends\\s+ShapeInstance\\b`)
        )
    ) {
        fail(`${file}: '${contract}' must extend 'ShapeInstance'`);
    }

    if (
        !matches(source, new RegExp(`class\\s+${renderer}\\b[\\s\\S]*?extends\\s+ShapeRenderer\\b`))
    ) {
        fail(`${file}: must declare a class '${renderer}' extending 'ShapeRenderer'`);
    }

    if (
        !matches(
            source,
            new RegExp(`class\\s+${renderer}\\b[\\s\\S]*?implements\\s+${contract}\\b`)
        )
    ) {
        fail(`${file}: '${renderer}' must implement '${contract}'`);
    }

    if (!matches(source, new RegExp(`new\\s+${renderer}\\s*[(<]`))) {
        fail(`${file}: '${factory}' must build a '${renderer}'`);
    }
}

/**
 * Draw modules: `src/draw/drawPlane.ts` exports `drawPlane`.
 */
for (const file of listModules('src/draw')) {
    const stem = basename(file, '.ts');
    const helper = stem.startsWith('draw') ? stem : `draw${pascalCase(stem)}`;
    const source = read(file);

    if (!matches(source, new RegExp(`export\\s+function\\s+${helper}\\s*(<[^>]*>)?\\s*\\(`))) {
        fail(`${file}: must export a function '${helper}'`);
    }
}

/**
 * The barrel is the public API: every shape contributes its factory and its
 * contract, and the shared types are re-exported as a whole.
 */
const barrel = read('index.ts');

for (const file of shapeModules) {
    const stem = basename(file, '.ts');
    const module = `./${file.replace(/\.ts$/, '')}`;
    const factory = `${camelCase(stem)}3D`;
    const contract = `${pascalCase(stem)}3DInstance`;

    if (
        !matches(
            barrel,
            new RegExp(`export\\s*\\{[^}]*\\b${factory}\\b[^}]*\\}\\s*from\\s*'${module}'`)
        )
    ) {
        fail(`index.ts: must re-export '${factory}' from '${module}'`);
    }

    if (
        !matches(
            barrel,
            new RegExp(`export\\s+type\\s*\\{[^}]*\\b${contract}\\b[^}]*\\}\\s*from\\s*'${module}'`)
        )
    ) {
        fail(`index.ts: must re-export the type '${contract}' from '${module}'`);
    }
}

if (!matches(barrel, /export\s+\*\s+from\s+'\.\/src\/types'/)) {
    fail("index.ts: must re-export the shared types with `export * from './src/types'`");
}

/**
 * The core is the bottom of the stack: it may not know about shapes or
 * about the SVG path helpers.
 */
for (const file of listModules('src')) {
    const source = read(file);

    for (const [, specifier] of source.matchAll(/from\s+'([^']+)'/g)) {
        if (specifier.includes('/shapes/') || specifier.includes('/draw/')) {
            fail(`${file}: a core module must not import '${specifier}'`);
        }
    }
}

/**
 * Public functions are declared with `export function`, never with
 * `export const` arrow functions. A named declaration keeps the hoisting,
 * the stack traces and the generated `.d.ts` predictable.
 */
for (const file of [
    ...listModules('src'),
    ...listModules('src/shapes'),
    ...listModules('src/draw')
]) {
    const source = read(file);

    if (matches(source, /^export\s+const\s+\w+\s*=\s*</m)) {
        fail(`${file}: use 'export function' instead of 'export const' for public functions`);
    }

    if (matches(source, /^export\s+default\b/m)) {
        fail(`${file}: the library has no default exports`);
    }
}

if (violations.length > 0) {
    console.error(`✗ ${violations.length} library template violation(s):\n`);
    for (const violation of violations) {
        console.error(`  - ${violation}`);
    }
    console.error('');
    process.exit(1);
}

console.log('✓ library template satisfied');
