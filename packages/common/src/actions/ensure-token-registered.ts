import { inject, injectable } from "inversify";
import { z } from "zod";
import {
    elizaLogger,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@elizaos/core";
import type { FlowAccountBalanceInfo } from "@elizaos/plugin-flow";
import { property, globalContainer, type ActionOptions } from "@elizaos/plugin-di";
import { BaseFlowInjectableAction, FlowWalletService, type TransactionSentResponse } from "@fixes-ai/core";

import { formatWalletCreated, formatWalletInfo } from "../formater";
import { AccountsPoolService } from "../services/acctPool.service";

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
        schema: z.string().nullable(),
    })
    token: string | null;

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
                    text: "Register token A.1654653399040a61.FlowToken",
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
    constructor(
        @inject(AccountsPoolService)
        private readonly acctPoolService: AccountsPoolService,
    ) {
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

        // let acctInfo: FlowAccountBalanceInfo;
        // try {
        //     elizaLogger.debug("Querying account info for", accountName);
        //     acctInfo = await this.acctPoolService.queryAccountInfo(isSelf ? null : userId);
        // } catch (e) {
        //     elizaLogger.error("Error:", e);
        //     callback?.({
        //         text: `Unable to fetch info for ${accountName}.`,
        //         content: { error: e.message },
        //         source: "FlowBlockchain",
        //     });
        //     return;
        // }

        // if (acctInfo) {
        //     callback?.({
        //         text: formatWalletInfo(message.userId, accountName, acctInfo),
        //         content: { exists: true },
        //         source: "FlowBlockchain",
        //     });
        //     return;
        // }

        // // create a new account by sendinng transaction
        // type TransactionResponse = {
        //     txId: string;
        //     keyIndex: number;
        //     address: string;
        // };

        // try {
        //     const resp = await new Promise<TransactionResponse>((resolve, reject) => {
        //         let txResp: TransactionSentResponse;
        //         this.acctPoolService
        //             .createNewAccount(userId, {
        //                 onFinalized: async (txId, status, errorMsg) => {
        //                     if (errorMsg) {
        //                         reject(new Error(`Error in the creation transaction: ${errorMsg}`));
        //                         return;
        //                     }
        //                     const addressCreateEvt = status.events.find(
        //                         (e) => e.type === "flow.AccountCreated",
        //                     );
        //                     if (addressCreateEvt) {
        //                         const address = addressCreateEvt.data.address;
        //                         elizaLogger.log(`Account created for ${userId} at ${address}`);
        //                         resolve({
        //                             txId: txResp?.txId ?? txId,
        //                             keyIndex: txResp?.index,
        //                             address: address,
        //                         });
        //                     } else {
        //                         reject(new Error("No account created event found."));
        //                     }
        //                 },
        //             })
        //             .then((tx) => {
        //                 txResp = tx;
        //             })
        //             .catch((e) => reject(e));
        //     });
        //     callback?.({
        //         text: formatWalletCreated(message.userId, accountName, resp.address),
        //         content: resp,
        //         source: "FlowBlockchain",
        //     });
        // } catch (e) {
        //     callback?.({
        //         text: `Failed to create account for ${accountName}, maybe the account already exists.`,
        //         content: { error: e.message },
        //         source: "FlowBlockchain",
        //     });
        // }

        elizaLogger.log(`Finished ${this.name} handler.`);
    }
}

// Register the transfer action
globalContainer.bind(EnsureTokenRegisteredAction).toSelf();
