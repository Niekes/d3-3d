import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
    // Library build configuration
    build: {
        lib: {
            entry: resolve(__dirname, 'index.ts'),
            name: 'd33d',
            fileName: (format) => `d3-3d.${format === 'umd' ? 'js' : `${format}.js`}`,
            formats: ['es', 'umd']
        },
        rollupOptions: {
            external: [],
            output: {
                globals: {}
            }
        },
        sourcemap: true,
        outDir: 'build',
        emptyOutDir: false
    },

    // Test configuration
    test: {
        globals: true,
        environment: 'jsdom',
        include: ['tests/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html', 'lcov'],
            include: ['src/**/*.ts', 'index.ts'],
            exclude: ['tests/**', 'build/**', '**/*.d.ts']
        }
    }
});
