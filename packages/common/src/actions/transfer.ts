import { z } from "zod";
import { injectable } from "inversify";
import {
    elizaLogger,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
} from "@elizaos/core";
import {
    isCadenceIdentifier,
    isEVMAddress,
    queries,
    transactions,
    TransactionResponse,
} from "@elizaos/plugin-flow";
import {
    ActionOptions,
    BaseInjactableAction,
    globalContainer,
    property,
} from "@fixes-ai/core";

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
            "Recipient wallet address, can be EVM address or Cadence address",
        examples: [
            "For Cadence address: '0x1654653399040a61'",
            "For EVM address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'",
        ],
        schema: z.string(),
    })
    to: string;

    @property({
        description:
            "Boolean value indicating if field 'token' matches the field 'to' or not",
        examples: [
            "if field 'token' is 'null' or Cadence resource identifier, field 'to' can be EVM address or Cadence address, so the value of 'matched' should be true",
            "if field 'token' is ERC20 contract address, field 'to' should be EVM address, so the value of 'matched' should be true, otherwise false",
        ],
        schema: z.boolean(),
    })
    matched: boolean;
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
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Sending 1 FLOW tokens now, pls wait...",
                    action: "SEND_COIN",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Send 1 FLOW - A.1654653399040a61.FlowToken to 0xa2de93114bae3e73",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Sending 1 FLOW tokens now, pls wait...",
                    action: "SEND_COIN",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Send 1000 FROTH - 0xb73bf8e6a4477a952e0338e6cc00cc0ce5ad04ba to 0x000000000000000000000002e44fbfbd00395de5",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Sending 1000 FROTH tokens now, pls wait...",
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
export class TransferAction extends BaseInjactableAction<TransferContent> {
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
        state?: State
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
        content: TransferContent,
        runtime: IAgentRuntime,
        _message: Memory,
        _state?: State,
        callback?: HandlerCallback
    ): Promise<TransactionResponse | null> {
        elizaLogger.log("Starting Flow Plugin's SEND_COIN handler...");

        // Use shared wallet instance
        const walletIns = await this.wallet.getInstance(runtime);
        // FIXME: We need to use dynamic key index
        const keyIndex = 0;

        const resp: TransactionResponse = {
            signer: {
                address: walletIns.address,
                keyIndex: keyIndex,
            },
            txid: "",
        };
        const logPrefix = `Address: ${resp.signer.address}, using keyIdex: ${resp.signer.keyIndex}\n`;

        // Parsed fields
        const recipient = content.to;
        const amount =
            typeof content.amount === "number"
                ? content.amount
                : parseFloat(content.amount);

        // Check if the wallet has enough balance to transfer
        const accountInfo = await queries.queryAccountBalanceInfo(
            walletIns,
            walletIns.address
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

        try {
            // Execute transfer
            const authz = walletIns.buildAuthorization(keyIndex);

            // For different token types, we need to handle the token differently
            if (!content.token) {
                elizaLogger.log(
                    `${logPrefix} Sending ${amount} FLOW to ${recipient}...`
                );
                // Transfer FLOW token
                resp.txid = await walletIns.sendTransaction(
                    transactions.mainFlowTokenDynamicTransfer,
                    (arg, t) => [
                        arg(recipient, t.String),
                        arg(amount.toFixed(1), t.UFix64),
                    ],
                    authz
                );
            } else if (isCadenceIdentifier(content.token)) {
                // Transfer Fungible Token on Cadence side
                const [_, tokenAddr, tokenContractName] =
                    content.token.split(".");
                elizaLogger.log(
                    `${logPrefix} Sending ${amount} A.${tokenAddr}.${tokenContractName} to ${recipient}...`
                );
                resp.txid = await walletIns.sendTransaction(
                    transactions.mainFTGenericTransfer,
                    (arg, t) => [
                        arg(amount.toFixed(1), t.UFix64),
                        arg(recipient, t.Address),
                        arg("0x" + tokenAddr, t.Address),
                        arg(tokenContractName, t.String),
                    ],
                    authz
                );
            } else if (isEVMAddress(content.token)) {
                // Transfer ERC20 token on EVM side
                // we need to update the amount to be in the smallest unit
                const decimals = await queries.queryEvmERC20Decimals(
                    walletIns,
                    content.token
                );
                const adjustedAmount = BigInt(amount * Math.pow(10, decimals));

                elizaLogger.log(
                    `${logPrefix} Sending ${adjustedAmount} ${content.token}(EVM) to ${recipient}...`
                );

                resp.txid = await walletIns.sendTransaction(
                    transactions.mainEVMTransferERC20,
                    (arg, t) => [
                        arg(content.token, t.String),
                        arg(recipient, t.String),
                        // Convert the amount to string, the string should be pure number, not a scientific notation
                        arg(adjustedAmount.toString(), t.UInt256),
                    ],
                    authz
                );
            }

            elizaLogger.log(`${logPrefix} Sent transaction: ${resp.txid}`);

            // call the callback with the transaction response
            if (callback) {
                const tokenName = content.token || "FLOW";
                const baseUrl =
                    walletIns.network === "testnet"
                        ? "https://testnet.flowscan.io"
                        : "https://flowscan.io";
                const txURL = `${baseUrl}/tx/${resp.txid}/events`;
                callback({
                    text: `${logPrefix} Successfully transferred ${content.amount} ${tokenName} to ${content.to}\nTransaction: [${resp.txid}](${txURL})`,
                    content: {
                        success: true,
                        txid: resp.txid,
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

        return resp;
    }
}

// Register the transfer action
globalContainer.bind(TransferAction).toSelf();
