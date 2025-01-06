import path from "path";
import { fileURLToPath } from "url";
import { Plugin } from "@elizaos/core";
import { Container, interfaces } from "inversify";
import { CONSTANTS, FACTORIES } from "./symbols";
import { ConnectorProvider, WalletProvider } from "./providers";
import { createPlugin } from "./factories";
import { PluginOptions } from "./interfaces";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const globalContainer = new Container();

// Load flow.json file and bind it to the container
globalContainer
    .bind<Record<string, unknown>>(CONSTANTS.FlowJSON)
    .toDynamicValue(async () => {
        const filePath = path.resolve(__dirname, "../../../flow.json");
        return await import(filePath, { with: { type: "json" } });
    });

// ----- Bind to Types -----

// Connector provider is bound to singleton scope
globalContainer
    .bind<ConnectorProvider>(ConnectorProvider)
    .toSelf()
    .inSingletonScope();
// Wallet provider is bound to request scope
globalContainer.bind<WalletProvider>(WalletProvider).toSelf().inRequestScope();

// ----- Bind to factory functions -----

globalContainer
    .bind<interfaces.Factory<Promise<Plugin>>>(FACTORIES.PluginFactory)
    .toFactory<Promise<Plugin>, [PluginOptions]>(createPlugin);

export { globalContainer };
