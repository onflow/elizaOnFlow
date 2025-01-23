import { injectable, inject } from "inversify";
import {
    elizaLogger,
    type IAgentRuntime,
    type Memory,
    type Provider,
    type State,
} from "@elizaos/core";
import { FlowWalletProvider } from "@elizaos/plugin-flow";
import type { InjectableProvider } from "@elizaos/plugin-di";
import { ConnectorProvider } from "./connector";

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
        state?: State
    ): Promise<string | null> {
        // For one session, only inject the wallet info once
        if (state) {
            const WALLET_PROVIDER_SESSION_FLAG = "wallet-provider-session";
            if (state[WALLET_PROVIDER_SESSION_FLAG]) {
                return null;
            }
            state[WALLET_PROVIDER_SESSION_FLAG] = true;
        }

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
