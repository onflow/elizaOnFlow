import { inject, injectable } from "inversify";
import {
    type ActionExample,
    elizaLogger,
    type Action,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@elizaos/core";
import { globalContainer } from "@elizaos/plugin-di";
import { FlowWalletService, type ScriptQueryResponse } from "@fixes-ai/core";

import { formatAgentWalletInfo, formatWalletInfo } from "../formater";
import { AccountsPoolService } from "../services/acctPool.service";
import type { FlowAccountBalanceInfo } from "@elizaos/plugin-flow";

/**
 * Get User Account Info Action
 *
 * @category Actions
 * @description Get the current account information of the user
 */
@injectable()
export class GetUserAccountInfoAction implements Action {
    public readonly name: string;
    public readonly similes: string[];
    public readonly description: string;
    public readonly examples: ActionExample[][];
    public readonly suppressInitialMessage: boolean;

    constructor(
        @inject(FlowWalletService)
        private readonly walletSerivce: FlowWalletService,
        @inject(AccountsPoolService)
        private readonly acctPoolService: AccountsPoolService,
    ) {
        this.name = "GET_USER_ACCOUNT_INFO";
        this.similes = ["GET_AGENT_ACCOUNT_INFO"];
        this.description =
            "Call this action to obtain the current account information of the user or the agent itself.";
        this.examples = [
            [
                {
                    user: "{{user1}}",
                    content: {
                        text: "Tell me about my Flow account.",
                        action: "GET_USER_ACCOUNT_INFO",
                    },
                },
            ],
            [
                {
                    user: "{{user1}}",
                    content: {
                        text: "What's your wallet status?",
                    },
                },
                {
                    user: "{{agentName}}",
                    content: {
                        text: "Let me check my wallet status.",
                        action: "GET_AGENT_ACCOUNT_INFO",
                    }
                }
            ],
            [
                {
                    user: "{{user1}}",
                    content: {
                        text: "What's your balance?",
                    },
                },
                {
                    user: "{{agentName}}",
                    content: {
                        text: "Let me check my wallet status.",
                        action: "GET_AGENT_ACCOUNT_INFO",
                    }
                }
            ],
        ];
        this.suppressInitialMessage = true;
    }

    /**
     * Validate if the action can be executed
     */
    async validate(_runtime: IAgentRuntime, message: Memory, _state?: State): Promise<boolean> {
        if (!this.walletSerivce.isInitialized) {
            return false;
        }

        const content =
            typeof message.content === "string" ? message.content : message.content?.text;

        const keywords: string[] = ["wallet", "account", "info", "balance", "status", "钱包", "账户", "账号", "余额"];
        // Check if the message contains the keywords
        return keywords.some((keyword) => content.toLowerCase().includes(keyword.toLowerCase()));
    }

    /**
     * Execute the transfer action
     *
     * @param content the content from processMessages
     * @param callback the callback function to pass the result to Eliza runtime
     * @returns the transaction response
     */
    async handler(
        runtime: IAgentRuntime,
        message: Memory,
        _state?: State,
        _options?: Record<string, unknown>,
        callback?: HandlerCallback,
    ): Promise<ScriptQueryResponse | null> {
        elizaLogger.log("Starting GET_USER_ACCOUNT_INFO handler...");

        const resp: ScriptQueryResponse = {
            ok: false,
        };

        const content =
            typeof message.content === "string" ? message.content : message.content?.text;
        const keywords = ["you", "your", "agent", "agent's", "你", "你的", "代理"];
        const isQueryAgent = keywords.some((keyword) => content.toLowerCase().includes(keyword));

        const userId = message.userId;
        const isSelf = message.userId === runtime.agentId || isQueryAgent;
        const mainAddr = this.walletSerivce.address;

        const accountName = `Account[${mainAddr}/${isSelf ? "root" : userId}]`;

        let acctInfo: FlowAccountBalanceInfo;
        try {
            acctInfo = await this.acctPoolService.queryAccountInfo(isSelf ? undefined : userId);
        } catch (error) {
            resp.error = `Error: ${error.message}`;
        }

        if (!acctInfo) {
            const errorMsg =
                resp.errorMessage ??
                (typeof resp.error === "string"
                    ? (resp.error as string)
                    : `Failed to query account info for ${userId} from ${mainAddr}, please ensure the account exists.`);
            callback?.({
                text: errorMsg,
                content: {
                    error: resp.error,
                },
                source: "FlowBlockchain",
            });
        } else {
            resp.ok = true;
            resp.data = acctInfo;

            callback?.({
                text: isSelf
                    ? formatAgentWalletInfo(runtime.character, acctInfo)
                    : formatWalletInfo(userId, accountName, acctInfo),
                content: { success: true, info: acctInfo },
                source: "FlowBlockchain",
            });
        }

        elizaLogger.log("Completed GET_USER_ACCOUNT_INFO handler.");

        return resp;
    }
}

// Register the transfer action
globalContainer.bind(GetUserAccountInfoAction).toSelf();
