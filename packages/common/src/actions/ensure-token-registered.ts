import { inject, injectable } from "inversify";
import { z } from "zod";
import {
    elizaLogger,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@elizaos/core";
import { isCadenceIdentifier, isEVMAddress, type FlowAccountBalanceInfo } from "@elizaos/plugin-flow";
import { property, globalContainer, type ActionOptions } from "@elizaos/plugin-di";
import { BaseFlowInjectableAction, type TransactionCallbacks, type TransactionSentResponse } from "@fixes-ai/core";

import { scripts } from "../assets/scripts.defs";
import { formatFlowSpent, formatTransationSent, formatWalletCreated } from "../formater";
import { transactions } from "../assets/transactions.defs";

/**
 * The generated content for the transfer action
 */
export class Content {
    @property({
        description:
            "Cadence Resource Identifier or ERC20 contract address (if not native token).",
        examples: [
            "For Cadence resource identifier, the field should be 'A.1654653399040a61.ContractName'",
            "For ERC20 contract address, the field should be '0xe6ffc15a5bde7dd33c127670ba2b9fcb82db971a'",
        ],
        schema: z.string(),
    })
    token: string;

    @property({
        description:
            "The blockchain VM type. This field should be either 'flow' or 'evm' according to the token type.",
        examples: [
            "If token field is Cadence resource identifier, the vm field should be 'flow'",
            "If token field is ERC20 contract address, the vm field should be 'evm'",
        ],
        schema: z.string().refine((vm) => ["flow", "evm"].includes(vm)),
    })
    vm: "flow" | "evm";

    @property({
        description:
            "The bridging requirement. If user mentioned the token doesn't need to be bridged, set this field to false. Default is true.",
        examples: [],
        schema: z.boolean().default(true),
    })
    bridging: boolean;
}

/**
 * The transfer action options
 */
const option: ActionOptions<Content> = {
    name: "ENSURE_TOKEN_REGISTERED",
    similes: [
        "ENSURE_NFT_REGISTERED",
        "REGISTER_TOKEN",
        "REGISTER_NFT",
        "REGISTER_FT",
    ],
    description:
        "Call this action to ensure any fungible token/coin or non-fungible token(NFT) be registered in the TokenList on Flow blockchain.",
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Register token A.1654653399040a61.FlowToken, no need to bridge",
                    action: "ENSURE_TOKEN_REGISTERED",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Register token 0xb73bf8e6a4477a952e0338e6cc00cc0ce5ad04ba to Tokenlist",
                    action: "ENSURE_TOKEN_REGISTERED",
                },
            },
        ],
    ],
    contentClass: Content,
    suppressInitialMessage: true,
};

/**
 * Ensure token registered in TokenList
 *
 * @category Actions
 * @description Ensure token registered in TokenList on Flow blockchain
 */
@injectable()
export class EnsureTokenRegisteredAction extends BaseFlowInjectableAction<Content> {
    constructor() {
        super(option);
    }

    /**
     * Validate if the action can be executed
     */
    async validate(_runtime: IAgentRuntime, message: Memory): Promise<boolean> {
        if (!this.walletSerivce.isInitialized) {
            return false;
        }

        const content =
            typeof message.content === "string" ? message.content : message.content?.text;

        if (!content) return false;

        const keywords: string[] = ["token", "register", "tokenlist", "token-list", "nftlist", "nft-list"];
        // Check if the message contains the keywords
        return keywords.some((keyword) => content.toLowerCase().includes(keyword.toLowerCase()));
    }

