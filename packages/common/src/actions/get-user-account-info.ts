import { inject, injectable } from "inversify";
import {
    ActionExample,
    elizaLogger,
    type Action,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@elizaos/core";
import { FlowAccountBalanceInfo } from "@elizaos/plugin-flow";
import { globalContainer } from "@elizaos/plugin-di";
import { FlowWalletService, type ScriptQueryResponse } from "@fixes-ai/core";

import { scripts } from "../assets/scripts.defs";
import { formatWalletInfo } from "../formater";

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
    ) {
        this.name = "GET_USER_ACCOUNT_INFO";
        this.similes = [];
        this.description =
            "Call this action to obtain the current account information of the user.";
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
        ];
        this.suppressInitialMessage = true;
    }

    /**
     * Validate if the action can be executed
     */
    async validate(
        _runtime: IAgentRuntime,
        message: Memory,
        _state?: State,
    ): Promise<boolean> {
        if (!this.walletSerivce.isInitialized) {
            return false;
        }

        const content =
            typeof message.content === "string"
                ? message.content
                : message.content?.text;

        const keywords: string[] = ["account", "info", "账户", "账号"];
        // Check if the message contains the keywords
        return keywords.some((keyword) =>
            content.toLowerCase().includes(keyword.toLowerCase()),
        );
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

        const userId = message.userId;
        const isSelf = message.userId === runtime.agentId;
        const mainAddr = this.walletSerivce.address;

        const accountName = `Account[${mainAddr}/${isSelf ? "root" : userId}]`;

        let acctInfo: FlowAccountBalanceInfo;
        try {
            const obj = await this.walletSerivce.executeScript(
                scripts.getAccountInfoFrom,
                (arg, t) => [
                    arg(mainAddr, t.Address),
                    arg(isSelf ? null : userId, t.Optional(t.String)),
                ],
                undefined,
            );
            if (obj) {
                acctInfo = {
                    address: obj.address,
                    balance: parseFloat(obj.balance),
                    coaAddress: obj.coaAddress,
                    coaBalance: obj.coaBalance ? parseFloat(obj.coaBalance) : 0,
                };
            } else {
                resp.error = `${accountName} is not found.`;
            }
        } catch (err) {
            resp.error = err.message;
        }

        if (acctInfo) {
            resp.ok = true;
            resp.data = acctInfo;
        }

        if (resp.ok) {
            callback?.({
                text: formatWalletInfo(accountName, acctInfo),
                content: { success: true, info: acctInfo },
                source: "FlowBlockchain",
            });
        } else {
            elizaLogger.error("Error:", resp.error);
            callback?.({
                text: `Unable to get information for ${accountName}.`,
                content: {
                    error: resp.error ?? "Unknown error",
                },
                source: "FlowBlockchain",
            });
        }

        elizaLogger.log("Completed GET_USER_ACCOUNT_INFO handler.");

        return resp;
    }
}

// Register the transfer action
globalContainer.bind(GetUserAccountInfoAction).toSelf();
