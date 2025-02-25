import { z } from "zod";
import { inject, injectable } from "inversify";
import {
    elizaLogger,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@elizaos/core";
import { isCadenceIdentifier, isEVMAddress, isFlowAddress } from "@elizaos-plugins/plugin-flow";
import { type ActionOptions, globalContainer, property } from "@elizaos-plugins/plugin-di";
import { BaseFlowInjectableAction } from "@fixes-ai/core";

import { formatTransationSent } from "../formater";
import { AccountsPoolService } from "../services/acctPool.service";

/**
 * The generated content for the transfer action
 */
export class TransferContent {
    @property({
        description:
            "Cadence Resource Identifier or ERC20 contract address (if not native token). this field should be null if the token is native token: $FLOW or FLOW",
        examples: [
            "For Cadence resource identifier, the field should be 'A.1654653399040a61.ContractName'",
            "For ERC20 contract address, the field should be '0xe6ffc15a5bde7dd33c127670ba2b9fcb82db971a'",
        ],
        schema: z.string().nullable(),
    })
    token: string | null;

    @property({
        description: "Amount to transfer, it should be a number or a string",
        examples: ["'1000'", "1000"],
        schema: z.union([z.string(), z.number()]),
    })
    amount: string;

    @property({
        description:
            "Recipient identifier, can a wallet address like EVM address or Cadence address, or a userId which is UUID formated.",
        examples: [
            "For Cadence address: '0x1654653399040a61'",
            "For EVM address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'",
            "For userId: 'e1b3b9c2-7e3f-4b1b-9f7d-2a0c7e2d6e9c', If the recipient mentioned in message is 'me' or 'myself', it should be the current user's id",
        ],
        schema: z.string(),
    })
    to: string;
}

/**
 * The transfer action options
 */
const transferOption: ActionOptions<TransferContent> = {
    name: "SEND_COIN",
    similes: [
        "SEND_TOKEN",
        "SEND_TOKEN_ON_FLOW",
        "TRANSFER_TOKEN_ON_FLOW",
        "TRANSFER_TOKENS_ON_FLOW",
        "TRANSFER_FLOW",
        "SEND_FLOW",
        "PAY_BY_FLOW",
    ],
    description:
        "Call this action to transfer any fungible token/coin from the agent's Flow wallet to another address",
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Send 1 FLOW to 0xa2de93114bae3e73",
                    action: "SEND_COIN",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Send 1 FLOW - A.1654653399040a61.FlowToken to 0xa2de93114bae3e73",
                    action: "SEND_COIN",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Send 1000 FROTH - 0xb73bf8e6a4477a952e0338e6cc00cc0ce5ad04ba to 0x000000000000000000000002e44fbfbd00395de5",
                    action: "SEND_COIN",
                },
            },
        ],
        [
            {
                user: "{{agentName}}",
                content: {
                    text: "I need to send 1 FLOW to user: {{user1}}",
                    action: "SEND_COIN",
                },
            },
        ],
    ],
    contentClass: TransferContent,
    suppressInitialMessage: true,
};

/**
 * Check if a string is a valid UUID
 * @param str The string to check
 * @returns true if the string is a valid UUID
 */
function isUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
}

/**
 * Transfer action
 *
 * @category Actions
 * @description Transfer funds from one account to another
 */
@injectable()
export class TransferAction extends BaseFlowInjectableAction<TransferContent> {
    constructor(
        @inject(AccountsPoolService)
        private readonly acctPoolService: AccountsPoolService,
    ) {
        super(transferOption);
    }

