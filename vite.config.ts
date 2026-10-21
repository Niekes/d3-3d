import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
    // Library build configuration
    build: {
        lib: {
            entry: resolve(import.meta.dirname, 'index.ts'),
            name: 'd33d',
            fileName: (format) => {
                if (format === 'umd') return 'd3-3d.js';
                if (format === 'es') return 'd3-3d.es.js';
                return 'd3-3d.cjs';
            },
            formats: ['es', 'umd', 'cjs']
        },
        rolldownOptions: {
            external: []
        },
        sourcemap: true,
        outDir: 'build',
        emptyOutDir: false
    },

    // Test configuration
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html', 'lcov'],
            include: ['src/**/*.ts', 'index.ts'],
            exclude: ['tests/**', 'build/**', '**/*.d.ts']
        }
    }
});
