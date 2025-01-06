import {
    Action,
    Evaluator,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    Plugin,
    Provider,
    State,
} from "@elizaos/core";
import { TransactionResponse } from "@elizaos/plugin-flow";

// ----------- General Definitions -----------

export interface ScriptQueryResponse {
    ok: boolean;
    data?: any;
    error?: any;
    errorMessage?: string;
}

// ----------- Interfaces for Injectable Providers and Actions, etc -----------

/**
 * Interface of Injectable Provider
 */
export interface InjectableProvider<T> extends Provider {
    /**
     * Get the instance of the provider related to Eliza runtime
     * @param runtime The runtime object from Eliza framework
     */
    getInstance(runtime: IAgentRuntime): Promise<T>;
}

/**
 * The Class of Injectable Provider
 */
export type InjectableProviderClass<T = any, Args extends any[] = any[]> = new (
    ...args: Args
) => InjectableProvider<T>;

/**
 * Interface of Injectable Action
 */
export interface InjactableAction<T> extends Action {
    /**
     * Execute the action
     * @param content The content from processMessages
     * @param callback The callback function to pass the result to Eliza runtime
     */
    execute(
        content: T,
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        callback?: HandlerCallback
    ): Promise<TransactionResponse | ScriptQueryResponse | null>;
}

/**
 * The Class of Injectable Action
 */
export type InjectableActionClass<T = any, Args extends any[] = any[]> = new (
    ...args: Args
) => InjactableAction<T>;

/**
 * Interface of Injectable Evaluator
 */
export type InjactableEvaluator = Evaluator;

/**
 * The Class of Injectable Evaluator
 */
export type InjectableEvaluatorClass<Args extends any[] = any[]> = new (
    ...args: Args
) => InjactableEvaluator;

// ----------- Interfaces for Plugin -----------

/**
 * Plugin options
 */
export type PluginOptions = Pick<
    Plugin,
    "name" | "description" | "services" | "clients"
> & {
    /** Optional actions */
    actions?: (Action | InjectableActionClass)[];
    /** Optional providers */
    providers?: (Provider | InjectableProviderClass)[];
    /** Optional evaluators */
    evaluators?: (Evaluator | InjectableEvaluatorClass)[];
};

/**
 * Factory type for creating a plugin
 */
export type PluginFactory = (opts: PluginOptions) => Plugin;

/**
 * Interface of Injectable Plugin
 */
export interface InjectablePlugin {
    /**
     * Get the instance of the plugin
     */
    get(): Plugin;
}

// ----------- Interfaces for Content Properties or actions -----------

export interface ContentPropertyDescription {
    description: string;
    examples?: string[];
}
