import { defineConfig } from 'vitepress';

export default defineConfig({
    title: 'd3-3d',
    description: 'D3.js plugin for 3D visualization, written in TypeScript.',
    base: '/d3-3d/',
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
                            { text: 'Bar chart', link: '/examples/bar-chart' },
                            { text: 'Exploded cube assembly', link: '/examples/exploded-cubes' },
                            { text: 'Voxel builder', link: '/examples/voxel-builder' },
                            { text: 'Mini city', link: '/examples/mini-city' },
                            { text: 'Floor-plan explorer', link: '/examples/floor-plan' },
                            { text: 'Scatter plot', link: '/examples/scatter-plot' },
                            { text: 'Trajectory explorer', link: '/examples/trajectory-explorer' },
                            { text: 'Network explorer', link: '/examples/network-explorer' },
                            { text: 'Projection playground', link: '/examples/projection-playground' },
                            { text: 'Solar system', link: '/examples/solar-system' },
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
