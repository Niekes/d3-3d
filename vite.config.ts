import { defineConfig } from 'vite-plus';
import type { UserConfig } from 'vite-plus';

function entryFileName(chunk: { name?: string }, format: string, dtsName: string): string {
    const name = chunk.name ? String(chunk.name) : '';
    const isDts = name.endsWith('.d');
    if (isDts) return dtsName;
    const names: Record<string, string> = { umd: 'd3-3d.js', cjs: 'd3-3d.cjs' };
    return names[format] ?? 'd3-3d.es.js';
}

const config: UserConfig = {
    fmt: {
        semi: true,
        singleQuote: true,
        printWidth: 100,
        trailingComma: 'none',
        tabWidth: 4,
        ignorePatterns: ['docs/.vitepress/cache/**', 'docs/.vitepress/dist/**']
    },
    lint: {
        ignorePatterns: ['docs/.vitepress/cache/**', 'docs/.vitepress/dist/**'],
        jsPlugins: [{ name: 'vite-plus', specifier: 'vite-plus/oxlint-plugin' }],
        rules: { 'vite-plus/prefer-vite-plus-imports': 'error' },
        options: { typeAware: true, typeCheck: true }
    },
    check: {},
    // Library build configuration (tsdown via `vp pack`)
    pack: {
        entry: ['index.ts'],
        format: ['esm', 'cjs', 'umd'],
        globalName: 'd33d',
        outDir: 'build',
        sourcemap: true,
        minify: true,
        target: 'es2020',
        platform: 'browser',
        dts: { generator: 'oxc' },
        outputOptions: (options, format, ctx) => {
            const cjsDts = Boolean(ctx && ctx.cjsDts);
            const dtsName = cjsDts ? 'index.d.cts' : 'index.d.ts';
            options.entryFileNames = (chunk) => entryFileName(chunk, String(format), dtsName);
            return options;
        }
    },

    // Test configuration
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            // json-summary feeds the coverage badge on master.
            reporter: ['text', 'html', 'json-summary'],
            include: ['src/**/*.ts', 'index.ts'],
            exclude: ['tests/**', 'build/**', '**/*.d.ts'],
            thresholds: {
                statements: 99,
                branches: 90,
                functions: 100,
                lines: 99
            }
        }
    }
};

export default defineConfig(config) as UserConfig;
