// src/types/pool.ts
export interface PairInfo {
    address: string;
    token0Key: string;
    token1Key: string;
    token0Reserve: number;
    token1Reserve: number;
    totalSupply: number;
    stableMode: boolean;
}

export interface LiquidityParams {
    token0Key: string;
    token1Key: string;
    token0Amount: number;
    token1Amount: number;
    token0Min: number;
    token1Min: number;
    deadline: number;
    stableMode?: boolean;
}

export interface RemoveLiquidityParams {
    token0Key: string;
    token1Key: string;
    lpTokenAmount: number;
    token0OutMin: number;
    token1OutMin: number;
    deadline: number;
    stableMode?: boolean;
}

export interface PairStats {
    token0Volume24h: number;
    token1Volume24h: number;
    token0Price: number;
    token1Price: number;
    tvlInFlow: number;
    apr: number;
}

export interface CreatePoolParams {
    token0Name: string;
    token0Address: string;
    token1Name: string;
    token1Address: string;
    stableMode: boolean;
}

export interface SwapParams {
    exactAmountIn: number;
    amountOutMin: number;
    tokenKeyPath: string[];
    to: string;
    deadline?: number;
}