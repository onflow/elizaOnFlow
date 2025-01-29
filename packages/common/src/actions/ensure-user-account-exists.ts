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
import { FlowWalletService, TransactionSentResponse } from "@fixes-ai/core";

import { formatWalletInfo } from "../formater";
import { AccountsPoolService } from "../services/acctPool.service";

/**
 * Ensure user account exists
 *
 * @category Actions
 * @description Ensure user account exists on Flow blockchain
 */
@injectable()
export class EnsureUserAccountExistsAction implements Action {
    public readonly name: string;
    public readonly similes: string[];
    public readonly description: string;
    public readonly examples: ActionExample[][];
    public readonly suppressInitialMessage: boolean;

    constructor(
        @inject(FlowWalletService)
        private readonly walletSerivce: FlowWalletService,
        @inject(AccountsPoolService)
        private readonly acctPoolSerivce: AccountsPoolService,
    ) {
        this.name = "ENSURE_USER_ACCOUNT";
        this.similes = [
            "ENSURE_USER_ACCOUNT_EXISTS",
            "ENSURE_CHILD_ACCOUNT",
            "ENSURE_CHILD_ACCOUNT_EXISTS",
        ];
        this.description =
            "Call this action to ensure user account exists on Flow blockchain.";
        this.examples = [
            [
                {
                    user: "{{user1}}",
                    content: {
                        text: "Create a new wallet for me.",
                        action: "ENSURE_USER_ACCOUNT",
                    },
                },
            ],
            [
                {
                    user: "{{user1}}",
                    content: {
                        text: "Check if I have a wallet, if not, create one.",
                        action: "ENSURE_USER_ACCOUNT",
                    },
                },
            ],
        ];
        this.suppressInitialMessage = true;
    }

    /**
     * Validate if the action can be executed
     */
    async validate(_runtime: IAgentRuntime, message: Memory): Promise<boolean> {
        if (!this.walletSerivce.isInitialized) {
            return false;
        }

        const content =
            typeof message.content === "string"
                ? message.content
                : message.content?.text;

        if (!content) return false;

        const keywords: string[] = [
            "create",
            "wallet",
            "account",
            "创建",
            "账号",
            "钱包",
        ];
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
    ) {
        elizaLogger.log("Starting ENSURE_USER_ACCOUNT_EXISTS handler...");

        const userId = message.userId;
        const isSelf = message.userId === runtime.agentId;
        const mainAddr = this.walletSerivce.address;

        const accountName = `Account[${mainAddr}/${isSelf ? "root" : userId}]`;

        let acctInfo: FlowAccountBalanceInfo;
        try {
            acctInfo = await this.acctPoolSerivce.queryAccountInfo(
                isSelf ? null : userId,
            );
        } catch (e) {
            elizaLogger.error("Error:", e);
            callback?.({
                text: `Unable to fetch info for ${accountName}.`,
                content: { error: e.message },
                source: "FlowBlockchain",
            });
            return;
        }

        if (acctInfo) {
            callback?.({
                text: formatWalletInfo(message.userId, accountName, acctInfo),
                content: { exists: true },
                source: "FlowBlockchain",
            });
            return;
        }

        // create a new account by sendinng transaction
        await new Promise((resolve, reject) => {
            let txResp: TransactionSentResponse;
            this.acctPoolSerivce
                .createNewAccount(userId, {
                    onFinalized: async (txId, status, errorMsg) => {
                        if (errorMsg) {
                            reject(
                                new Error(
                                    "Error creating account: " + errorMsg,
                                ),
                            );
                            return;
                        }
                        // TODO parse the events
                        // status.events and callback to Eliza
                        resolve({
                            txId,
                            keyIndex: txResp?.index,
                            ...status,
                        });
                    },
                })
                .then((tx) => (txResp = tx))
                .catch((e) => reject(e));
        });

        elizaLogger.log("Completed ENSURE_USER_ACCOUNT_EXISTS handler.");
    }
}

// Register the transfer action
globalContainer.bind(EnsureUserAccountExistsAction).toSelf();
