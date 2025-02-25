// src/services/increment.service.ts
import { injectable, inject } from "inversify";
import { elizaLogger, Service, type ServiceType, type IAgentRuntime } from "@elizaos/core";
import { FlowWalletService, type TransactionSentResponse } from "@fixes-ai/core";
import type {
    PairInfo,
    LiquidityParams,
    RemoveLiquidityParams,
    PoolActionResult,
    PairStats,
    CreatePoolParams,
    SwapParams,
    SwapResult
} from "../types";
import { DEFAULT_SLIPPAGE } from "../constants/tokens"
import { scripts } from "../assets/cadence/scripts.defs";
import { transactions } from "../assets/cadence/transactions.def";
import { globalContainer } from "@elizaos-plugins/plugin-di";
import { DEFAULT_DEADLINE } from "../constants/tokens";
import { isFlowAddress } from "@elizaos-plugins/plugin-flow";

@injectable()
export class IncrementService extends Service {
    private formatTokenPath(tokenPath: string): string {
        return tokenPath.startsWith("A.") ? tokenPath : `A.${tokenPath}`;
    }
    constructor(
        @inject(FlowWalletService)
        private readonly walletService: FlowWalletService,
    ) {
        super();
    }

    async initialize(_runtime: IAgentRuntime): Promise<void> {
        elizaLogger.info("Initializing IncrementService...");
    }

    static get serviceType(): ServiceType {
        return "increment" as ServiceType.INCREMENT;
    }

    // Query Methods
    async getAllPairs(): Promise<string[]> {
        try {
            return await this.walletService.executeScript(
                scripts.get_all_pair_addresses,
                (_arg, _t) => [],
                []
            );
        } catch (error) {
            elizaLogger.error("Error fetching pairs:", error);
            return [];
        }
    }

    async getAllPairInfos(): Promise<PairInfo[]> {
        try {
            const pairInfos = await this.walletService.executeScript(
                scripts.get_all_pair_info,
                (_arg, _t) => [],
                []
            );
            return pairInfos.map(this.formatPairInfo);
        } catch (error) {
            elizaLogger.error("Error fetching pair infos:", error);
            return [];
        }
    }

    async getPairInfo(pairAddress: string): Promise<PairInfo | null> {
        try {
            const pairInfo = await this.walletService.executeScript(
                scripts.get_all_pair_info,
                (arg, t) => [arg(pairAddress, t.Address)],
                null
            );
            return pairInfo ? this.formatPairInfo(pairInfo) : null;
        } catch (error) {
            elizaLogger.error(`Error fetching pair info for ${pairAddress}:`, error);
            return null;
        }
    }

    // Update the liquidity methods to not use userId parameter since we're using the wallet directly
    async addLiquidity(params: LiquidityParams): Promise<PoolActionResult> {
        try {
            const txResponse = await this.walletService.sendTransaction(
                transactions.addLiquidity,
                (arg, t) => [
                    arg(params.token0Key, t.String),
                    arg(params.token1Key, t.String),
                    arg(params.token0Amount.toFixed(8), t.UFix64),
                    arg(params.token1Amount.toFixed(8), t.UFix64),
                    arg(params.token0Min.toFixed(8), t.UFix64),
                    arg(params.token1Min.toFixed(8), t.UFix64),
                    arg(params.deadline.toString(), t.UFix64),
                    arg(params.stableMode ?? false, t.Bool)
                ]
            );

            return {
                txId: txResponse.txId,
                success: true,
                pairAddress: await this.getPairAddress(params.token0Key, params.token1Key, params.stableMode)
            };
        } catch (error) {
            elizaLogger.error("Error adding liquidity:", error);
            return {
                txId: "",
                success: false,
                errorMessage: error.message
            };
        }
    }

    async removeLiquidity(params: RemoveLiquidityParams): Promise<PoolActionResult> {
        try {
            const txResponse = await this.walletService.sendTransaction(
                transactions.removeLiquidity,
                (arg, t) => [
                    arg(params.token0Key, t.String),
                    arg(params.token1Key, t.String),
                    arg(params.lpTokenAmount.toFixed(8), t.UFix64),
                    arg(params.token0OutMin.toFixed(8), t.UFix64),
                    arg(params.token1OutMin.toFixed(8), t.UFix64),
                    arg(params.deadline.toString(), t.UFix64),
                    arg(params.stableMode ?? false, t.Bool)
                ]
            );

            return {
                txId: txResponse.txId,
                success: true
            };
        } catch (error) {
            elizaLogger.error("Error removing liquidity:", error);
            return {
                txId: "",
                success: false,
                errorMessage: error.message
            };
        }
    }

    // Helper Methods
    private async getPairAddress(
        token0Key: string,
        token1Key: string,
        stableMode?: boolean
    ): Promise<string | null> {
        try {
            return await this.walletService.executeScript(
                stableMode ? scripts.get_all_pair_addresses : scripts.get_all_pair_addresses,
                (arg, t) => [
                    arg(token0Key, t.String),
                    arg(token1Key, t.String)
                ],
                null
            );
        } catch (error) {
            elizaLogger.error("Error getting pair address:", error);
            return null;
        }
    }

