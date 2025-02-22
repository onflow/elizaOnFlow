export interface IncrementConfig {
    factoryAddress: string;
    routerAddress: string;
    stableFactoryAddress: string;
}

export interface SwapPathInfo {
    path: string[];
    amounts: number[];
    priceImpact: number;
}

export interface TokenPathResult {
    amountOut: number;
    path: string[];
    priceImpact: number;
}

// Declaration merging for ServiceType
declare module "@elizaos/core" {
    export enum ServiceType {
        INCREMENT = "increment",
    }
}

export type StoragePathMapping = {
    vault: string;
    receiver: string;
    balance: string;
};

export interface PoolCreationParams {
    token0Key: string;
    token1Key: string;
    stable: boolean;
}

export interface PoolActionResult {
    txId: string;
    success: boolean;
    errorMessage?: string;
    pairAddress?: string;
}

export interface SwapResult extends PoolActionResult {
    amountIn?: number;
    amountOut?: number;
    path?: string[];
}
