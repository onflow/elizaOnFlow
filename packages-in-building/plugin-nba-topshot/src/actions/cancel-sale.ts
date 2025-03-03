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
import { globalContainer, property } from "@elizaos-plugins/plugin-di";
import { BaseFlowInjectableAction } from "@elizaos-plugins/plugin-flow";
import { MarketService } from "../services/market.service";

export class CancelSaleContent {
    @property({
        description: "The ID of the moment to cancel the sale for",
        schema: z.number(),
    })
    momentId: number;
}

@injectable()
export class CancelSaleAction extends BaseFlowInjectableAction<CancelSaleContent> {
    constructor(
        @inject(MarketService)
        private readonly marketService: MarketService,
    ) {
        super({
            name: "CANCEL_TOPSHOT_SALE",
            similes: [],
            description: "Cancel a sale listing for an NBA TopShot moment",
            examples: [
                [
                    {
                        user: "{{user1}}",
                        content: {
                            text: "I want to cancel the sale for Topshot moment 12345",
                            action: "CANCEL_TOPSHOT_SALE",
                        },
                    },
                ]
            ],
            contentClass: CancelSaleContent,
        });
    }

    async validate(_runtime: IAgentRuntime, _message: Memory): Promise<boolean> {
        return true;
    }

    async execute(
        content: CancelSaleContent,
        _runtime: IAgentRuntime,
        _message: Memory,
        _state?: State,
        _callback?: HandlerCallback,
    ) {
        try {
            const result = await this.marketService.cancelSale(content.momentId);

            // TODO: add callback to send message to user
            return {
                data: result,
            };
        } catch (error) {
            elizaLogger.error("Error canceling sale:", error);
            return {
                success: false,
                error: `Failed to cancel sale: ${error}`,
            };
        }
    }
}

// Keep the original function for backward compatibility
export interface CancelSaleParams {
  momentId: number;
}

export interface CancelSaleResult {
  transactionId: string;
  success: boolean;
}

export async function cancelSale(momentId: number) {
  try {
    const marketService = globalContainer.get(MarketService);
    return await marketService.cancelSale(momentId);
  } catch (error) {
    console.error('Error canceling sale:', error);
    throw error;
  }
}
