import type { PluginOptions } from "@elizaos/plugin-di";
import { WalletProvider } from "@fixes-ai/core";
import { TransferAction, GetPriceAction, GetTokenInfoAction } from "./actions";
import { FlowWalletService } from "./services/wallet.service";
import { AccountsPoolService } from "./services/acctPool.service";

/**
 * Basic Flow Plugin Options
 * Required for the plugin to be loaded, will be exported as default
 */
export const basicFlowPluginOptions: PluginOptions = {
    name: "flow-basic",
    description: "Flow Plugin for Eliza, with basic actions like transfer",
    actions: [TransferAction, GetPriceAction, GetTokenInfoAction],
    providers: [WalletProvider],
    evaluators: [],
    services: [FlowWalletService, AccountsPoolService],
};
