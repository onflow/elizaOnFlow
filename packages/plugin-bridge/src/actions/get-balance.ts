// src/actions/get-balance.ts
import { z } from "zod";
import { inject, injectable } from "inversify";
import {
    elizaLogger,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@elizaos/core";
import { type ActionOptions, globalContainer, property } from "@elizaos-plugins/plugin-di";
import { BaseFlowInjectableAction } from "@elizaos-plugins/plugin-flow";
import { BridgeService } from "../services/bridge.service";
import { CHAIN_CONFIGS, TOKENS } from "../constants";

export class GetBalanceContent {
    @property({
        description: "Chain name to check balance on",
        schema: z.string(),
        examples: ["Example: flow-evm, ethereum, arbitrum"],
    })
    chain: string = "flow-evm";

    @property({
        description: "Token symbol to check balance for (optional, if not provided will check all supported tokens)",
        schema: z.string().optional(),
        examples: ["Example: USDC, ETH, FLOW"],
    })
    token?: string;

    @property({
        description: "Address to check balance for (defaults to agent's address if not provided)",
        schema: z.string().optional(),
    })
    address?: string;
}

const actionOpts: ActionOptions<GetBalanceContent> = {
    name: "GET_BALANCE",
    similes: ["CHECK_BALANCE", "VIEW_BALANCE", "SHOW_BALANCE"],
    description: "Check token balances on a specific chain",
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Check my FLOW balance on Flow EVM",
                    action: "GET_BALANCE",
                },
            },
        ],
    ],
    contentClass: GetBalanceContent,
    suppressInitialMessage: true,
};

@injectable()
export class GetBalanceAction extends BaseFlowInjectableAction<GetBalanceContent> {
    constructor(
        @inject(BridgeService)
        private readonly bridgeService: BridgeService,
        @inject("FlowWalletService")
        private readonly walletService: any
    ) {
        super(actionOpts);
    }

    async validate(_runtime: IAgentRuntime, message: Memory): Promise<boolean> {
        const content = typeof message.content === "string" ? message.content : message.content?.text;
        const keywords = ["balance", "check balance", "view balance", "show balance"];
        return keywords.some(keyword => content.toLowerCase().includes(keyword));
    }

    async execute(
        content: GetBalanceContent,
        _runtime: IAgentRuntime,
        _message: Memory,
        _state?: State,
        callback?: HandlerCallback,
    ) {
        elizaLogger.log("Starting GET_BALANCE handler...");

        try {
            // Validate chain
            if (!CHAIN_CONFIGS[content.chain]) {
                throw new Error(`Chain ${content.chain} not supported`);
            }

            // Validate token if provided
            if (content.token && !TOKENS[content.token]) {
                throw new Error(`Token ${content.token} not supported`);
            }

            // Use agent's address if not provided
            const address = content.address || this.walletService.address;

            const result = await this.bridgeService.getBalances(
                content.chain,
                content.token,
                address
            );

            if (result.success && result.balances) {
                let responseText = `Balances on ${content.chain}:\n`;

                result.balances.forEach(balance => {
                    responseText += `${balance.symbol}: ${balance.balance} (${balance.token})\n`;
                });

                callback?.({
                    text: responseText,
                    content: { success: true, balances: result.balances },
                    source: "Bridge",
                });
            } else {
                throw new Error(result.errorMessage || "Failed to retrieve balances");
            }
        } catch (error) {
            callback?.({
                text: `Failed to get balances: ${error.message}`,
                content: { error: error.message },
                source: "Bridge",
            });
        }

        elizaLogger.log("Completed GET_BALANCE handler.");
    }
}

// Register the action with the global container
globalContainer.bind(GetBalanceAction).toSelf();