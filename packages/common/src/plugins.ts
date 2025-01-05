import { Plugin } from "@elizaos/core";
import { globalContainer, PluginFactory, symbols } from "@fixes-ai/core";
import { TransferAction } from "./actions";

export const createBasicFlowPlugin = (): Plugin => {
    const createPlugin = globalContainer.get<PluginFactory>(
        symbols.FACTORIES.PluginFactory
    );
    return createPlugin({
        name: "flow-basic",
        description: "Flow Plugin for Eliza, with basic actions like transfer",
        actions: [TransferAction],
        providers: [],
        evaluators: [],
        services: [],
    });
};
