// src/services/bridge.service.ts
import { injectable, inject } from "inversify";
import { elizaLogger, Service, type ServiceType, type IAgentRuntime } from "@elizaos/core";
import { FlowWalletService } from "@elizaos-plugins/plugin-flow";
import axios from "axios";
import {
    BridgeParams,
    SwapParams,
    BridgeResult,
    SwapResult,
    BalanceResult,
    TokenBalance
} from "../types/bridge.types";
import { CHAIN_CONFIGS, TOKENS, DEFAULT_SLIPPAGE } from "../constants";
import { LayerZeroService } from "./layerzero.service";

@injectable()
export class BridgeService extends Service {
    constructor(
        @inject(FlowWalletService)
        private readonly walletService: FlowWalletService,
        @inject(LayerZeroService)
        private readonly layerZeroService: LayerZeroService
    ) {
        super();
    }

    async initialize(_runtime: IAgentRuntime): Promise<void> {
        elizaLogger.info("Initializing BridgeService...");
    }

    static get serviceType(): ServiceType {
        return "bridge" as ServiceType;
    }

    /**
     * Bridge tokens from another ecosystem to Flow
     * @param params Bridge parameters
     * @returns Bridge result
     */
    async bridgeTokens(params: BridgeParams): Promise<BridgeResult> {
        try {
            elizaLogger.info(`Bridging ${params.amount} ${params.token} from ${params.sourceChain} to ${params.destinationChain}`);

            // Validate chains
            if (!CHAIN_CONFIGS[params.sourceChain]) {
                throw new Error(`Source chain ${params.sourceChain} not supported`);
            }
            if (!CHAIN_CONFIGS[params.destinationChain]) {
                throw new Error(`Destination chain ${params.destinationChain} not supported`);
            }

            // Validate token
            if (!TOKENS[params.token]) {
                throw new Error(`Token ${params.token} not supported`);
            }

            // Set default slippage if not provided
            const slippage = params.slippage || DEFAULT_SLIPPAGE;

            // If destination is Flow EVM, use LayerZero to bridge
            if (params.destinationChain === 'flow-evm') {
                return await this.layerZeroService.bridgeToFlowEVM({
                    sourceChain: params.sourceChain,
                    destinationChain: params.destinationChain,
                    amount: params.amount,
                    token: params.token,
                    recipient: params.recipient,
                    slippage: slippage
                });
            }

            // If source is Flow EVM, use LayerZero to bridge out
            if (params.sourceChain === 'flow-evm') {
                return await this.layerZeroService.bridgeFromFlowEVM({
                    sourceChain: params.sourceChain,
                    destinationChain: params.destinationChain,
                    amount: params.amount,
                    token: params.token,
                    recipient: params.recipient,
                    slippage: slippage
                });
            }

            // If neither source nor destination is Flow EVM, throw error
            throw new Error("At least one of source or destination chain must be Flow EVM");

        } catch (error) {
            elizaLogger.error(`Error bridging tokens: ${error.message}`);
            return {
                success: false,
                errorMessage: error.message
            };
        }
    }

    /**
     * Swap tokens on a specific chain
     * @param params Swap parameters
     * @returns Swap result
     */
    async swapTokens(params: SwapParams): Promise<SwapResult> {
        try {
            elizaLogger.info(`Swapping ${params.amount} ${params.fromToken} to ${params.toToken} on ${params.chain}`);

            // Validate chain
            if (!CHAIN_CONFIGS[params.chain]) {
                throw new Error(`Chain ${params.chain} not supported`);
            }

            // Validate tokens
            if (!TOKENS[params.fromToken]) {
                throw new Error(`Token ${params.fromToken} not supported`);
            }
            if (!TOKENS[params.toToken]) {
                throw new Error(`Token ${params.toToken} not supported`);
            }

            // Set default slippage if not provided
            const slippage = params.slippage || DEFAULT_SLIPPAGE;

            // If chain is Flow EVM, use Flow EVM swap
            if (params.chain === 'flow-evm') {
                // In a real implementation, this would connect to a DEX on Flow EVM
                // For example, using a DEX aggregator or specific DEX protocol

                // 1. Get token addresses
                const fromTokenAddress = TOKENS[params.fromToken].addresses[params.chain];
                const toTokenAddress = TOKENS[params.toToken].addresses[params.chain];

                if (!fromTokenAddress || !toTokenAddress) {
                    throw new Error(`One or both tokens not available on ${params.chain}`);
                }

                // 2. Calculate amount with decimals
                const fromDecimals = TOKENS[params.fromToken].decimals;
                const toDecimals = TOKENS[params.toToken].decimals;
                const amountWithDecimals = params.amount * (10 ** fromDecimals);

                // 3. Calculate minimum amount out based on slippage
                const minAmountOut = (params.amount * (1 - (slippage / 100))) * (10 ** toDecimals);

                // 4. Execute swap (this would be implemented with actual DEX integration)
                // For now, we'll return a simulated result
                const estimatedRate = await this.getEstimatedRate(
                    params.chain,
                    params.fromToken,
                    params.toToken,
                    params.amount
                );

                const toAmount = params.amount * estimatedRate;

                return {
                    success: true,
                    txId: "0x" + Math.random().toString(16).substring(2, 10) + Math.random().toString(16).substring(2, 10),
                    fromAmount: params.amount.toString(),
                    toAmount: toAmount.toString()
                };
            }

            // For other chains, throw error (not implemented yet)
            throw new Error(`Swapping on ${params.chain} not implemented yet`);

        } catch (error) {
            elizaLogger.error(`Error swapping tokens: ${error.message}`);
            return {
                success: false,
                fromAmount: params.amount.toString(),
                toAmount: "0",
                errorMessage: error.message
            };
        }
    }

