// src/actions/create-pool.ts
import { z } from "zod";
import { inject, injectable } from "inversify";
import {
    elizaLogger,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@elizaos/core";
import { type ActionOptions, globalContainer, property } from "@elizaos-plugins/plugin-di";
import { BaseFlowInjectableAction } from "@elizaos-plugins/plugin-flow";
import { formatTransationSent } from "../formater";
import { isFlowAddress } from "@elizaos-plugins/plugin-flow";
import { IncrementService } from "../services/increment.service";

export class CreatePoolContent {
    @property({
        description: "First token name",
        examples: ["FlowToken", "USDCFlow"],
        schema: z.string(),
    })
    token0Name: string;

    @property({
        description: "First token contract address",
        examples: ["0x7e60df042a9c0868"],
        schema: z.string(),
    })
    token0Address: string;

    @property({
        description: "Second token name",
        examples: ["USDCFlow", "FlowToken"],
        schema: z.string(),
    })
    token1Name: string;

    @property({
        description: "Second token contract address",
        examples: ["0x64adf39cbc354fcb"],
        schema: z.string(),
    })
    token1Address: string;

    @property({
        description: "Is this a stable pair?",
        schema: z.boolean().nullish().default(false), // Change this line
    })
    stableMode: boolean = false;  // Add default value
}

const actionOpts: ActionOptions<CreatePoolContent> = {
    name: "CREATE_POOL_INCREMENTFI",
    similes: ["CREATE_PAIR_INCREMENTFI", "NEW_POOL_INCREMENTFI"],
    description: "Create a new pool in IncrementFi",
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Create a new pool for FLOW and USDC",
                    action: "CREATE_POOL_INCREMENTFI",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Create stable pool for USDC and FLOW",
                    action: "CREATE_POOL_INCREMENTFI",
                },
            },
        ],
    ],
    contentClass: CreatePoolContent,
    suppressInitialMessage: true,
};

@injectable()
export class CreatePoolAction extends BaseFlowInjectableAction<CreatePoolContent> {
    constructor(
        @inject(IncrementService)
        private readonly incrementService: IncrementService,
    ) {
        super(actionOpts);
    }

    async validate(_runtime: IAgentRuntime, message: Memory): Promise<boolean> {
        const content = typeof message.content === "string" ? message.content : message.content?.text;
        const keywords = ["create pool", "create pair", "new pool", "create liquidity pool"];
        return keywords.some(keyword => content.toLowerCase().includes(keyword));
    }

    async execute(
        content: CreatePoolContent,
        _runtime: IAgentRuntime,
        _message: Memory,
        _state?: State,
        callback?: HandlerCallback,
    ) {
        elizaLogger.log("Starting CREATE_POOL_INCREMENTFI handler...");

        try {
            // Validate addresses
            if (!isFlowAddress(content.token0Address) || !isFlowAddress(content.token1Address)) {
                throw new Error("Invalid token addresses provided");
            }

            const result = await this.incrementService.createPool({
                token0Name: content.token0Name,
                token0Address: content.token0Address,
                token1Name: content.token1Name,
                token1Address: content.token1Address,
                stableMode: content.stableMode ?? false,
            });

            if (result.success) {
                callback?.({
                    text: formatTransationSent(
                        result.txId,
                        this.walletSerivce.wallet.network,
                        `Successfully created ${content.stableMode ? 'stable' : 'volatile'} pool for ${content.token0Name}/${content.token1Name}`
                    ),
                    content: { success: true, ...result },
                    source: "IncrementFi",
                });
            } else {
                throw new Error(result.errorMessage);
            }
        } catch (error) {
            callback?.({
                text: `Failed to create pool: ${error.message}`,
                content: { error: error.message },
                source: "IncrementFi",
            });
        }

        elizaLogger.log("Completed CREATE_POOL_INCREMENTFI handler.");
    }
}

// Register the action with the global container
globalContainer.bind(CreatePoolAction).toSelf();
