// src/actions/remove-liquidity.ts
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
import { BaseFlowInjectableAction } from "@fixes-ai/core";
import { IncrementService } from "../services/increment.service";
import { formatTransationSent } from "../formater";

export class RemoveLiquidityContent {
    @property({
        description: "The first token's identifier",
        schema: z.string(),
    })
    token0Key: string;

    @property({
        description: "The second token's identifier",
        schema: z.string(),
    })
    token1Key: string;

    @property({
        description: "Amount of LP tokens to remove",
        schema: z.number(),
    })
    lpTokenAmount: number;

    @property({
        description: "Minimum amount of first token to receive",
        schema: z.number(),
    })
    token0OutMin: number;

    @property({
        description: "Minimum amount of second token to receive",
        schema: z.number(),
    })
    token1OutMin: number;

    @property({
        description: "Is this a stable pair?",
        schema: z.boolean().optional(),
    })
    stableMode?: boolean;
}

const actionOpts: ActionOptions<RemoveLiquidityContent> = {
    name: "REMOVE_LIQUIDITY_INCREMENTFI",
    similes: ["WITHDRAW_LIQUIDITY_INCREMENTFI", "REMOVE_LP_INCREMENTFI"],
    description: "Remove liquidity from an IncrementFi pool",
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Remove 5 LP tokens from FLOW-USDC pool",
                    action: "REMOVE_LIQUIDITY_INCREMENTFI",
                },
            },
        ],
    ],
    contentClass: RemoveLiquidityContent,
    suppressInitialMessage: true,
};

@injectable()
export class RemoveLiquidityAction extends BaseFlowInjectableAction<RemoveLiquidityContent> {
    constructor(
        @inject(IncrementService)
        private readonly incrementService: IncrementService,
    ) {
        super(actionOpts);
    }

    async validate(_runtime: IAgentRuntime, message: Memory): Promise<boolean> {
        const content = typeof message.content === "string" ? message.content : message.content?.text;
        const keywords = ["remove liquidity", "withdraw liquidity", "remove from pool"];
        return keywords.some(keyword => content.toLowerCase().includes(keyword));
    }

    async execute(
        content: RemoveLiquidityContent,
        _runtime: IAgentRuntime,
        message: Memory,
        _state?: State,
        callback?: HandlerCallback,
    ) {
        elizaLogger.log("Starting REMOVE_LIQUIDITY_INCREMENTFI handler...");

        try {
            const result = await this.incrementService.removeLiquidity({
                token0Key: content.token0Key,
                token1Key: content.token1Key,
                lpTokenAmount: content.lpTokenAmount,
                token0OutMin: content.token0OutMin,
                token1OutMin: content.token1OutMin,
                deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour deadline
                stableMode: content.stableMode,
            });

            if (result.success) {
                callback?.({
                    text: formatTransationSent(
                        result.txId,
                        this.walletSerivce.wallet.network, // Fixed typo in walletService
                        `Successfully removed liquidity from pool`
                    ),
                    content: { success: true, ...result },
                    source: "IncrementFi",
                });
            } else {
                throw new Error(result.errorMessage);
            }
        } catch (error) {
            callback?.({
                text: `Failed to remove liquidity: ${error.message}`,
                content: { error: error.message },
                source: "IncrementFi",
            });
        }

        elizaLogger.log("Completed REMOVE_LIQUIDITY_INCREMENTFI handler.");
    }
}

// Register the action with the global container
globalContainer.bind(RemoveLiquidityAction).toSelf();
