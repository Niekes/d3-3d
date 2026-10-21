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
                        { text: 'Iso stack', link: '/examples/iso-stack' }
                    ]
                }
            ]
        },
        socialLinks: [{ icon: 'github', link: 'https://github.com/niekes/d3-3d' }],
        search: { provider: 'local' }
    }
});
