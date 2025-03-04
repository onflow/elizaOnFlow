// src/actions/swap-token.ts
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
import { BaseFlowInjectableAction, type FlowWalletService } from "@elizaos-plugins/plugin-flow";
import { BridgeService } from "../services/bridge.service";
import { CHAIN_CONFIGS, TOKENS, DEFAULT_SLIPPAGE } from "../constants";

export class SwapTokenContent {
    @property({
        description: "Chain name where the swap will occur",
        schema: z.string(),
        examples: ["Example: flow-evm"],
    })
    chain: string = "flow-evm";

    @property({
        description: "Source token symbol",
        schema: z.string(),
        examples: ["Example: USDC, ETH, FLOW"],
    })
    fromToken: string;

    @property({
        description: "Destination token symbol",
        schema: z.string(),
        examples: ["Example: FLOW"],
    })
    toToken: string;

    @property({
        description: "Amount of source tokens to swap",
        schema: z.number().positive(),
    })
    amount: number;

    @property({
        description: "Recipient address (defaults to agent's address if not provided)",
        schema: z.string().optional(),
    })
    recipient?: string;

    @property({
        description: "Slippage percentage (defaults to 0.5%)",
        schema: z.number().positive().optional(),
    })
    slippage?: number = DEFAULT_SLIPPAGE;
}

const actionOpts: ActionOptions<SwapTokenContent> = {
    name: "SWAP_TOKEN",
    similes: ["SWAP_TOKENS", "EXCHANGE_TOKENS"],
    description: "Swap tokens on Flow EVM",
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Swap 100 USDC to FLOW",
                    action: "SWAP_TOKEN",
                },
            },
        ],
    ],
    contentClass: SwapTokenContent,
    suppressInitialMessage: true,
};

@injectable()
export class SwapTokenAction extends BaseFlowInjectableAction<SwapTokenContent> {
    constructor(
        @inject(BridgeService)
        private readonly bridgeService: BridgeService,
        @inject("FlowWalletService")
        private readonly walletService: FlowWalletService
    ) {
        super(actionOpts);
    }

    async validate(_runtime: IAgentRuntime, message: Memory): Promise<boolean> {
        const content = typeof message.content === "string" ? message.content : message.content?.text;
        const keywords = ["swap", "exchange", "convert"];
        return keywords.some(keyword => content.toLowerCase().includes(keyword));
    }

    async execute(
        content: SwapTokenContent,
        _runtime: IAgentRuntime,
        _message: Memory,
        _state?: State,
        callback?: HandlerCallback,
    ) {
        elizaLogger.log("Starting SWAP_TOKEN handler...");

        try {
            // Validate chain
            if (!CHAIN_CONFIGS[content.chain]) {
                throw new Error(`Chain ${content.chain} not supported`);
            }

            // Validate tokens
            if (!TOKENS[content.fromToken]) {
                throw new Error(`Token ${content.fromToken} not supported`);
            }
            if (!TOKENS[content.toToken]) {
                throw new Error(`Token ${content.toToken} not supported`);
            }

            // Use agent's address if recipient not provided
            const recipient = content.recipient || this.walletService.address;

            const result = await this.bridgeService.swapTokens({
                chain: content.chain,
                fromToken: content.fromToken,
                toToken: content.toToken,
                amount: content.amount,
                recipient: recipient,
                slippage: content.slippage,
            });

            if (result.success) {
                callback?.({
                    text: `Successfully swapped ${content.amount} ${content.fromToken} to ${result.toAmount} ${content.toToken}. Transaction ID: ${result.txId}`,
                    content: { success: true, ...result },
                    source: "Bridge",
                });
            } else {
                throw new Error(result.errorMessage);
            }
        } catch (error) {
            callback?.({
                text: `Failed to swap tokens: ${error.message}`,
                content: { error: error.message },
                source: "Bridge",
            });
        }

        elizaLogger.log("Completed SWAP_TOKEN handler.");
    }
}

// Register the action with the global container
globalContainer.bind(SwapTokenAction).toSelf();
