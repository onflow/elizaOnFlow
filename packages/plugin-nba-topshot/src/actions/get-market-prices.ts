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
import { type ActionOptions, globalContainer, property } from "@elizaos/plugin-di";
import { BaseFlowInjectableAction } from "@fixes-ai/core";
import { MarketService } from "../services/market.service";
import { MarketItem } from "../services/market.service";

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
            name: "get-market-prices",
            description: "Get NBA TopShot market listings with optional filters",
            examples: [
                {
                    content: {
                        setId: 12345,
                    },
                },
                {
                    content: {
                        playId: 67890,
                    },
                },
                {
                    content: {
                        setId: 12345,
                        playId: 67890,
                    },
                },
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

// Keep the original function for backward compatibility
export interface GetMarketPricesParams {
  setId?: number;
  playId?: number;
}

export interface GetMarketPricesResult {
  items: MarketItem[];
}

export async function getMarketPrices({ setId, playId }: GetMarketPricesParams): Promise<GetMarketPricesResult> {
  try {
    const marketService = globalContainer.get(MarketService);
    return await marketService.getMarketPrices(setId, playId);
  } catch (error) {
    console.error('Error fetching market prices:', error);
    throw error;
  }
}