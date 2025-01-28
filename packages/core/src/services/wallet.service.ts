import { injectable, inject } from "inversify";
import {
    elizaLogger,
    Service,
    ServiceType,
    type IAgentRuntime,
} from "@elizaos/core";
import type { FlowConnector, FlowWalletProvider } from "@elizaos/plugin-flow";
import { globalContainer } from "@elizaos/plugin-di";
import * as fcl from "@onflow/fcl";
import type {
    ArgumentFunction,
    TransactionCallbacks,
    TransactionTrackingPayload,
} from "../types";
import { WalletProvider, ConnectorProvider } from "../providers";

// Add SAMPLE to ServiceType enum in types.ts
declare module "@elizaos/core" {
    export enum ServiceType {
        FLOW_WALLET = "flow-wallet",
    }
}

/**
 * Wallet provider
 */
@injectable()
export class FlowWalletService extends Service {
    private static isInitialized = false;

    private _runtime: IAgentRuntime | null = null;
    private _connector: FlowConnector;
    private _wallet: FlowWalletProvider;
    private _maxKeyIndex: number;

    private readonly keysInUse = new Set<number>();
    private readonly keysTrackingPayloads = new Map<
        number,
        TransactionTrackingPayload
    >();

    constructor(
        @inject(ConnectorProvider)
        private readonly connectorProvider: ConnectorProvider,
        @inject(WalletProvider)
        private readonly walletProvider: WalletProvider,
    ) {
        super();
    }

    static get serviceType(): ServiceType {
        return ServiceType.FLOW_WALLET;
    }

    async initialize(runtime: IAgentRuntime): Promise<void> {
        // Verify if the service is already initialized
        if (FlowWalletService.isInitialized) {
            return;
        }

        this._runtime = runtime;
        this._wallet = await this.walletProvider.getInstance(runtime);
        this._connector = await this.connectorProvider.getInstance(runtime);

        // Set the account key index
        const acctInfo = await this._connector.getAccount(this._wallet.address);
        this._maxKeyIndex = acctInfo.keys.length;

        FlowWalletService.isInitialized = true;
        elizaLogger.info("FlowWalletService initialized");
    }

    /**
     * Get the Flow connector
     */
    get connector() {
        return this._connector;
    }

    /**
     * Get the wallet provider
     */
    get wallet() {
        return this._wallet;
    }

    /**
     * Get the wallet address
     */
    get address() {
        return this._wallet.address;
    }

    /**
     * Get maximum key index of the wallet
     */
    get maxKeyIndex() {
        return this._maxKeyIndex;
    }

    /// ----- User methods -----

    /**
     * Execute a script with available account key index of the wallet
     * @param code
     * @param argsFunc
     * @param defaultValue
     * @returns
     */
    async executeScript(
        code: string,
        argsFunc: ArgumentFunction,
        defaultValue: any,
    ) {
        return await this._wallet.executeScript(code, argsFunc, defaultValue);
    }

    /**
     * Send transction with available account key index of the wallet
     * @param code
     * @param argsFunc
     * @returns
     */
    async sendTransaction(
        code: string,
        argsFunc: ArgumentFunction,
        callbacks?: TransactionCallbacks,
    ): Promise<{ txId: string; index: number }> {
        const index = await this.acquireAndLockIndex();
        if (index < 0) {
            throw new Error(
                "No available account key index to send transaction",
            );
        }

        // use availalbe index and default private key
        try {
            const txId = await this._wallet.sendTransaction(
                code,
                argsFunc,
                this._wallet.buildAuthorization(index),
            );
            if (txId) {
                // Start transaction tracking
                await this.startTransactionTrackingSubstribe(
                    index,
                    txId,
                    callbacks,
                );
            }
            return { txId, index };
        } catch (error) {
            // Acknowledge and unlock the account key index
            await this.ackAndUnlockIndex(index);
            throw error;
        }
    }

    /// ----- Internal methods -----

    /**
     * Start the service
     */
    private async startTransactionTrackingSubstribe(
        index: number,
        txid: string,
        callbacks?: TransactionCallbacks,
    ) {
        // Clear any existing interval
        if (this.keysTrackingPayloads.has(index)) {
            const payload = this.keysTrackingPayloads.get(index);
            // unsubscribe
            payload.unsubscribe();
            // remove the tracking payload
            this.keysTrackingPayloads.delete(index);
            // Acknowledge and unlock the account key index
            await this.ackAndUnlockIndex(index);
        }
        elizaLogger.info(
            `FlowWalletService: Starting transaction tracking task for txid: ${txid}`,
        );

        let isFinalizedSent = false;
        const unsub = fcl.tx(txid).subscribe((res) => {
            // update the status
            callbacks?.onStatusUpdated?.(txid, res);

            if (res.status >= 3) {
                if (!isFinalizedSent) {
                    // callback on finalized
                    callbacks?.onFinalized?.(txid, res, res.errorMessage);
                    isFinalizedSent = true;
                    // Acknowledge and unlock the account key index
                    this.ackAndUnlockIndex(index);
                }

                if (res.status >= 4) {
                    // callback on sealed
                    callbacks?.onSealed?.(txid, res, res.errorMessage);
                    // unsubscribe
                    unsub();
                    // remove the tracking payload
                    this.keysTrackingPayloads.delete(index);
                    elizaLogger.info(
                        `FlowWalletService: Transaction tracking task completed for txid: ${txid}`,
                    );
                }
            }
        });

        // set to the tracking payload
        this.keysTrackingPayloads.set(index, {
            txId: txid,
            unsubscribe: unsub,
        });
    }

    /**
     * Acquire and lock an available account key index
     * @returns
     */
    private async acquireAndLockIndex(): Promise<number> {
        for (let i = 0; i < this._maxKeyIndex; i++) {
            if (!this.keysInUse.has(i)) {
                this.keysInUse.add(i);
                return i;
            }
        }
        return -1;
    }

    /**
     * Acknowledge and unlock an account key index
     * @param index
     */
    private async ackAndUnlockIndex(index: number) {
        if (
            index >= 0 &&
            index < this._maxKeyIndex &&
            this.keysInUse.has(index)
        ) {
            this.keysInUse.delete(index);
        }
    }
}

// Register the provider with the global container
globalContainer.bind(FlowWalletService).toSelf().inSingletonScope();
