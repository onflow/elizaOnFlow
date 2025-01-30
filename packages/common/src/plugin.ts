import type { PluginOptions } from "@elizaos/plugin-di";
import { FlowWalletService } from "@fixes-ai/core";
import {
    TransferAction,
    GetPriceAction,
    GetTokenInfoAction,
    GetUserAccountInfoAction,
    EnsureUserAccountExistsAction,
} from "./actions";
import { AccountsPoolService } from "./services/acctPool.service";
import { AccountProvider } from "./providers/account.provider";

/**
 * Basic Flow Plugin configuration
 * Required for the plugin to be loaded, will be exported as default
 */
export const basicFlowPlugin: PluginOptions = {
    name: "flow-basic",
    description: "Flow Plugin for Eliza with accounts management features.",
    actions: [
        TransferAction,
        GetPriceAction,
        GetTokenInfoAction,
        GetUserAccountInfoAction,
        EnsureUserAccountExistsAction,
    ],
    providers: [AccountProvider],
    evaluators: [],
    services: [FlowWalletService, AccountsPoolService],
};
