import path from "path";
import { fileURLToPath } from "url";
import { Container } from "inversify";
import { CONSTANTS, FACTORIES } from "./symbols";
import { ConnectorProvider, WalletProvider } from "./providers";
import { PluginFactory } from "./interfaces";
import { createPlugin } from "./factories";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const globalContainer = new Container();

// Load flow.json file and bind it to the container
globalContainer
    .bind<Record<string, unknown>>(CONSTANTS.FlowJSON)
    .toDynamicValue(async () => {
        const filePath = path.resolve(__dirname, "../../../flow.json");
        return await import(filePath, { assert: { type: "json" } });
    });

// Bind to Types
globalContainer
    .bind<ConnectorProvider>(ConnectorProvider)
    .toSelf()
    .inSingletonScope();
globalContainer
    .bind<WalletProvider>(WalletProvider)
    .toSelf()
    .inSingletonScope();

// Bind to factory
globalContainer
    .bind<PluginFactory>(FACTORIES.PluginFactory)
    .toFactory(createPlugin);

export { globalContainer };
