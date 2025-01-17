import { inject, injectable, unmanaged } from "inversify";
import type { ScriptQueryResponse } from "./types";
import {
    composeContext,
    elizaLogger,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
} from "@elizaos/core";
import { TransactionResponse, validateFlowConfig } from "@elizaos/plugin-flow";
import { ActionOptions, BaseInjectableAction } from "@elizaos/plugin-di";
import { ConnectorProvider, WalletProvider } from "./providers";

/**
 * Base abstract class for injectable actions
 */
@injectable()
export abstract class BaseFlowInjectableAction<
    T,
> extends BaseInjectableAction<T> {
    // -------- Injects --------

    // Inject the connector provider
    @inject(ConnectorProvider)
    public readonly connector: ConnectorProvider;
    // Inject the wallet provider
    @inject(WalletProvider)
    public readonly wallet: WalletProvider;

    /**
     * Constructor for the base injectable action
     */
    constructor(@unmanaged() opts: ActionOptions<T>) {
        super(opts);
    }

    // -------- Abstract methods to be implemented by the child class --------

    /**
     * Abstract method to execute the action
     * @param content The content object
     * @param callback The callback function to pass the result to Eliza runtime
     */
    abstract execute(
        content: T | null,
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        callback?: HandlerCallback
    ): Promise<TransactionResponse | ScriptQueryResponse | null>;

    // -------- Implemented methods for Eliza runtime --------

    /**
     * Default implementation of the validate method
     * You can override this method to add custom validation logic
     *
     * @param runtime The runtime object from Eliza framework
     * @param message The message object from Eliza framework
     * @param state The state object from Eliza framework
     * @returns The validation result
     */
    async validate(
        runtime: IAgentRuntime,
        _message: Memory,
        _state?: State
    ): Promise<boolean> {
        // Validate the Flow environment configuration
        await validateFlowConfig(runtime);

        const walletIns = await this.wallet.getInstance(runtime);
        // You need to ensure that the wallet is valid
        try {
            await walletIns.syncAccountInfo();
        } catch {
            elizaLogger.error("Failed to sync account info");
            return false;
        }
        return true;
    }

    /**
     * Default implementation of the preparation of action context
     * You can override this method to add custom logic
     */
    protected async prepareActionContext(
        runtime: IAgentRuntime,
        message: Memory,
        state: State
    ): Promise<string> {
        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        // Get wallet info for context, no state update
        const walletInfo = await this.wallet.get(runtime, message);
        state.walletInfo = walletInfo;

        // Compose context
        return composeContext({ state, template: this.template });
    }

    /**
     * Default Handler function type for processing messages
     * You can override this method to add custom logic
     *
     * @param runtime The runtime object from Eliza framework
     * @param message The message object from Eliza framework
     * @param state The state object from Eliza framework
     * @param options The options object from Eliza framework
     * @param callback The callback function to pass the result to Eliza runtime
     */
    async handler(
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        options?: Record<string, unknown>,
        callback?: HandlerCallback
    ): Promise<any | null> {
        const res = await super.handler(
            runtime,
            message,
            state,
            options,
            callback
        );
        if (res) {
            if (isScriptQueryResponse(res)) {
                if (res.ok) {
                    elizaLogger.log(
                        `Action executed with script query successfully with data: `,
                        JSON.stringify(res.data)
                    );
                } else {
                    elizaLogger.error(
                        `Action executed with script query failed: `,
                        res.errorMessage ?? res.error ?? "Unknown error"
                    );
                }
            } else {
                elizaLogger.log(
                    `Action executed with transaction: ${res.signer.address}[${res.signer.keyIndex}] - ${res.txid}`
                );
            }
        }
    }
}

function isScriptQueryResponse(res: any): res is ScriptQueryResponse {
    return (
        res &&
        typeof res === "object" &&
        "ok" in res &&
        typeof res.ok === "boolean"
    );
}
