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
            name: "BUY_TOPSHOT_MOMENT",
            similes: [],
            description: "Purchase an NBA TopShot moment from the marketplace",
            examples: [
                [
                    {
                        user: "{{user1}}",
                        content: {
                            text: "I want to purchase Topshot moment 12345",
                            action: "BUY_TOPSHOT_MOMENT",
                        },
                    },
                ]
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

            // TODO: add callback to send message to user
            return {
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

globalContainer.bind<PurchaseMomentAction>(PurchaseMomentAction).toSelf();

export async function purchaseMoment(momentId: number) {
  try {
    const marketService = globalContainer.get(MarketService);
    return await marketService.purchaseMoment(momentId);
  } catch (error) {
    console.error('Error purchasing moment:', error);
    throw error;
  }
}
