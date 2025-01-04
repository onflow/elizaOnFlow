import { inject, injectable, unmanaged } from "inversify";
import { ZodSchema } from "zod";
import { InjactableAction, ScriptQueryResponse } from "./interfaces";
import {
    ActionExample,
    composeContext,
    elizaLogger,
    generateObjectArray,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
} from "@elizaos/core";
import { TransactionResponse, validateFlowConfig } from "@elizaos/plugin-flow";
import { ConnectorProvider, WalletProvider } from "./providers";

/**
 * Base abstract class for injectable actions
*/
@injectable()
export abstract class BaseInjactableAction<T> implements InjactableAction<T> {
    /** -------- Injects -------- */
    // Inject the connector provider
    @inject(ConnectorProvider) protected connector: ConnectorProvider;
    // Inject the wallet provider
    @inject(WalletProvider) protected wallet: WalletProvider;

    /** -------- Properties -------- */

    /**
     * Constructor for the base injectable action
     */
    constructor(
        @unmanaged() public name: string,
        @unmanaged() public similes: string[],
        @unmanaged() public description: string,
        @unmanaged() public examples: ActionExample[][],
        /**
         * The template for processing messages
         */
        @unmanaged() private template: string,
        /**
         * The schema of processed content from the template
         */
        @unmanaged() private contentSchema: ZodSchema<T>,
        @unmanaged() public suppressInitialMessage: boolean = false
    ) {}

    /**  -------- Abstract methods to be implemented by the child class -------- */

    abstract execute(
        content: T,
        callback?: HandlerCallback
    ): Promise<TransactionResponse | ScriptQueryResponse | null>;

    /** -------- Implemented methods for Eliza runtime -------- */

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

        // Compose context
        return composeContext({
            state,
            template: this.template,
        });
    }

    /**
     * Default method for processing messages
     * You can override this method to add custom logic
     *
     * @param runtime The runtime object from Eliza framework
     * @param message The message object from Eliza framework
     * @param state The state object from Eliza framework
     * @returns The generated content from AI based on the message
     */
    protected async processMessages(
        runtime: IAgentRuntime,
        message: Memory,
        state: State
    ): Promise<T | null> {
        const actionContext = await this.prepareActionContext(
            runtime,
            message,
            state
        );

        // Generate transfer content
        const recommendations = await generateObjectArray({
            runtime,
            context: actionContext,
            modelClass: ModelClass.MEDIUM,
        });

        elizaLogger.debug("Recommendations", recommendations);

        // Convert array to object
        const content = recommendations[recommendations.length - 1];

        // Validate content
        const parsedObj = await this.contentSchema.safeParseAsync(content);
        if (!parsedObj.success) {
            elizaLogger.error(
                "Failed to parse content: ",
                JSON.stringify(parsedObj.error?.flatten())
            );
            return null;
        } else {
            return parsedObj.data;
        }
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
        options?: {
            [key: string]: unknown;
        },
        callback?: HandlerCallback
    ): Promise<void> {
        let content: T;
        try {
            content = await this.processMessages(runtime, message, state);
        } catch (err) {
            elizaLogger.error("Error in processing messages:", err.message);

            if (callback) {
                callback({
                    text:
                        "Unable to process transfer request. Invalid content: " +
                        err.message,
                    content: {
                        error: "Invalid content",
                    },
                });
            }
            return;
        }

        if (!content) {
            elizaLogger.warn("No content generated");
            return;
        }

        try {
            const res = await this.execute(content, callback);
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
        } catch (err) {
            elizaLogger.error("Error in executing action:", err.message);
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
