import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    minify: false,
    bundle: true,
    skipNodeModulesBundle: true,
    external: [
        '@elizaos/core',
        '@elizaos-plugins/plugin-di',
        '@elizaos-plugins/plugin-flow',
        'inversify',
        'reflect-metadata',
        'uuid',
        'zod',
        'axios'
    ],
    esbuildOptions(options) {
        options.conditions = ['module'];
    },
});