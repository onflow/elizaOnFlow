import fs from "fs";
import path from "path";
import { elizaLogger } from "@elizaos/core";
import { globalContainer } from "@elizaos/plugin-di";
import { CONSTANTS } from "./symbols";

// Load flow.json file and bind it to the container
globalContainer
    .bind<Record<string, unknown>>(CONSTANTS.FlowJSON)
    .toDynamicValue(async () => {
        // Search `flow.json` from the runtime
        const cwd = process.cwd();
        // Try different path resolutions in order
        const pathsToTry = [
            path.resolve(cwd, "flow.json"), // relative to cwd
            path.resolve(cwd, "agent", "flow.json"), // Add this
            path.resolve(cwd, "../flow.json"),
            path.resolve(cwd, "../../flow.json"),
            path.resolve(cwd, "../../../flow.json"),
        ];
        elizaLogger.info(
            "Trying loading 'flow.json' paths:",
            pathsToTry.map((p) => ({
                path: p,
                exists: fs.existsSync(p),
            })),
        );

        let jsonObjcet: Record<string, unknown> | null = null;
        for (const tryPath of pathsToTry) {
            try {
                jsonObjcet = (await import(tryPath, { with: { type: "json" } }))
                    .default;
                if (jsonObjcet) {
                    elizaLogger.info(
                        `Successfully loaded 'flow.json' from: ${tryPath}`,
                    );
                    break;
                }
            } catch {
                continue;
            }
        }
        if (!jsonObjcet) {
            elizaLogger.error("Cannot find 'flow.json' file");
            throw new Error("Cannot find 'flow.json' file");
        }
        return jsonObjcet;
    });
