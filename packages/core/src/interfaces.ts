import { IAgentRuntime } from "@elizaos/core";

/**
 * Interface of Injectable Provider
 */
export interface InjectableProvider<T> {
    /**
     * Get the instance of the provider related to Eliza runtime
     * @param runtime The runtime object from Eliza framework
     */
    getInstance(runtime: IAgentRuntime): Promise<T>;
}