    /**
     * Validate the transfer action
     * @param runtime the runtime instance
     * @param message the message content
     * @param state the state object
     */
    async validate(runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> {
        if (await super.validate(runtime, message, state)) {
            // TODO: Add custom validation logic here to ensure the transfer does not come from unauthorized sources
            return true;
        }
        return false;
    }

    /**
     * Execute the transfer action
     *
     * @param content the content from processMessages
     * @param callback the callback function to pass the result to Eliza runtime
     * @returns the transaction response
     */
    async execute(
        content: TransferContent | null,
        _runtime: IAgentRuntime,
        message: Memory,
        _state?: State,
        callback?: HandlerCallback,
    ) {
        if (!content) {
            elizaLogger.warn("No content generated");
            return;
        }

        elizaLogger.log(`Starting ${this.name} handler...`);

        // Use main account of the agent
        const walletAddress = this.walletSerivce.address;

        // Get the user id
        const userId = message.userId;
        const isSelf = userId === message.agentId;
        const logPrefix = `Account[${walletAddress}/${isSelf ? "root" : userId}]`;

        // Parsed fields
        const amount =
            typeof content.amount === "number" ? content.amount : Number.parseFloat(content.amount);

        try {
            let recipient = content.to;
            // Check if the recipient is a user id
            if (isUUID(content.to)) {
                if (content.to === userId) {
                    // You can't send to yourself
                    throw new Error("Recipient is the same as the sender");
                }

                // Get the wallet address of the user
                const acctInfo = await this.acctPoolService.queryAccountInfo(content.to);
                if (acctInfo) {
                    recipient = acctInfo.address;
                    elizaLogger.info(
                        `${logPrefix}\n Recipient is a user id - ${content.to}, its wallet address: ${recipient}`,
                    );
                } else {
                    throw new Error(`Recipient not found with id: ${content.to}`);
                }
            }

            let txId: string;
            let keyIndex: number;

            // For different token types, we need to handle the token differently
            if (!content.token) {
                // Check if the wallet has enough balance to transfer
                const fromAccountInfo = await this.acctPoolService.queryAccountInfo(userId);
                const totalBalance = fromAccountInfo.balance + (fromAccountInfo.coaBalance ?? 0);

                // Check if the amount is valid
                if (totalBalance < amount) {
                    throw new Error("Insufficient balance to transfer");
                }

                elizaLogger.log(`${logPrefix}\n Sending ${amount} FLOW to ${recipient}...`);
                // Transfer FLOW token
                const resp = await this.acctPoolService.transferFlowToken(
                    userId,
                    recipient,
                    amount,
                );
                txId = resp.txId;
                keyIndex = resp.index;
            } else if (isCadenceIdentifier(content.token)) {
                if (!isFlowAddress(recipient)) {
                    throw new Error("Recipient address is not a valid Flow address");
                }

                // Transfer Fungible Token on Cadence side
                const [_, tokenAddr, tokenContractName] = content.token.split(".");
                elizaLogger.log(
                    `${logPrefix}\n Sending ${amount} A.${tokenAddr}.${tokenContractName} to ${recipient}...`,
                );
                const resp = await this.acctPoolService.transferGenericFT(
                    userId,
                    recipient,
                    amount,
                    `0x${tokenAddr}`,
                    tokenContractName,
                );
                txId = resp.txId;
                keyIndex = resp.index;
            } else if (isEVMAddress(content.token)) {
                if (!isEVMAddress(recipient)) {
                    throw new Error("Recipient address is not a valid EVM address");
                }

                elizaLogger.log(
                    `${logPrefix}\n Sending ${amount} ${content.token}(EVM) to ${recipient}...`,
                );

                // Transfer ERC20 token on EVM side
                const resp = await this.acctPoolService.transferERC20(
                    userId,
                    recipient,
                    amount,
                    content.token,
                );
                txId = resp.txId;
                keyIndex = resp.index;
            }

            elizaLogger.log(`${logPrefix}\n Sent transaction: ${txId} by KeyIndex[${keyIndex}]`);

            // call the callback with the transaction response
            if (callback) {
                const tokenName = content.token || "FLOW";
                const extraMsg = `${logPrefix}\n Successfully transferred ${content.amount} ${tokenName} to ${content.to}`;
                callback?.({
                    text: formatTransationSent(txId, this.walletSerivce.wallet.network, extraMsg),
                    content: {
                        success: true,
                        txid: txId,
                        token: content.token,
                        to: content.to,
                        amount: content.amount,
                    },
                });
            }
        } catch (e) {
            elizaLogger.error("Error in sending transaction:", e.message);
            callback?.({
                text: `${logPrefix}\n Unable to process transfer request. Error: \n ${e.message}`,
                content: {
                    error: e.message,
                },
            });
        }

        elizaLogger.log(`Finished ${this.name} handler.`);
    }
}

// Register the transfer action
globalContainer.bind(TransferAction).toSelf();
