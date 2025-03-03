// src/actions/add-liquidity.ts
import { z } from "zod";
import { inject, injectable } from "inversify";
import {
    elizaLogger,
    type ActionExample,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@elizaos/core";
import { type ActionOptions, globalContainer, property } from "@elizaos-plugins/plugin-di";
import { BaseFlowInjectableAction } from "@elizaos-plugins/plugin-flow";
import { IncrementService } from "../services/increment.service";
import { formatTransationSent } from "../formater";

export class AddLiquidityContent {
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
        description: "Amount of first token to add",
        schema: z.number(),
    })
    token0Amount: number;

    @property({
        description: "Amount of second token to add",
        schema: z.number(),
    })
    token1Amount: number;

    @property({
        description: "Minimum amount of first token (slippage protection)",
        schema: z.number(),
    })
    token0Min: number;

    @property({
        description: "Minimum amount of second token (slippage protection)",
        schema: z.number(),
    })
    token1Min: number;

    @property({
        description: "Is this a stable pair?",
        schema: z.boolean().optional(),
    })
    stableMode?: boolean;
}

const actionOpts: ActionOptions<AddLiquidityContent> = {
    name: "ADD_LIQUIDITY_INCREMENTFI",
    similes: ["PROVIDE_LIQUIDITY_INCREMENTFI", "ADD_LP_INCREMENTFI"],
    description: "Add liquidity to an IncrementFi pool",
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Add 10 FLOW and 20 USDC to the pool",
                    action: "ADD_LIQUIDITY_INCREMENTFI",
                },
            },
        ],
    ],
    contentClass: AddLiquidityContent,
    suppressInitialMessage: true,
};

@injectable()
export class AddLiquidityAction extends BaseFlowInjectableAction<AddLiquidityContent> {
    constructor(
        @inject(IncrementService)
        private readonly incrementService: IncrementService,
    ) {
        super(actionOpts);
    }

    async validate(_runtime: IAgentRuntime, message: Memory): Promise<boolean> {
        const content = typeof message.content === "string" ? message.content : message.content?.text;
        const keywords = ["add liquidity", "provide liquidity", "add to pool"];
        return keywords.some(keyword => content.toLowerCase().includes(keyword));
    }

    async execute(
        content: AddLiquidityContent,
        _runtime: IAgentRuntime,
        message: Memory,
        _state?: State,
        callback?: HandlerCallback,
    ) {
        elizaLogger.log("Starting ADD_LIQUIDITY_INCREMENTFI handler...");

        try {
            const result = await this.incrementService.addLiquidity({
                token0Key: content.token0Key,
                token1Key: content.token1Key,
                token0Amount: content.token0Amount,
                token1Amount: content.token1Amount,
                token0Min: content.token0Min,
                token1Min: content.token1Min,
                deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour deadline
                stableMode: content.stableMode,
            });

            if (result.success) {
                callback?.({
                    text: formatTransationSent(
                        result.txId,
                        this.walletSerivce.wallet.network,
                        `Successfully added liquidity to pool ${result.pairAddress}`
                    ),
                    content: { success: true, ...result },
                    source: "IncrementFi",
                });
            } else {
                throw new Error(result.errorMessage);
            }
        } catch (error) {
            callback?.({
                text: `Failed to add liquidity: ${error.message}`,
                content: { error: error.message },
                source: "IncrementFi",
            });
        }

        elizaLogger.log("Completed ADD_LIQUIDITY_INCREMENTFI handler.");
    }
}
globalContainer.bind(AddLiquidityAction).toSelf();
