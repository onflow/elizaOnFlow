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

export class PurchaseMomentContent {
    @property({
        description: "The ID of the moment to purchase",
        schema: z.number(),
    })
    momentId: number;
}

@injectable()
export class PurchaseMomentAction extends BaseFlowInjectableAction<PurchaseMomentContent> {
    constructor(
        @inject(MarketService)
        private readonly marketService: MarketService,
    ) {
        super({
            name: "purchase-moment",
            description: "Purchase an NBA TopShot moment from the marketplace",
            examples: [
                {
                    content: {
                        momentId: 12345,
                    },
                },
            ],
            contentClass: PurchaseMomentContent,
        });
    }

    async validate(_runtime: IAgentRuntime, _message: Memory): Promise<boolean> {
        return true;
    }

    async execute(
        content: PurchaseMomentContent,
        _runtime: IAgentRuntime,
        _message: Memory,
        _state?: State,
        _callback?: HandlerCallback,
    ) {
        try {
            const result = await this.marketService.purchaseMoment(content.momentId);
            return {
                success: result.success,
                data: result,
            };
        } catch (error) {
            elizaLogger.error("Error purchasing moment:", error);
            return {
                success: false,
                error: `Failed to purchase moment: ${error}`,
            };
        }
    }
}

// Keep the original function for backward compatibility
export interface PurchaseMomentParams {
  momentId: number;
}

export interface PurchaseMomentResult {
  transactionId: string;
  success: boolean;
}

export async function purchaseMoment({ momentId }: PurchaseMomentParams): Promise<PurchaseMomentResult> {
  try {
    const marketService = globalContainer.get(MarketService);
    return await marketService.purchaseMoment(momentId);
  } catch (error) {
    console.error('Error purchasing moment:', error);
    throw error;
  }
}