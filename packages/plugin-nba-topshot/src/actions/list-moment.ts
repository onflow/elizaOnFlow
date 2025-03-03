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

export class ListMomentContent {
    @property({
        description: "The ID of the moment to list for sale",
        schema: z.number(),
    })
    momentId: number;

    @property({
        description: "The price to list the moment for",
        schema: z.number(),
    })
    price: number;
}

@injectable()
export class ListMomentAction extends BaseFlowInjectableAction<ListMomentContent> {
    constructor(
        @inject(MarketService)
        private readonly marketService: MarketService,
    ) {
        super({
            name: "list-moment",
            description: "List an NBA TopShot moment for sale",
            examples: [
                {
                    content: {
                        momentId: 12345,
                        price: 25.0,
                    },
                },
            ],
            contentClass: ListMomentContent,
        });
    }

    async validate(_runtime: IAgentRuntime, _message: Memory): Promise<boolean> {
        return true;
    }

    async execute(
        content: ListMomentContent,
        _runtime: IAgentRuntime,
        _message: Memory,
        _state?: State,
        _callback?: HandlerCallback,
    ) {
        try {
            const result = await this.marketService.listMoment(content.momentId, content.price);
            return {
                success: result.success,
                data: result,
            };
        } catch (error) {
            elizaLogger.error("Error listing moment for sale:", error);
            return {
                success: false,
                error: `Failed to list moment for sale: ${error}`,
            };
        }
    }
}

// Keep the original function for backward compatibility
export interface ListMomentParams {
  momentId: number;
  price: number;
}

export interface ListMomentResult {
  transactionId: string;
  success: boolean;
}

export async function listMoment({ momentId, price }: ListMomentParams): Promise<ListMomentResult> {
  try {
    const marketService = globalContainer.get(MarketService);
    return await marketService.listMoment(momentId, price);
  } catch (error) {
    console.error('Error listing moment for sale:', error);
    throw error;
  }
}