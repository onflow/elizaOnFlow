import { z } from "zod";
import { injectable } from "inversify";
import {
    elizaLogger,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@elizaos/core";
import {
    isCadenceIdentifier,
    isEVMAddress,
    queries as defaultQueries,
    transactions,
    type TransactionResponse,
} from "@elizaos/plugin-flow";
import {
    type ActionOptions,
    globalContainer,
    property,
} from "@elizaos/plugin-di";
import { BaseFlowInjectableAction } from "@fixes-ai/core";

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
            "For userId: 'e1b3b9c2-7e3f-4b1b-9f7d-2a0c7e2d6e9c'",
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
};

/**
 * Transfer action
 *
 * @category Actions
 * @description Transfer funds from one account to another
 */
@injectable()
export class TransferAction extends BaseFlowInjectableAction<TransferContent> {
    constructor() {
        super(transferOption);
    }

    /**
     * Validate the transfer action
     * @param runtime the runtime instance
     * @param message the message content
     * @param state the state object
     */
    async validate(
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
    ): Promise<boolean> {
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
        _message: Memory,
        _state?: State,
        callback?: HandlerCallback,
    ): Promise<TransactionResponse | null> {
        if (!content) {
            elizaLogger.warn("No content generated");
            return;
        }

        elizaLogger.log("Starting Flow Plugin's SEND_COIN handler...");

        // Use shared wallet instance
        const walletAddress = this.walletSerivce.address;

        const logPrefix = `Address: ${walletAddress}\n`;

        // Parsed fields
        const recipient = content.to;
        const amount =
            typeof content.amount === "number"
                ? content.amount
                : Number.parseFloat(content.amount);

        // Check if the wallet has enough balance to transfer
        const accountInfo = await defaultQueries.queryAccountBalanceInfo(
            this.walletSerivce.wallet,
            walletAddress,
        );
        const totalBalance =
            accountInfo.balance + (accountInfo.coaBalance ?? 0);

        // Check if the amount is valid
        if (totalBalance < amount) {
            elizaLogger.error("Insufficient balance to transfer.");
            if (callback) {
                callback({
                    text: `${logPrefix} Unable to process transfer request. Insufficient balance.`,
                    content: {
                        error: "Insufficient balance",
                    },
                });
            }
            throw new Error("Insufficient balance to transfer");
        }

        let txId: string;
        let keyIndex: number;

        try {
            // For different token types, we need to handle the token differently
            if (!content.token) {
                elizaLogger.log(
                    `${logPrefix} Sending ${amount} FLOW to ${recipient}...`,
                );
                // Transfer FLOW token
                const resp = await this.walletSerivce.sendTransaction(
                    transactions.mainFlowTokenDynamicTransfer,
                    (arg, t) => [
                        arg(recipient, t.String),
                        arg(amount.toFixed(1), t.UFix64),
                    ],
                );
                txId = resp.txId;
                keyIndex = resp.index;
            } else if (isCadenceIdentifier(content.token)) {
                // Transfer Fungible Token on Cadence side
                const [_, tokenAddr, tokenContractName] =
                    content.token.split(".");
                elizaLogger.log(
                    `${logPrefix} Sending ${amount} A.${tokenAddr}.${tokenContractName} to ${recipient}...`,
                );
                const resp = await this.walletSerivce.sendTransaction(
                    transactions.mainFTGenericTransfer,
                    (arg, t) => [
                        arg(amount.toFixed(1), t.UFix64),
                        arg(recipient, t.Address),
                        arg("0x" + tokenAddr, t.Address),
                        arg(tokenContractName, t.String),
                    ],
                );
                txId = resp.txId;
                keyIndex = resp.index;
            } else if (isEVMAddress(content.token)) {
                // Transfer ERC20 token on EVM side
                // we need to update the amount to be in the smallest unit
                const decimals = await defaultQueries.queryEvmERC20Decimals(
                    this.walletSerivce.wallet,
                    content.token,
                );
                const adjustedAmount = BigInt(amount * Math.pow(10, decimals));

                elizaLogger.log(
                    `${logPrefix} Sending ${adjustedAmount} ${content.token}(EVM) to ${recipient}...`,
                );

                const resp = await this.walletSerivce.sendTransaction(
                    transactions.mainEVMTransferERC20,
                    (arg, t) => [
                        arg(content.token, t.String),
                        arg(recipient, t.String),
                        // Convert the amount to string, the string should be pure number, not a scientific notation
                        arg(adjustedAmount.toString(), t.UInt256),
                    ],
                );
                txId = resp.txId;
                keyIndex = resp.index;
            }

            elizaLogger.log(
                `${logPrefix} Sent transaction: ${txId} by KeyIndex[${keyIndex}]`,
            );

            // call the callback with the transaction response
            if (callback) {
                const tokenName = content.token || "FLOW";
                const baseUrl =
                    this.walletSerivce.wallet.network === "testnet"
                        ? "https://testnet.flowscan.io"
                        : "https://flowscan.io";
                const txURL = `${baseUrl}/tx/${txId}/events`;
                callback({
                    text: `${logPrefix} Successfully transferred ${content.amount} ${tokenName} to ${content.to}\nTransaction: [${txId}](${txURL})`,
                    content: {
                        success: true,
                        txid: txId,
                        token: content.token,
                        to: content.to,
                        amount: content.amount,
                    },
                });
            }
        } catch (e: any) {
            elizaLogger.error("Error in sending transaction:", e.message);
            if (callback) {
                callback({
                    text: `${logPrefix} Unable to process transfer request. Error in sending transaction.`,
                    content: {
                        error: e.message,
                    },
                });
            }
            throw e;
        }

        elizaLogger.log("Completed Flow Plugin's SEND_COIN handler.");
    }
}

// Register the transfer action
globalContainer.bind(TransferAction).toSelf();
