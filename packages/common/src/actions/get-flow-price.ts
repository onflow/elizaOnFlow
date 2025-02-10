import { z } from "zod";
import { injectable } from "inversify";
import {
    elizaLogger,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@elizaos/core";
import { type ActionOptions, globalContainer, property } from "@elizaos/plugin-di";
import { BaseFlowInjectableAction, type ScriptQueryResponse } from "@fixes-ai/core";
import { scripts } from "../assets/scripts.defs";

/**
 * The generated content for the transfer action
 */
export class GetPriceContent {
    @property({
        description: "This field should be FLOW or stFLOW",
        examples: [
            "If asking for FLOW token, the field should be FLOW",
            "Otherwise, the field should be stFLOW",
        ],
        schema: z.string(),
    })
    token: string;
}

/**
 * The transfer action options
 */
const actionOpts: ActionOptions<GetPriceContent> = {
    name: "GET_FLOW_PRICE",
    similes: ["GET_STFLOW_PRICE", "GET_FLOW_TOKEN_PRICE", "GET_STFLOW_TOKEN_PRICE"],
    description:
        "Call this action to obtain the current price in USD of FLOW token or stFLOW token",
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Get current FLOW token price.",
                    action: "GET_FLOW_PRICE",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Get current stFLOW token price in USD.",
                    action: "GET_STFLOW_PRICE",
                },
            },
        ],
    ],
    contentClass: GetPriceContent,
    suppressInitialMessage: true,
};

/**
 * Get price action
 *
 * @category Actions
 * @description Get the current price of FLOW token or stFLOW token
 */
@injectable()
export class GetPriceAction extends BaseFlowInjectableAction<GetPriceContent> {
    constructor() {
        super(actionOpts);
    }

    /**
     * Validate if the action can be executed
     */
    async validate(_runtime: IAgentRuntime, message: Memory, _state?: State): Promise<boolean> {
        const keywords: string[] = ["price", "flow", "stflow", "价格", "币价"];
        // Check if the message contains the keywords
        return keywords.some((keyword) =>
            message.content.text.toLowerCase().includes(keyword.toLowerCase()),
        );
    }

    /**
     * Execute the transfer action
     *
     * @param content the content from processMessages
     * @param callback the callback function to pass the result to Eliza runtime
     * @returns the transaction response
     */
    async execute(
        content: GetPriceContent | null,
        _runtime: IAgentRuntime,
        _message: Memory,
        _state?: State,
        callback?: HandlerCallback,
    ): Promise<ScriptQueryResponse | null> {
        if (!content) {
            elizaLogger.warn("No content generated");
            return;
        }

        elizaLogger.log(`Starting ${this.name} handler...`);

        const resp: ScriptQueryResponse = {
            ok: false,
        };

        const targetToken = content.token?.toLowerCase();
        const validTokens = ["flow", "stflow"];
        if (!validTokens.includes(targetToken)) {
            resp.error = `Invalid token type: ${targetToken}`;
        } else {
            let data: string;
            try {
                data = await this.walletSerivce.executeScript(
                    targetToken === "flow" ? scripts.getFlowPrice : scripts.getStFlowPrice,
                    (_arg, _t) => [],
                    "",
                );
            } catch (err) {
                resp.error = err.message;
            }
            if (data) {
                resp.ok = true;
                resp.data = Number.parseFloat(data);
            } else {
                resp.error = resp.error ?? "Failed to get price data";
            }
        }

        if (resp.ok) {
            callback?.({
                text: format(resp.data as number, targetToken),
                content: {
                    success: true,
                    token: content.token,
                    price: resp.data,
                },
                source: "FlowBlockchain",
            });
        } else {
            elizaLogger.error("Error:", resp.error);
            callback?.({
                text: `Unable to get price for ${content.token}.`,
                content: {
                    error: resp.error ?? "Unknown error",
                },
                source: "FlowBlockchain",
            });
        }

        elizaLogger.log(`Finished ${this.name} handler.`);

        return resp;
    }
}

/**
 * Format the price data
 *
 * @param price the price data
 * @param token the token name
 * @returns the formatted price string
 */
const format = (price: number, token: string): string => {
    return `The current price of ${token} token is $${price.toFixed(8)}`;
};

// Register the transfer action
globalContainer.bind(GetPriceAction).toSelf();
