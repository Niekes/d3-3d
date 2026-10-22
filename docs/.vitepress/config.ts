import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitepress';

// Every ### `name(...)` {#id} heading of the API page. The first heading of a
// name wins, so `.data` points at the shared method, not at iso3D's.
const apiAnchors = new Map(
    [...readFileSync(new URL('../api/index.md', import.meta.url), 'utf8').matchAll(
        /^### `([^`(]+)[^`]*` \{#([\w-]+)\}$/gm
    )]
        .reverse()
        .map(([, name, id]) => [name, id])
);

// Utilities that share their name with a property of the shapes: a bare
// `ccw` is the flag, only `ccw()` is the function.
const properties = new Set(['ccw', 'centroid']);

export default defineConfig({
    title: 'd3-3d',
    description: 'D3.js plugin for 3D visualization, written in TypeScript.',
    base: '/d3-3d/',
    markdown: {
        // Link every inline `name` of the API to its entry, except in
        // headings and in code that already sits in a link.
        config(md) {
            md.core.ruler.push('api-links', (state) => {
                state.tokens.forEach((block, i) => {
                    if (block.type !== 'inline' || state.tokens[i - 1]?.type === 'heading_open') {
                        return;
                    }
                    let inLink = false;
                    block.children = (block.children ?? []).flatMap((token) => {
                        if (token.type === 'link_open' || token.type === 'link_close') {
                            inLink = token.type === 'link_open';
                        }
                        const name = token.content.replace(/\(.*\)$/, '');
                        const id =
                            !inLink &&
                            token.type === 'code_inline' &&
                            !(name === token.content && properties.has(name)) &&
                            apiAnchors.get(name);
                        if (!id) {
                            return [token];
                        }
                        const open = new state.Token('link_open', 'a', 1);
                        open.attrSet('href', `/api/#${id}`);
                        return [open, token, new state.Token('link_close', 'a', -1)];
                    });
                });
            });
        }
    },
    themeConfig: {
        nav: [
            { text: 'Guide', link: '/guide/getting-started' },
            { text: 'API', link: '/api/' },
            { text: 'Examples', link: '/examples/' },
            { text: 'Support', link: '/support' },
            { text: 'GitHub', link: 'https://github.com/niekes/d3-3d' }
        ],
        sidebar: {
            '/guide/': [
                {
                    text: 'Guide',
                    items: [{ text: 'Getting Started', link: '/guide/getting-started' }]
                }
            ],
            '/api/': [
                {
                    text: 'API Reference',
                    items: [{ text: 'Overview', link: '/api/' }]
                }
            ],
            '/examples/': [
                {
                    text: 'Examples',
                    items: [
                        { text: 'Overview', link: '/examples/' },
                        ...[
                            { text: 'Surface plot', link: '/examples/surface-plot' },
                            { text: 'Terrain sculptor', link: '/examples/terrain-sculptor' },
                            { text: 'Area chart', link: '/examples/area-chart' },
                            { text: 'Bar chart', link: '/examples/bar-chart' },
                            { text: 'Bar field', link: '/examples/bar-field' },
                            { text: 'Data-update stress test', link: '/examples/data-update' },
                            { text: 'Exploded cube assembly', link: '/examples/exploded-cubes' },
                            { text: 'Voxel builder', link: '/examples/voxel-builder' },
                            { text: 'Spline editor', link: '/examples/spline-editor' },
                            { text: 'Mini city', link: '/examples/mini-city' },
                            { text: 'Floor-plan explorer', link: '/examples/floor-plan' },
                            { text: 'Scatter plot', link: '/examples/scatter-plot' },
                            { text: 'Point cloud', link: '/examples/point-cloud' },
                            { text: 'Pixel space', link: '/examples/pixel-space' },
                            { text: 'Particle text morph', link: '/examples/particle-text-morph' },
                            { text: 'Trajectory explorer', link: '/examples/trajectory-explorer' },
                            { text: 'Network explorer', link: '/examples/network-explorer' },
                            { text: 'Projection playground', link: '/examples/projection-playground' },
                            { text: 'Coordinate explorer', link: '/examples/coordinate-explorer' },
                            { text: 'Perspective street', link: '/examples/perspective-street' },
                            { text: 'Depth-ordering lab', link: '/examples/depth-ordering' },
                            { text: 'Rotation order', link: '/examples/rotation-order' },
                            { text: 'Solar system', link: '/examples/solar-system' },
                            { text: 'Space-time cube', link: '/examples/space-time-cube' },
                            { text: 'Mesh inspector', link: '/examples/mesh-inspector' },
                            { text: 'Möbius strip', link: '/examples/mobius-strip' },
                            { text: 'Office tower', link: '/examples/iso-tower' }
                        ].sort((a, b) => a.text.localeCompare(b.text))
                    ]
                }
            ],
            '/support': [
                {
                    text: 'Support',
                    items: [{ text: 'Sponsor d3-3d', link: '/support' }]
                }
            ]
        },
        socialLinks: [{ icon: 'github', link: 'https://github.com/niekes/d3-3d' }],
        search: { provider: 'local' },
        footer: {
            message:
                'Released under the BSD-3-Clause License. <a href="https://github.com/sponsors/niekes">Sponsor d3-3d</a> on GitHub Sponsors.',
            copyright: 'Copyright © 2017-present Stefan Nieke'
        }
    }
});
