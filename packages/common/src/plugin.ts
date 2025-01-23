import type { PluginOptions } from "@elizaos/plugin-di";
import { TransferAction, GetPriceAction, GetTokenInfoAction } from "./actions";

/**
 * Basic Flow Plugin Options
 * Required for the plugin to be loaded, will be exported as default
 */
export const basicFlowPluginOptions: PluginOptions = {
    name: "flow-basic",
    description: "Flow Plugin for Eliza, with basic actions like transfer",
    actions: [TransferAction, GetPriceAction, GetTokenInfoAction],
    providers: [],
    evaluators: [],
    services: [],
};
