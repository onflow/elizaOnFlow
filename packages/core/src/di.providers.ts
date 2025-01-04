import { injectable, inject } from "inversify";
import {
    elizaLogger,
    IAgentRuntime,
    Memory,
    Provider,
    State,
} from "@elizaos/core";
import {
    FlowConnector,
    getFlowConnectorInstance,
    FlowWalletProvider,
} from "@elizaos/plugin-flow";
import { CONSTANTS } from "./symbols";
import { InjectableProvider } from "./interfaces";

/**
 * Connector provider
 */
@injectable()
export class ConnectorProvider
    implements Provider, InjectableProvider<FlowConnector>
{
    private _connector: FlowConnector;

    /**
     * Initialize the Flow connector provider
     * @param flowJSON The Flow JSON object
     */
    constructor(
        @inject(CONSTANTS.FlowJSON)
        private readonly flowJSON: Record<string, unknown>
    ) {}

    /**
     * Get the Flow connector instance
     * @param runtime The runtime object from Eliza framework
     */
    async getInstance(runtime: IAgentRuntime): Promise<FlowConnector> {
        if (!this._connector) {
            this._connector = await getFlowConnectorInstance(
                runtime,
                this.flowJSON
            );
        }
        return this._connector;
    }

    /**
     * Get the connector status
     * @param runtime The runtime object from Eliza framework
     */
    async getConnectorStatus(runtime: IAgentRuntime): Promise<string> {
        const instance = await this.getInstance(runtime);
        let output = `Now user<${runtime.character.name}> connected to\n`;
        output += `Flow network: ${instance.network}\n`;
        output += `Flow Endpoint: ${instance.rpcEndpoint}\n`;
        return output;
    }

    /**
     * Eliza provider `get` method
     * @returns The message to be injected into the context
     */
    async get(
        runtime: IAgentRuntime,
        _message: Memory,
        _state?: State
    ): Promise<string | null> {
        try {
            return await this.getConnectorStatus(runtime);
        } catch (error) {
            elizaLogger.error(
                "Error in Flow connector provider:",
                error.message
            );
            return null;
        }
    }
}

/**
 * Wallet provider
 */
@injectable()
export class WalletProvider
    implements Provider, InjectableProvider<FlowWalletProvider>
{
    private _wallet: FlowWalletProvider;

    constructor(
        @inject(ConnectorProvider)
        private readonly connector: ConnectorProvider
    ) {}

    /**
     * Get the Flow wallet instance
     * @param runtime The runtime object from Eliza framework
     */
    async getInstance(runtime: IAgentRuntime): Promise<FlowWalletProvider> {
        if (!this._wallet) {
            const connectorIns = await this.connector.getInstance(runtime);
            this._wallet = new FlowWalletProvider(runtime, connectorIns);
        }
        return this._wallet;
    }

    /**
     * Eliza provider `get` method
     * @returns The message to be injected into the context
     */
    async get(
        runtime: IAgentRuntime,
        _message: Memory,
        _state?: State
    ): Promise<string | null> {
        // Check if the user has an Flow wallet
        if (
            !runtime.getSetting("FLOW_ADDRESS") ||
            !runtime.getSetting("FLOW_PRIVATE_KEY")
        ) {
            elizaLogger.error(
                "FLOW_ADDRESS or FLOW_PRIVATE_KEY not configured, skipping wallet injection"
            );
            return null;
        }

        try {
            const walletProvider = await this.getInstance(runtime);
            const info = await walletProvider.queryAccountBalanceInfo();
            if (!info || info?.address !== walletProvider.address) {
                elizaLogger.error("Invalid account info");
                return null;
            }
            let output = `Here is user<${runtime.character.name}>'s wallet status:\n`;
            output += `Flow wallet address: ${walletProvider.address}\n`;
            output += `FLOW balance: ${info.balance} FLOW\n`;
            output += `Flow wallet's COA(EVM) address: ${info.coaAddress || "unknown"}\n`;
            output += `FLOW balance in COA(EVM) address: ${info.coaBalance ?? 0} FLOW`;
            return output;
        } catch (error) {
            elizaLogger.error("Error in Flow wallet provider:", error.message);
            return null;
        }
    }
}
