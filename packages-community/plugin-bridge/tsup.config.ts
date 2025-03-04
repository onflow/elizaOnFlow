import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ["src/index.ts"],
    outDir: "dist",
    sourcemap: true,
    clean: true,
    format: ["esm"], // Ensure you're targeting CommonJS
    platform: "node",
    target: "node22",
    bundle: true,
    splitting: true, // Add this for better code splitting
    dts: true, // Generate declaration files
    loader: {
        ".cdc": "text",
    },
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
