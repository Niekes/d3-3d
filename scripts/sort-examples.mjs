#!/usr/bin/env node
/**
 * Sorts the example lists in docs/examples/index.md alphabetically.
 *
 * The overview page lists every example as a markdown bullet that starts
 * with a link (`- [Label](url) - description`). New examples get appended
 * wherever the author puts them, so the order of that page drifts. This
 * script keeps it honest: it finds every run of link bullets and sorts each
 * run by its link label, using the same locale-aware comparison as the
 * sidebar in docs/.vitepress/config.ts.
 *
 * Everything else in the file - headings, prose, code blocks, paragraphs
 * between the lists - passes through untouched.
 *
 * Usage:
 *   node scripts/sort-examples.mjs          sort the file in place
 *   node scripts/sort-examples.mjs --check  exit 1 if the file is unsorted
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const FILE = fileURLToPath(new URL('../docs/examples/index.md', import.meta.url));
const CHECK = process.argv.includes('--check');

const bullet = /^- \[([^\]]+)\]\([^)]*\)/;
const collator = new Intl.Collator('en', { sensitivity: 'base' });

const lines = readFileSync(FILE, 'utf8').split('\n');

/** @type {number[]} */
let run = [];

const flush = () => {
    if (run.length > 1) {
        const order = [...run].sort((a, b) =>
            collator.compare(bullet.exec(lines[a])[1], bullet.exec(lines[b])[1])
        );
        const sortedLines = order.map((lineIndex) => lines[lineIndex]);
        run.forEach((lineIndex, i) => {
            lines[lineIndex] = sortedLines[i];
        });
    }
    run = [];
};

lines.forEach((line, i) => {
    if (bullet.test(line)) {
        run.push(i);
    } else {
        flush();
    }
});
flush();

const sorted = lines.join('\n');
const original = readFileSync(FILE, 'utf8');

if (sorted === original) {
    console.log('docs/examples/index.md: example lists are sorted');
    process.exit(0);
}

if (CHECK) {
    console.error('docs/examples/index.md: example lists are not sorted');
    console.error('Run: node scripts/sort-examples.mjs');
    process.exit(1);
}

writeFileSync(FILE, sorted);
console.log('docs/examples/index.md: sorted the example lists');
