// src/actions/get-pool-info.ts
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
import { IncrementService } from "../services/increment.service";

export class GetPoolInfoContent {
    @property({
        description: "Show all pools or specific pool",
        schema: z.boolean().optional(),
    })
    showAll?: boolean;

    @property({
        description: "Specific pool address to query",
        schema: z.string().optional(),
    })
    poolAddress?: string;
}

const actionOpts: ActionOptions<GetPoolInfoContent> = {
    name: "GET_POOL_INFO_INCREMENTFI",
    similes: ["SHOW_POOLS_INCREMENTFI", "LIST_POOLS_INCREMENTFI"],
    description: "Get information about IncrementFi pools",
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Show me all available pools",
                    action: "GET_POOL_INFO_INCREMENTFI",
                },
            },
        ],
    ],
    contentClass: GetPoolInfoContent,
    suppressInitialMessage: true,
};

@injectable()
export class GetPoolInfoAction extends BaseFlowInjectableAction<GetPoolInfoContent> {
    constructor(
        @inject(IncrementService)
        private readonly incrementService: IncrementService,
    ) {
        super(actionOpts);
    }

    async validate(_runtime: IAgentRuntime, message: Memory): Promise<boolean> {
        const content = typeof message.content === "string" ? message.content : message.content?.text;
        const keywords = ["show pools", "list pools", "pool info", "available pools"];
        return keywords.some(keyword => content.toLowerCase().includes(keyword));
    }

    async execute(
        content: GetPoolInfoContent,
        _runtime: IAgentRuntime,
        _message: Memory,
        _state?: State,
        callback?: HandlerCallback,
    ) {
        elizaLogger.log("Starting GET_POOL_INFO_INCREMENTFI handler...");

        try {
            if (content.showAll) {
                const pools = await this.incrementService.getAllPairInfos();
                callback?.({
                    text: this.formatPoolList(pools),
                    content: { success: true, pools },
                    source: "IncrementFi",
                });
            } else if (content.poolAddress) {
                const pool = await this.incrementService.getPairInfo(content.poolAddress);
                if (pool) {
                    callback?.({
                        text: this.formatPoolInfo(pool),
                        content: { success: true, pool },
                        source: "IncrementFi",
                    });
                } else {
                    throw new Error("Pool not found");
                }
            }
        } catch (error) {
            callback?.({
                text: `Failed to get pool information: ${error.message}`,
                content: { error: error.message },
                source: "IncrementFi",
            });
        }

        elizaLogger.log("Completed GET_POOL_INFO_INCREMENTFI handler.");
    }

    private formatPoolList(pools: any[]): string {
        return `Available Pools:\n${pools.map(pool => 
            `- ${pool.token0Key}/${pool.token1Key} (${pool.stableMode ? 'Stable' : 'Volatile'})\n` +
            `  Address: ${pool.address}\n` +
            `  Reserves: ${pool.token0Reserve} ${pool.token0Key}, ${pool.token1Reserve} ${pool.token1Key}\n`
        ).join('\n')}`;
    }

    private formatPoolInfo(pool: any): string {
        return `Pool Information:\n` +
            `Pair: ${pool.token0Key}/${pool.token1Key}\n` +
            `Type: ${pool.stableMode ? 'Stable' : 'Volatile'}\n` +
            `Address: ${pool.address}\n` +
            `Token0 Reserve: ${pool.token0Reserve} ${pool.token0Key}\n` +
            `Token1 Reserve: ${pool.token1Reserve} ${pool.token1Key}\n` +
            `Total Supply: ${pool.totalSupply}`;
    }
}

globalContainer.bind(GetPoolInfoAction).toSelf();