    /**
     * Get estimated exchange rate between two tokens
     * @param chain Chain name
     * @param fromToken Source token symbol
     * @param toToken Destination token symbol
     * @param amount Amount to swap
     * @returns Estimated exchange rate
     */
    private async getEstimatedRate(chain: string, fromToken: string, toToken: string, amount: number): Promise<number> {
        // In a real implementation, this would query a price oracle or DEX API
        // For now, we'll use some fixed rates for demonstration
        const rates: Record<string, Record<string, number>> = {
            'FLOW': {
                'USDC': 1.25,  // 1 FLOW = 1.25 USDC
                'ETH': 0.0005  // 1 FLOW = 0.0005 ETH
            },
            'USDC': {
                'FLOW': 0.8,   // 1 USDC = 0.8 FLOW
                'ETH': 0.0004  // 1 USDC = 0.0004 ETH
            },
            'ETH': {
                'FLOW': 2000,  // 1 ETH = 2000 FLOW
                'USDC': 2500   // 1 ETH = 2500 USDC
            }
        };

        if (rates[fromToken] && rates[fromToken][toToken]) {
            return rates[fromToken][toToken];
        }

        throw new Error(`No exchange rate available for ${fromToken} to ${toToken}`);
    }

    /**
     * Get token balances for a user
     * @param chain Chain name
     * @param token Optional token symbol to check (if not provided, checks all supported tokens)
     * @param address User address
     * @returns Balance result
     */
    async getBalances(chain: string, token: string | undefined, address: string): Promise<BalanceResult> {
        try {
            elizaLogger.info(`Getting balances for ${address} on ${chain}`);

            // Validate chain
            if (!CHAIN_CONFIGS[chain]) {
                throw new Error(`Chain ${chain} not supported`);
            }

            // Determine which tokens to check
            let tokensToCheck: string[] = [];
            if (token) {
                if (!TOKENS[token]) {
                    throw new Error(`Token ${token} not supported`);
                }
                tokensToCheck = [token];
            } else {
                // Check all tokens that have addresses on this chain
                tokensToCheck = Object.keys(TOKENS).filter(
                    tokenSymbol => TOKENS[tokenSymbol].addresses[chain] !== undefined
                );
            }

            if (tokensToCheck.length === 0) {
                throw new Error(`No supported tokens found for chain ${chain}`);
            }

            // In a real implementation, this would query the blockchain for token balances
            // For now, we'll return simulated balances
            const balances: TokenBalance[] = await Promise.all(
                tokensToCheck.map(async (tokenSymbol) => {
                    const tokenInfo = TOKENS[tokenSymbol];
                    const tokenAddress = tokenInfo.addresses[chain];

                    // Simulate a balance (in a real implementation, this would query the blockchain)
                    const simulatedBalance = Math.random() * 100;
                    const formattedBalance = simulatedBalance.toFixed(tokenInfo.decimals > 6 ? 6 : tokenInfo.decimals);

                    return {
                        chain,
                        token: tokenAddress,
                        symbol: tokenInfo.symbol,
                        balance: formattedBalance,
                        decimals: tokenInfo.decimals
                    };
                })
            );

            return {
                success: true,
                balances
            };

        } catch (error) {
            elizaLogger.error(`Error getting balances: ${error.message}`);
            return {
                success: false,
                errorMessage: error.message
            };
        }
    }
}