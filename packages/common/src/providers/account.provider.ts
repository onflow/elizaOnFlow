import { injectable, inject } from "inversify";
import {
    elizaLogger,
    type IAgentRuntime,
    type Memory,
    type Provider,
    type State,
} from "@elizaos/core";
import { globalContainer } from "@elizaos-plugins/plugin-di";
import { AccountsPoolService } from "../services/acctPool.service";
import { formatWalletInfo } from "../formater";

/**
 * Wallet provider
 */
@injectable()
export class AccountProvider implements Provider {
    constructor(
        @inject(AccountsPoolService)
        private readonly acctPoolService: AccountsPoolService,
    ) {}

    /**
     * Eliza provider `get` method
     * @returns The message to be injected into the context
     */
    async get(_runtime: IAgentRuntime, message: Memory, state?: State): Promise<string | null> {
        const userId = message.userId;
        // For one session, only inject the wallet info once
        if (state) {
            const PROVIDER_SESSION_FLAG = `account-provider-session:${userId}`;
            if (state[PROVIDER_SESSION_FLAG]) {
                return null;
            }
            state[PROVIDER_SESSION_FLAG] = true;
        }

        try {
            const isSelf = message.userId === message.agentId;
            const acctInfo = await this.acctPoolService.queryAccountInfo(
                isSelf ? undefined : userId,
            );
            const accountName = `Account[${this.acctPoolService.mainAddress}/${isSelf ? "root" : userId}]`;
            return formatWalletInfo(userId, accountName, acctInfo);
        } catch (error) {
            elizaLogger.error("Error in Account provider:", error.message);
        }
        return null;
    }
}

// Wallet provider is bound to request scope
globalContainer.bind(AccountProvider).toSelf().inRequestScope();
