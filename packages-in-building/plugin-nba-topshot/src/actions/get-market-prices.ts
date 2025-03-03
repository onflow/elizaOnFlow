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
import { MarketService } from "../services/market.service";
import type { GetMarketPricesParams, GetMarketPricesResult, MarketItem } from "../types";

export class GetMarketPricesContent {
    @property({
        description: "Optional set ID to filter by",
        schema: z.number().optional(),
    })
    setId?: number;

    @property({
        description: "Optional play ID to filter by",
        schema: z.number().optional(),
    })
    playId?: number;
}

@injectable()
export class GetMarketPricesAction extends BaseFlowInjectableAction<GetMarketPricesContent> {
    constructor(
        @inject(MarketService)
        private readonly marketService: MarketService,
    ) {
        super({
            name: "GET_TOPSHOT_MARKET_PRICES",
            similes: [],
            description: "Get NBA TopShot market listings with optional filters",
            examples: [
                [
                    {
                        user: "{{user1}}",
                        content: {
                            text: "I want to get TopShot market prices for set 12345 and playId 67890",
                            action: "GET_TOPSHOT_MARKET_PRICES",
                        },
                    },
                ]
            ],
            contentClass: GetMarketPricesContent,
        });
    }

    async validate(_runtime: IAgentRuntime, _message: Memory): Promise<boolean> {
        return true;
    }

    async execute(
        content: GetMarketPricesContent,
        _runtime: IAgentRuntime,
        _message: Memory,
        _state?: State,
        _callback?: HandlerCallback,
    ) {
        try {
            const result = await this.marketService.getMarketPrices(content.setId, content.playId);
            return {
                success: true,
                data: result,
            };
        } catch (error) {
            elizaLogger.error("Error getting market prices:", error);
            return {
                success: false,
                error: `Failed to get market prices: ${error}`,
            };
        }
    }
}

export async function getMarketPrices(setId?: number, playId?: number) {
  try {
    const marketService = globalContainer.get(MarketService);
    return await marketService.getMarketPrices(setId, playId);
  } catch (error) {
    console.error('Error fetching market prices:', error);
    throw error;
  }
}
