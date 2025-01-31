import { injectable, inject } from "inversify";
import { elizaLogger, Service, type ServiceType, type IAgentRuntime } from "@elizaos/core";
import { queries as defaultQueries, type FlowAccountBalanceInfo } from "@elizaos/plugin-flow";
import { globalContainer } from "@elizaos/plugin-di";
import {
    FlowWalletService,
    type TransactionCallbacks,
    type TransactionSentResponse,
} from "@fixes-ai/core";

import { scripts } from "../assets/scripts.defs";
import { transactions } from "../assets/transactions.defs";

// Add SAMPLE to ServiceType enum in types.ts
declare module "@elizaos/core" {
    export enum ServiceType {
        ACCOUNTS_POOL = "accounts-pool",
    }
}

/**
 * Wallet provider
 */
@injectable()
export class AccountsPoolService extends Service {
    constructor(
        @inject(FlowWalletService)
        private readonly walletService: FlowWalletService,
    ) {
        super();
    }

    static get serviceType(): ServiceType {
        return "accounts-pool" as ServiceType.ACCOUNTS_POOL;
    }

    async initialize(_runtime: IAgentRuntime): Promise<void> {
        // ensure agent account initialized
        const status = await this.getMainAccountStatus();
        if (!status) {
            // Register the main account
            await new Promise<void>((resolve, reject) => {
                this.walletService
                    .sendTransaction(transactions.initAgentAccount, (_arg, _t) => [], {
                        onFinalized: async (txid, _status, errorMsg) => {
                            if (errorMsg) {
                                elizaLogger.error(`Failed to initialize main account: ${errorMsg}`);
                                reject(new Error(errorMsg));
                            } else {
                                elizaLogger.info("Main account initialized by txid:", txid);
                                resolve();
                            }
                        },
                    })
                    .catch(reject);
            });
        }
    }

    // ----- Customized methods -----

    /**
     * Get the main address of the wallet
     */
    get mainAddress(): string {
        return this.walletService.address;
    }

    // ----- Flow blockchain READ scripts -----

    /**
     * Get the main account status
     */
    async getMainAccountStatus() {
        const walletAddress = this.walletService.address;
        try {
            const obj = await this.walletService.executeScript(
                scripts.getAccountStatus,
                (arg, t) => [arg(walletAddress, t.Address)],
                undefined,
            );
            if (obj) {
                return {
                    address: obj.address,
                    balance: Number.parseFloat(obj.balance),
                    childrenAmount: Number.parseInt(obj.childrenAmount),
                };
            }
        } catch (error) {
            elizaLogger.error(`Failed to query account status from ${walletAddress}`, error);
            throw error;
        }
        return undefined;
    }

    /**
     * Check if the address is a child of the agent
     * @param address
     */
    async checkAddressIsChildOfAgent(address: string): Promise<boolean> {
        const walletAddress = this.walletService.address;
        try {
            return await this.walletService.executeScript(
                scripts.isAddressChildOf,
                (arg, t) => [arg(walletAddress, t.Address), arg(address, t.Address)],
                false,
            );
        } catch (error) {
            elizaLogger.error(`Failed to check if address ${address} is child of agent`, error);
        }
        return false;
    }

    /**
     * Query account info
     * @param userId
     * @returns
     */
    async queryAccountInfo(
        userId: string = undefined,
    ): Promise<FlowAccountBalanceInfo | undefined> {
        const walletAddress = this.walletService.address;
        try {
            const obj = await this.walletService.executeScript(
                scripts.getAccountInfoFrom,
                (arg, t) => [
                    arg(walletAddress, t.Address),
                    arg(userId ?? null, t.Optional(t.String)),
                ],
                undefined,
            );
            if (obj) {
                return {
                    address: obj.address,
                    balance: Number.parseFloat(obj.balance),
                    coaAddress: obj.coaAddress,
                    coaBalance: obj.coaBalance ? Number.parseFloat(obj.coaBalance) : 0,
                };
            }
        } catch (error) {
            elizaLogger.error(
                `Failed to query account info for ${userId ?? "root"} from ${walletAddress}`,
                error,
            );
            throw error;
        }
        return undefined;
    }

    // ----- Flow blockchain WRITE transactions -----

    /**
     * Create a new account
     * @param userId
     * @returns
     */
    async createNewAccount(
        userId: string,
        callbacks?: TransactionCallbacks,
        initalFunding?: number,
    ): Promise<TransactionSentResponse> {
        return await this.walletService.sendTransaction(
            transactions.acctPoolCreateChildAccount,
            (arg, t) => [
                arg(userId, t.String),
                arg(initalFunding ? initalFunding.toFixed(8) : null, t.Optional(t.UFix64)),
            ],
            callbacks,
        );
    }

    /**
     * Transfer FlowToken to another account from the user's account
     * @param fromUserId
     */
    async transferFlowToken(
        fromUserId: string,
        recipient: string,
        amount: number,
        callbacks?: TransactionCallbacks,
    ): Promise<TransactionSentResponse> {
        return await this.walletService.sendTransaction(
            transactions.acctPoolFlowTokenDynamicTransfer,
            (arg, t) => [
                arg(recipient, t.String),
                arg(amount.toFixed(8), t.UFix64),
                arg(fromUserId, t.Optional(t.String)),
            ],
            callbacks,
        );
    }

    /**
     * Transfer Cadence Generic FT to another account from the user's account
     * @param fromUserId
     * @param recipient
     * @param amount
     * @param tokenFTAddr
     * @param tokenContractName
     * @param callbacks
     */
    async transferGenericFT(
        fromUserId: string,
        recipient: string,
        amount: number,
        tokenFTAddr: string,
        tokenContractName: string,
        callbacks?: TransactionCallbacks,
    ): Promise<TransactionSentResponse> {
        return await this.walletService.sendTransaction(
            transactions.acctPoolFTGenericTransfer,
            (arg, t) => [
                arg(amount.toFixed(8), t.UFix64),
                arg(recipient, t.Address),
                arg(tokenFTAddr, t.Address),
                arg(tokenContractName, t.String),
                arg(fromUserId, t.Optional(t.String)),
            ],
            callbacks,
        );
    }

    /**
     * Transfer ERC20 token to another account from the user's account
     * @param fromUserId
     * @param recipient
     * @param amount
     * @param callback
     */
    async transferERC20(
        fromUserId: string,
        recipient: string,
        amount: number,
        erc20Contract: string,
        callbacks?: TransactionCallbacks,
    ): Promise<TransactionSentResponse> {
        // Transfer ERC20 token on EVM side
        // we need to update the amount to be in the smallest unit
        const decimals = await defaultQueries.queryEvmERC20Decimals(
            this.walletService.wallet,
            erc20Contract,
        );
        const adjustedAmount = BigInt(amount * 10 ** decimals);
        return await this.walletService.sendTransaction(
            transactions.acctPoolEVMTransferERC20,
            (arg, t) => [
                arg(erc20Contract, t.String),
                arg(recipient, t.String),
                arg(adjustedAmount.toString(), t.UInt256),
                arg(fromUserId, t.Optional(t.String)),
            ],
            callbacks,
        );
    }
}

// Register the provider with the global container
globalContainer.bind(AccountsPoolService).toSelf().inSingletonScope();
