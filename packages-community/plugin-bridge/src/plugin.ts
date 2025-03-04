// src/plugin.ts
import type { PluginOptions } from "@elizaos-plugins/plugin-di";
import {
    BridgeTokenAction,
    SwapTokenAction,
    GetBalanceAction
} from "./actions";
import { BridgeService } from "./services/bridge.service";
import { LayerZeroService } from "./services/layerzero.service";

/**
 * Bridge Plugin configuration
 * Required for the plugin to be loaded, will be exported as default
 */
export const bridgePlugin: PluginOptions = {
    name: "bridge",
    description: "Bridge Plugin for Eliza to swap and bridge tokens from other ecosystems to Flow.",
    actions: [
        BridgeTokenAction,
        SwapTokenAction,
        GetBalanceAction
    ],
    providers: [],
    evaluators: [],
    services: [BridgeService, LayerZeroService],
};