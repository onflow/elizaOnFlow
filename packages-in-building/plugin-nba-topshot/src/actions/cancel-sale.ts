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
            name: "cancel-sale",
            description: "Cancel a sale listing for an NBA TopShot moment",
            examples: [
                {
                    content: {
                        momentId: 12345,
                    },
                },
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
            return {
                success: result.success,
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

export async function cancelSale({ momentId }: CancelSaleParams): Promise<CancelSaleResult> {
  try {
    const marketService = globalContainer.get(MarketService);
    return await marketService.cancelSale(momentId);
  } catch (error) {
    console.error('Error canceling sale:', error);
    throw error;
  }
}