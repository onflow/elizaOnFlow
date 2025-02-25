// src/plugin.ts
import type { PluginOptions } from "@elizaos-plugins/plugin-di";
import {
    AddLiquidityAction,
    RemoveLiquidityAction,
    GetPoolInfoAction,
    CreatePoolAction,
    SwapFlowTokenAction
} from "./actions";
import { IncrementService } from "./services/increment.service";

/**
 * IncrementFi Plugin configuration
 * Required for the plugin to be loaded, will be exported as default
 */
export const incrementfiPlugin: PluginOptions = {
    name: "incrementfi",
    description: "IncrementFi Plugin for Eliza with CPAMM features.",
    actions: [
        AddLiquidityAction,
        RemoveLiquidityAction,
        GetPoolInfoAction,
        SwapFlowTokenAction,
        CreatePoolAction
    ],
    providers: [],
    evaluators: [],
    services: [IncrementService],
    //dependencies: ["@fixes-ai/common"], // This ensures common plugin is loaded first
};
