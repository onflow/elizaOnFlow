import { inject, injectable, unmanaged } from "inversify";
import { ZodSchema } from "zod";
import { InjactableAction, ScriptQueryResponse } from "./interfaces";
import {
    Action,
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
import {
    type ContentClass,
    createZodSchema,
    loadPropertyDescriptions,
} from "./decorators";
import { buildContentOutputTemplate } from "./templates";

/**
 * Action options
 */
export type ActionOptions<T> = Pick<
    Action,
    "name" | "similes" | "description" | "examples" | "suppressInitialMessage"
> & {
    contentClass: ContentClass<T>;
    template?: string;
    contentSchema?: ZodSchema<T>;
};

/**
 * Base abstract class for injectable actions
 */
@injectable()
export abstract class BaseInjactableAction<T> implements InjactableAction<T> {
    // -------- Injects --------

    // Inject the connector provider
    @inject(ConnectorProvider) protected connector: ConnectorProvider;
    // Inject the wallet provider
    @inject(WalletProvider) protected wallet: WalletProvider;

    // -------- Properties --------

    public name: string;
    public similes: string[];
    public description: string;
    public examples: ActionExample[][];
    public suppressInitialMessage: boolean;

    /**
     * The content class for the action
     */
    private readonly contentClass: ContentClass<T>;
    /**
     * Optional template for the action, if not provided, it will be generated from the content class
     */
    private readonly template: string;
    /**
     * Optional content schema for the action, if not provided, it will be generated from the content class
     */
    private readonly contentSchema: ZodSchema<T>;

    /**
     * Constructor for the base injectable action
     */
    constructor(@unmanaged() opts: ActionOptions<T>) {
        // Set the action properties
        this.name = opts.name;
        this.similes = opts.similes;
        this.description = opts.description;
        this.examples = opts.examples;
        this.suppressInitialMessage = opts.suppressInitialMessage ?? false; // Default to false
        // Set the content class, template and content schema
        this.contentClass = opts.contentClass;
        this.template = opts.template;
        this.contentSchema = opts.contentSchema;

        if (this.contentClass !== undefined) {
            if (this.contentSchema === undefined) {
                this.contentSchema = createZodSchema(this.contentClass);
            }
            if (this.template === undefined) {
                const properties = loadPropertyDescriptions(this.contentClass);
                this.template = buildContentOutputTemplate(
                    this.name,
                    this.description,
                    properties,
                    this.contentSchema
                );
            }
        }
    }

    // -------- Abstract methods to be implemented by the child class --------

    /**
     * Abstract method to execute the action
     * @param content The content object
     * @param callback The callback function to pass the result to Eliza runtime
     */
    abstract execute(
        content: T,
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

        if (!actionContext) {
            elizaLogger.error("Failed to prepare action context");
            return null;
        }

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
            const res = await this.execute(
                content,
                runtime,
                message,
                state,
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
