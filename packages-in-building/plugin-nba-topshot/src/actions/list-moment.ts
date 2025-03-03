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
            name: "LIST_TOPSHOT_MOMENT",
            similes: [],
            description: "List an NBA TopShot moment for sale",
            examples: [
                [
                    {
                        user: "{{user1}}",
                        content: {
                            text: "I want to list Topshot moment 12345 to sell for $25",
                            action: "LIST_TOPSHOT_MOMENT",
                        },
                    },
                ]
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

            // TODO: add callback to send message to user
            return {
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

export async function listMoment(momentId: number, price: number) {
  try {
    const marketService = globalContainer.get(MarketService);
    return await marketService.listMoment(momentId, price);
  } catch (error) {
    console.error('Error listing moment for sale:', error);
    throw error;
  }
}

globalContainer.bind<ListMomentAction>(ListMomentAction).toSelf();
