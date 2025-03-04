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
import { TopShotService } from "../services/topshot.service";
import type { Moment } from "../types";

export class GetMomentsContent {
    @property({
        description: "The Flow address to get moments for",
        schema: z.string(),
    })
    address: string;
}

@injectable()
export class GetMomentsAction extends BaseFlowInjectableAction<GetMomentsContent> {
    constructor(
        @inject(TopShotService)
        private readonly topShotService: TopShotService,
    ) {
        super({
            name: "GET_TOPSHOT_MOMENTS",
            similes: [],
            description: "Get NBA TopShot moments for a Flow address",
            examples: [
                [
                    {
                        user: "{{user1}}",
                        content: {
                            text: "Please get TopShot moments from address 0x1234567890abcdef",
                            action: "GET_TOPSHOT_MOMENTS",
                        },
                    },
                ]
            ],
            contentClass: GetMomentsContent,
        });
    }

    async validate(_runtime: IAgentRuntime, _message: Memory): Promise<boolean> {
        return true;
    }

    async execute(
        content: GetMomentsContent,
        _runtime: IAgentRuntime,
        _message: Memory,
        _state?: State,
        _callback?: HandlerCallback,
    ) {
        try {
            const result = await this.topShotService.getMoments(content.address);
            return {
                success: true,
                data: result,
            };
        } catch (error) {
            elizaLogger.error("Error getting moments:", error);
            return {
                success: false,
                error: `Failed to get moments: ${error}`,
            };
        }
    }
}

export async function getMoments(address: string) {
  try {
    const topShotService = globalContainer.get(TopShotService);
    return await topShotService.getMoments(address);
  } catch (error) {
    console.error('Error fetching moments:', error);
    throw error;
  }
}
