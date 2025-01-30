import { injectable, inject } from "inversify";
import {
    elizaLogger,
    Service,
    ServiceType,
    type IAgentRuntime,
} from "@elizaos/core";
import type { FlowAccountBalanceInfo } from "@elizaos/plugin-flow";
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
        return ServiceType.ACCOUNTS_POOL;
    }

    async initialize(_runtime: IAgentRuntime): Promise<void> {
        // ensure agent account initialized
        const status = await this.getMainAccountStatus();
        if (!status) {
            // Register the main account
            await new Promise<void>((resolve, reject) => {
                this.walletService.sendTransaction(
                    transactions.initAgentAccount,
                    (_arg, _t) => [],
                    {
                        onFinalized: async (txid, _status, errorMsg) => {
                            if (errorMsg) {
                                elizaLogger.error(
                                    `Failed to initialize main account: ${errorMsg}`,
                                );
                                reject(new Error(errorMsg));
                            } else {
                                elizaLogger.info("Main account initialized by txid:", txid);
                                resolve();
                            }
                        },
                    }
                ).catch(reject);
            });
        }
        elizaLogger.info("AccountsPoolService initialized");
    }

    // ----- Customized methods -----

    /**
     * Get the main address of the wallet
     */
    get mainAddress(): string {
        return this.walletService.address;
    }

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
                    balance: parseFloat(obj.balance),
                    childrenAmount: parseInt(obj.childrenAmount),
                };
            }
        } catch (error) {
            elizaLogger.error(
                `Failed to query account status from ${walletAddress}`,
                error,
            );
            throw error;
        }
        return undefined;
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
                    balance: parseFloat(obj.balance),
                    coaAddress: obj.coaAddress,
                    coaBalance: obj.coaBalance ? parseFloat(obj.coaBalance) : 0,
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
                arg(
                    initalFunding ? initalFunding.toFixed(8) : null,
                    t.Optional(t.UFix64),
                ),
            ],
            callbacks,
        );
    }
}

// Register the provider with the global container
globalContainer.bind(AccountsPoolService).toSelf().inSingletonScope();
