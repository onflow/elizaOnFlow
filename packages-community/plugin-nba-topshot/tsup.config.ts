import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    outDir: "dist",
    sourcemap: true,
    clean: true,
    format: ["esm"], // Ensure you're targeting ESM
    platform: "node",
    target: "node22",
    bundle: true,
    splitting: true, // Add this for better code splitting
    dts: true, // Generate declaration files
    loader: {
        ".cdc": "text", // Load Cadence files as text
    },
    external: [
        "@elizaos/core",
        "@elizaos-plugins/plugin-di",
        "@elizaos-plugins/plugin-flow",
        "@onflow/fcl",
        "@onflow/types",
        "inversify",
        "zod",
        // Node.js built-ins
        "fs",
        "path",
        "url",
        "https",
        "http",
    ],
});
