// src/types/bridge.types.ts

export interface ChainConfig {
    name: string;
    chainId: number;
    endpointId: number; // LayerZero endpoint ID
    rpcUrl: string;
    tokenAddress?: string; // Address of the token contract on this chain
    bridgeAddress?: string; // Address of the bridge contract on this chain
}

export interface BridgeParams {
    sourceChain: string;
    destinationChain: string;
    amount: number;
    token: string;
    recipient: string;
    slippage?: number; // Default slippage percentage
}

export interface SwapParams {
    chain: string;
    fromToken: string;
    toToken: string;
    amount: number;
    recipient: string;
    slippage?: number; // Default slippage percentage
}

export interface TokenBalance {
    chain: string;
    token: string;
    symbol: string;
    balance: string;
    decimals: number;
}

export interface BridgeResult {
    success: boolean;
    txId?: string;
    errorMessage?: string;
}

export interface SwapResult {
    success: boolean;
    txId?: string;
    fromAmount: string;
    toAmount: string;
    errorMessage?: string;
}

export interface BalanceResult {
    success: boolean;
    balances?: TokenBalance[];
    errorMessage?: string;
}

export interface LayerZeroConfig {
    sendLibrary: string;
    receiveLibrary: string;
    executor: string;
    dvn1: string;
    dvn2: string;
    sendConfirmations: number;
    receiveConfirmations: number;
}