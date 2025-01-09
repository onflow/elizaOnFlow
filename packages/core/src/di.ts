import fs from "fs";
import path from "path";
import { elizaLogger, Plugin } from "@elizaos/core";
import { Container, interfaces } from "inversify";
import { CONSTANTS, FACTORIES } from "./symbols";
import { ConnectorProvider, WalletProvider, CacheProvider } from "./providers";
import { createPlugin } from "./factories";
import { PluginOptions } from "./interfaces";

const globalContainer = new Container();

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
            }))
        );

        let jsonObjcet: Record<string, unknown> | null = null;
        for (const tryPath of pathsToTry) {
            try {
                jsonObjcet = await import(tryPath, { with: { type: "json" } });
                if (jsonObjcet) {
                    elizaLogger.info(
                        `Successfully loaded character from: ${tryPath}`
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

// ----- Bind to Types -----

// Connector provider is bound to singleton scope
globalContainer
    .bind<ConnectorProvider>(ConnectorProvider)
    .toSelf()
    .inSingletonScope();
// Wallet provider is bound to request scope
globalContainer.bind<WalletProvider>(WalletProvider).toSelf().inRequestScope();
// Cache provider is bound to request scope
globalContainer.bind<CacheProvider>(CacheProvider).toSelf().inRequestScope();

// ----- Bind to factory functions -----

globalContainer
    .bind<interfaces.Factory<Promise<Plugin>>>(FACTORIES.PluginFactory)
    .toFactory<Promise<Plugin>, [PluginOptions]>(createPlugin);

export { globalContainer };