    /**
     * Execute the action
     *
     * @param content the content from processMessages
     * @param callback the callback function to pass the result to Eliza runtime
     * @returns the transaction response
     */
    async execute(
        content: Content | null,
        runtime: IAgentRuntime,
        message: Memory,
        _state?: State,
        callback?: HandlerCallback,
    ) {
        if (!content) {
            elizaLogger.warn("No content generated");
            return;
        }

        elizaLogger.log(`Starting ${this.name} handler...`);

        const userId = message.userId;
        const isSelf = message.userId === runtime.agentId;
        const mainAddr = this.walletSerivce.address;

        const accountName = `Account[${mainAddr}/${isSelf ? "root" : userId}]`;

        // Check if token is registered
        let isRegistered = false;
        let errorMsg: string | undefined = undefined;
        let address: string;
        let contractName: string;
        if (isCadenceIdentifier(content.token) && content.vm === "flow") {
            const [_, tokenAddr, tokenContractName] = content.token.split(".");
            address = `0x${tokenAddr}`;
            contractName = tokenContractName;

            elizaLogger.debug(
                `${accountName}\n Check A.${tokenAddr}.${tokenContractName} in TokenList...`,
            );

            try {
                isRegistered = await this.walletSerivce.executeScript(scripts.isTokenRegistered, (arg, t) => [
                    arg(address, t.Address),
                    arg(contractName, t.String),
                ], false)
            } catch (e) {
                elizaLogger.error("Error in checking token registration:", e);
                errorMsg = e.message;
            }
        } else if (isEVMAddress(content.token) && content.vm === "evm") {
            elizaLogger.debug(
                `${accountName}\n Check ${content.token} in EVMTokenList...`,
            );
            address = content.token;

            try {
                isRegistered = await this.walletSerivce.executeScript(scripts.isEVMAssetRegistered, (arg, t) => [
                    arg(content.token.toLowerCase(), t.String),
                ], false)
            } catch (e) {
                elizaLogger.error("Error in checking token registration:", e);
                errorMsg = e.message;
            }
        } else {
            errorMsg = `Invalid token format or wrong VM type: ${content.token} (${content.vm})`;
        }

        // if error occurred, return the error message
        if (errorMsg) {
            callback?.({
                text: `Unable to fetch info for ${content.token}.`,
                content: { error: errorMsg },
                source: "FlowBlockchain",
            });
            return;
        }

        if (isRegistered) {
            callback?.({
                text: `Token ${content.token} is already registered in TokenList.`,
                content: { exists: true },
                source: "FlowBlockchain",
            });
            return;
        }

        type RegisterTokenResponse = {
            success: boolean;
            txid: string;
            evmBridged: boolean;
            from: string;
            flowSpent: number;
            gasFeeSpent: number;
        }

        // Register the token
        try {
            const resp = await new Promise<RegisterTokenResponse>((resolve, reject) => {
                const transactionCallbacks: TransactionCallbacks = {
                    onFinalized: async (txId, status, errorMsg) => {
                        if (errorMsg) {
                            reject(new Error(`Error in the creation transaction: ${errorMsg}`));
                            return;
                        }

                        const validEventNames = [
                            'EVMTokenList.EVMBridgedAssetRegistered',
                            'TokenList.FungibleTokenRegistered',
                            'NFTList.NFTCollectionRegistered'
                        ]
                        let fromAddress = "";
                        let flowSpent = 0;
                        let gasFeeSpent = 0;
                        let hasValidEvent = false;
                        let evmBridged = false;
                        for (const evt of status.events) {
                            // check if the transaction has a valid event
                            if (!hasValidEvent) {
                                const [_1, _2, contractName, eventName] = evt.type.split('.');
                                hasValidEvent = validEventNames.includes(`${contractName}.${eventName}`)
                            }
                            // check if the event is FlowToken.TokensWithdrawn from user's account
                            if (evt.type.endsWith('FlowToken.TokensWithdrawn') && evt.data.from !== this.walletSerivce.address) {
                                // calculate the flow spent
                                fromAddress = evt.data.from;
                                flowSpent += Number.parseFloat(evt.data.amount);
                            }
                            // check gas fee spent
                            if (evt.type.endsWith("FlowFees.FeesDeducted")) {
                                gasFeeSpent += Number.parseFloat(evt.data.amount);
                            }
                            // check if the event is FlowEVMBridge.BridgeDefiningContractDeployed
                            if (evt.type.endsWith("FlowEVMBridge.BridgeDefiningContractDeployed")) {
                                evmBridged = true;
                            }
                        }

                        if (hasValidEvent) {
                            elizaLogger.log(`Token registered successfully: ${content.token}`);
                            resolve({
                                success: true,
                                txid: txId,
                                evmBridged,
                                from: fromAddress,
                                flowSpent,
                                gasFeeSpent,
                            });
                        } else {
                            elizaLogger.log(`Failed to register token: ${content.token}, no valid event found.`);
                            resolve({
                                success: false,
                                txid: txId,
                                evmBridged,
                                from: fromAddress,
                                flowSpent,
                                gasFeeSpent,
                            });
                        }
                    },
                }

                // send the transaction to register the token, based on the VM type
                let transaction: Promise<TransactionSentResponse>;

                if (content.vm === "flow") {
                    if (content.bridging) {
                        transaction = this.walletSerivce.sendTransaction(
                            transactions.tlRegisterCadenceAsset,
                            (arg, t) => [
                                arg(address, t.Address),
                                arg(contractName, t.String),
                                arg(userId, t.String),
                            ],
                            transactionCallbacks,
                        );
                    } else {
                        transaction = this.walletSerivce.sendTransaction(
                            transactions.tlRegisterCadenceAssetNoBridge,
                            (arg, t) => [
                                arg(address, t.Address),
                                arg(contractName, t.String),
                            ],
                            transactionCallbacks,
                        )
                    }
                } else {
                    transaction = this.walletSerivce.sendTransaction(
                        transactions.tlRegisterEVMAsset,
                        (arg, t) => [
                            arg(content.token, t.String),
                            arg(userId, t.String),
                        ],
                        transactionCallbacks,
                    )
                }
                // wait for the transaction to be finalized
                transaction.catch((e) => reject(e));
            });
            // format the flow spent information
            const flowSpentInfo = formatFlowSpent(resp.from, resp.flowSpent, this.walletSerivce.address, resp.gasFeeSpent);
            const prefix = `Operator: ${accountName}\n${flowSpentInfo}\n`;
            // return the response to the callback
            const finalMsg = resp.success
                    ? `${prefix}\n  Token ${content.token} registered successfully.`
                    : resp.evmBridged
                        ? `${prefix}\n  Token has just bridged from EVM side, you need send another transaction to register it in TokenList.`
                        : `${prefix}\n  Failed to register token, no valid event found.`;
            callback?.({
                text: formatTransationSent(resp.txid, this.walletSerivce.connector.network, finalMsg),
                content: resp,
                source: "FlowBlockchain",
            });
        } catch (e) {
            callback?.({
                text: `Operator: ${accountName}\n Failed to register token, Error: ${e.message}`,
                content: { error: e.message },
                source: "FlowBlockchain",
            });
        }

        elizaLogger.log(`Finished ${this.name} handler.`);
    }
}

// Register the transfer action
globalContainer.bind(EnsureTokenRegisteredAction).toSelf();
