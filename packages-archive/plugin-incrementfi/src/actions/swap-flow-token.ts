// src/actions/swap-flow-token.ts
import { z } from "zod";
import { inject, injectable } from "inversify";
import {
    elizaLogger,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@elizaos/core";
import { type ActionOptions, globalContainer, property } from "@elizaos/plugin-di";
import { BaseFlowInjectableAction } from "@fixes-ai/core";
import { formatTransationSent } from "../formater";
import { isFlowAddress } from "@elizaos/plugin-flow";
import { IncrementService } from "../services/increment.service";
import { TESTNET_TOKENS } from "../constants/tokens";

export class SwapFlowTokenContent {
    @property({
        description: "Exact amount of tokens to swap",
        schema: z.number().positive(),
    })
    exactAmountIn: number;

    @property({
        description: "Minimum amount of tokens to receive (usually 99% of input for 1% slippage)",
        schema: z.number().positive(),
    })
    amountOutMin: number = 0; // Will be calculated if not provided

    @property({
        description: "Token swap path identifiers",
        examples: ["Example: A.7e60df042a9c0868.FlowToken,A.64adf39cbc354fcb.USDCFlow"],
        schema: z.array(z.string()).min(2),
    })
    tokenKeyPath: string[];

    @property({
        description: "Recipient address",
        schema: z.string(),
    })
    to: string;

    @property({
        description: "Transaction deadline in seconds",
        schema: z.number().positive().optional().default(3600),
    })
    deadline: number = 3600;
}

const actionOpts: ActionOptions<SwapFlowTokenContent> = {
    name: "SWAP_FLOW_TOKEN_INCREMENTFI",
    similes: ["SWAP_TOKENS_INCREMENTFI", "EXCHANGE_TOKENS_INCREMENTFI"],
    description: "Swap tokens on IncrementFi",
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Swap 10 FLOW for USDC",
                    action: "SWAP_FLOW_TOKEN_INCREMENTFI",
                },
            },
        ],
    ],
    contentClass: SwapFlowTokenContent,
    suppressInitialMessage: true,
};

@injectable()
export class SwapFlowTokenAction extends BaseFlowInjectableAction<SwapFlowTokenContent> {
    constructor(
        @inject(IncrementService)
        private readonly incrementService: IncrementService,
    ) {
        super(actionOpts);
    }

    async validate(_runtime: IAgentRuntime, message: Memory): Promise<boolean> {
        const content = typeof message.content === "string" ? message.content : message.content?.text;
        const keywords = ["swap", "exchange", "trade"];
        return keywords.some(keyword => content.toLowerCase().includes(keyword));
    }

    async execute(
        content: SwapFlowTokenContent,
        _runtime: IAgentRuntime,
        _message: Memory,
        _state?: State,
        callback?: HandlerCallback,
    ) {
        elizaLogger.log("Starting SWAP_FLOW_TOKEN_INCREMENTFI handler...");

        try {
            // Calculate minimum amount if not provided (using 0.5% slippage)
            const minAmount = content.amountOutMin || (content.exactAmountIn * 0.995);

            const result = await this.incrementService.swapExactTokens({
                exactAmountIn: content.exactAmountIn,
                amountOutMin: minAmount,
                tokenKeyPath: content.tokenKeyPath,
                to: content.to || this.walletSerivce.address, // Use sender's address if not specified
                deadline: content.deadline,
            });

            if (result.success) {
                callback?.({
                    text: formatTransationSent(
                        result.txId,
                        this.walletSerivce.wallet.network,
                        `Successfully swapped ${content.exactAmountIn} ${content.tokenKeyPath[0]} with minimum output of ${minAmount} ${content.tokenKeyPath[content.tokenKeyPath.length-1]}`
                    ),
                    content: { success: true, ...result },
                    source: "IncrementFi",
                });
            } else {
                throw new Error(result.errorMessage);
            }
        } catch (error) {
            callback?.({
                text: `Failed to swap tokens: ${error.message}`,
                content: { error: error.message },
                source: "IncrementFi",
            });
        }

        elizaLogger.log("Completed SWAP_FLOW_TOKEN_INCREMENTFI handler.");
    }
}

// Register the action with the global container
globalContainer.bind(SwapFlowTokenAction).toSelf();