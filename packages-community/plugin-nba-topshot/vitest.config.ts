import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
    test: {
        environment: "node",
        testTimeout: 120000,
    },
    assetsInclude: ["**/*.cdc"],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});