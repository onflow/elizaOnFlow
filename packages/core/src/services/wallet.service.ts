import { injectable, inject } from "inversify";
import {
    elizaLogger,
    Service,
    ServiceType,
    type IAgentRuntime,
} from "@elizaos/core";
import type { FlowConnector, FlowWalletProvider } from "@elizaos/plugin-flow";
import { globalContainer } from "@elizaos/plugin-di";
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
    private _connector: FlowConnector;
    private _wallet: FlowWalletProvider;
    private _maxKeyIndex: number;

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

        // Initialize the wallet provider
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

    /// ----- User defined methods -----
}

// Register the provider with the global container
globalContainer.bind(FlowWalletService).toSelf().inSingletonScope();
