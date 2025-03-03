// src/actions/bridge-token.ts
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
import { BaseFlowInjectableAction, type FlowWalletService } from "@elizaos-plugins/plugin-flow";
import { BridgeService } from "../services/bridge.service";
import { CHAIN_CONFIGS, TOKENS, DEFAULT_SLIPPAGE } from "../constants";

export class BridgeTokenContent {
    @property({
        description: "Source chain name",
        schema: z.string(),
        examples: ["Example: arbitrum, base, ethereum, optimism, polygon"],
    })
    sourceChain: string;

    @property({
        description: "Destination chain name (usually flow-evm)",
        schema: z.string(),
        examples: ["Example: flow-evm"],
    })
    destinationChain: string = "flow-evm";

    @property({
        description: "Token symbol to bridge",
        schema: z.string(),
        examples: ["Example: USDC, ETH, FLOW"],
    })
    token: string;

    @property({
        description: "Amount of tokens to bridge",
        schema: z.number().positive(),
    })
    amount: number;

    @property({
        description: "Recipient address (defaults to agent's address if not provided)",
        schema: z.string().optional(),
    })
    recipient?: string;

    @property({
        description: "Slippage percentage (defaults to 0.5%)",
        schema: z.number().positive().optional(),
    })
    slippage?: number = DEFAULT_SLIPPAGE;
}

const actionOpts: ActionOptions<BridgeTokenContent> = {
    name: "BRIDGE_TOKEN",
    similes: ["BRIDGE_TOKENS", "TRANSFER_TOKENS_CROSS_CHAIN"],
    description: "Bridge tokens from another ecosystem to Flow",
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Bridge 100 USDC from Arbitrum to Flow",
                    action: "BRIDGE_TOKEN",
                },
            },
        ],
    ],
    contentClass: BridgeTokenContent,
    suppressInitialMessage: true,
};

@injectable()
export class BridgeTokenAction extends BaseFlowInjectableAction<BridgeTokenContent> {
    constructor(
        @inject(BridgeService)
        private readonly bridgeService: BridgeService,
        @inject("FlowWalletService")
        private readonly walletService: FlowWalletService,
    ) {
        super(actionOpts);
    }

    async validate(_runtime: IAgentRuntime, message: Memory): Promise<boolean> {
        const content = typeof message.content === "string" ? message.content : message.content?.text;
        const keywords = ["bridge", "transfer", "cross-chain"];
        return keywords.some(keyword => content.toLowerCase().includes(keyword));
    }

    async execute(
        content: BridgeTokenContent,
        _runtime: IAgentRuntime,
        _message: Memory,
        _state?: State,
        callback?: HandlerCallback,
    ) {
        elizaLogger.log("Starting BRIDGE_TOKEN handler...");

        try {
            // Validate source chain
            if (!CHAIN_CONFIGS[content.sourceChain]) {
                throw new Error(`Source chain ${content.sourceChain} not supported`);
            }

            // Validate destination chain
            if (!CHAIN_CONFIGS[content.destinationChain]) {
                throw new Error(`Destination chain ${content.destinationChain} not supported`);
            }

            // Validate token
            if (!TOKENS[content.token]) {
                throw new Error(`Token ${content.token} not supported`);
            }

            // Use agent's address if recipient not provided
            const recipient = content.recipient || this.walletService.address;

            const result = await this.bridgeService.bridgeTokens({
                sourceChain: content.sourceChain,
                destinationChain: content.destinationChain,
                amount: content.amount,
                token: content.token,
                recipient: recipient,
                slippage: content.slippage,
            });

            if (result.success) {
                callback?.({
                    text: `Successfully initiated bridge of ${content.amount} ${content.token} from ${content.sourceChain} to ${content.destinationChain}. Transaction ID: ${result.txId}`,
                    content: { success: true, ...result },
                    source: "Bridge",
                });
            } else {
                throw new Error(result.errorMessage);
            }
        } catch (error) {
            callback?.({
                text: `Failed to bridge tokens: ${error.message}`,
                content: { error: error.message },
                source: "Bridge",
            });
        }

        elizaLogger.log("Completed BRIDGE_TOKEN handler.");
    }
}

// Register the action with the global container
globalContainer.bind(BridgeTokenAction).toSelf();