    private formatPairInfo(rawInfo: any): PairInfo {
        return {
            address: rawInfo.address,
            token0Key: rawInfo.token0Key,
            token1Key: rawInfo.token1Key,
            token0Reserve: parseFloat(rawInfo.token0Reserve),
            token1Reserve: parseFloat(rawInfo.token1Reserve),
            totalSupply: parseFloat(rawInfo.totalSupply),
            stableMode: rawInfo.stableMode ?? false
        };
    }

    // Price and Stats Methods
    async getPairStats(pairAddress: string): Promise<PairStats | null> {
        try {
            const stats = await this.walletService.executeScript(
                scripts. get_all_pair_info,
                (arg, t) => [arg(pairAddress, t.Address)],
                null
            );
            return stats ? {
                token0Volume24h: parseFloat(stats.token0Volume24h),
                token1Volume24h: parseFloat(stats.token1Volume24h),
                token0Price: parseFloat(stats.token0Price),
                token1Price: parseFloat(stats.token1Price),
                tvlInFlow: parseFloat(stats.tvlInFlow),
                apr: parseFloat(stats.apr)
            } : null;
        } catch (error) {
            elizaLogger.error(`Error fetching pair stats for ${pairAddress}:`, error);
            return null;
        };
    }
    async createPool(params: CreatePoolParams): Promise<PoolActionResult> {
        try {
            if (!isFlowAddress(params.token0Address) || !isFlowAddress(params.token1Address)) {
                throw new Error("Invalid token addresses");
            }

            const txResponse = await this.walletService.sendTransaction(
                transactions.createPool,
                (arg, t) => [
                    arg(params.token0Name, t.String),
                    arg(this.formatTokenPath(params.token0Address), t.Address),
                    arg(params.token1Name, t.String),
                    arg(this.formatTokenPath(params.token1Address), t.Address),
                    arg(params.stableMode ?? false, t.Bool)
                ]
            );

            return {
                txId: txResponse.txId,
                success: true
            };
        } catch (error) {
            elizaLogger.error("Error creating pool:", error);
            return {
                txId: "",
                success: false,
                errorMessage: error.message
            };
        }
    }

    async swapExactTokens(params: SwapParams): Promise<SwapResult> {
        try {
            // Validate paths
            const formattedPath = params.tokenKeyPath.map(this.formatTokenPath);
            if (formattedPath.length < 2) {
                throw new Error("Invalid token path length");
            }

            if (!isFlowAddress(params.to)) {
                throw new Error("Invalid recipient address");
            }

            // Format UFix64 numbers properly
            const exactAmount = this.formatUFix64(params.exactAmountIn);
            const minAmount = this.formatUFix64(params.amountOutMin);
            const deadline = (params.deadline ?? Math.floor(Date.now()/1000) + DEFAULT_DEADLINE).toFixed(8);

            elizaLogger.debug("Swap parameters:", {
                exactAmount,
                minAmount,
                path: formattedPath,
                to: params.to,
                deadline
            });

            const txResponse = await this.walletService.sendTransaction(
                transactions.swapflowtoken,
                (arg, t) => [
                    arg(exactAmount, t.UFix64),
                    arg(minAmount, t.UFix64),
                    arg(formattedPath, t.Array(t.String)),
                    arg(params.to, t.Address),
                    arg(deadline, t.UFix64)
                ]
            );

            return {
                txId: txResponse.txId,
                success: true,
                amountIn: params.exactAmountIn,
                amountOut: params.amountOutMin,
                path: formattedPath
            };
        } catch (error) {
            elizaLogger.error("Error swapping tokens:", error);
            return {
                txId: "",
                success: false,
                errorMessage: error.message
            };
        }
    }

    private formatUFix64(num: number): string {
        // Ensure exactly 8 decimal places and handle whole numbers
        const fixed = num.toFixed(8);
        return fixed.includes('.') ? fixed : `${fixed}.00000000`;
    }

    // Helper method to calculate minimum amount out
    private calculateMinimumAmountOut(amountIn: number, slippage: number = DEFAULT_SLIPPAGE): number {
        return amountIn * (1 - slippage);
    }
     // Helper methods for token information
     async checkPairExists(token0Key: string, token1Key: string): Promise<boolean> {
        try {
            const pairInfo = await this.walletService.executeScript(
                scripts.get_all_pair_info,
                (arg, t) => [
                    arg(this.formatTokenPath(token0Key), t.String),
                    arg(this.formatTokenPath(token1Key), t.String)
                ],
                false
            );
            return !!pairInfo;
        } catch (error) {
            return false;
        }
    }
}

// Register the service with the global container
globalContainer.bind(IncrementService).toSelf().inSingletonScope();
