import { inject, injectable, unmanaged } from "inversify";
import type { ScriptQueryResponse } from "./types";
import {
    composeContext,
    elizaLogger,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@elizaos/core";
import { type TransactionResponse, validateFlowConfig } from "@elizaos/plugin-flow";
import { type ActionOptions, BaseInjectableAction } from "@elizaos/plugin-di";
import { FlowWalletService } from "./services";
import { WalletProvider } from "./providers";

/**
 * Base abstract class for injectable actions
 */
@injectable()
export abstract class BaseFlowInjectableAction<T> extends BaseInjectableAction<T> {
    // -------- Injects --------

    @inject(WalletProvider)
    public readonly walletElizaProvider: WalletProvider;
    // Inject the Flow wallet serivce
    @inject(FlowWalletService)
    public readonly walletSerivce: FlowWalletService;

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
        callback?: HandlerCallback,
    ): Promise<unknown | null>;

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
    async validate(runtime: IAgentRuntime, _message: Memory, _state?: State): Promise<boolean> {
        // Validate the Flow environment configuration
        await validateFlowConfig(runtime);

        // You need to ensure that the wallet is valid
        try {
            await this.walletSerivce.wallet.getWalletBalance();
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
        state: State,
    ): Promise<string> {
        // Initialize or update state
        let currentState: State;
        if (!state) {
            currentState = (await runtime.composeState(message)) as State;
        } else {
            currentState = await runtime.updateRecentMessageState(state);
        }

        // Get wallet info for context, no state update
        const walletInfo = await this.walletElizaProvider.get(runtime, message);
        state.walletInfo = walletInfo;

        // Compose context
        return composeContext({ state: currentState, template: this.template });
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
        callback?: HandlerCallback,
    ) {
        const res = await super.handler(runtime, message, state, options, callback);
        if (res) {
            if (isScriptQueryResponse(res)) {
                if (res.ok) {
                    elizaLogger.log(
                        "Action executed with script query successfully with data: ",
                        JSON.stringify(res.data),
                    );
                } else {
                    elizaLogger.error(
                        "Action executed with script query failed: ",
                        res.errorMessage ?? res.error ?? "Unknown error",
                    );
                }
            } else {
                const { signer, txid } = res as TransactionResponse;
                elizaLogger.log(
                    `Action executed with transaction: ${signer.address}[${signer.keyIndex}] - ${txid}`,
                );
            }
        }
    }
}

function isScriptQueryResponse(res: unknown): res is ScriptQueryResponse {
    return res && typeof res === "object" && "ok" in res && typeof res.ok === "boolean";
}
