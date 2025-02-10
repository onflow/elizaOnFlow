// src/types/events.ts
export interface PairCreatedEvent {
    token0: string;
    token1: string;
    pair: string;
    totalSupply: number;
}

export interface LiquidityAddedEvent {
    pair: string;
    provider: string;
    token0Amount: number;
    token1Amount: number;
    lpTokenAmount: number;
}

export interface LiquidityRemovedEvent {
    pair: string;
    provider: string;
    token0Amount: number;
    token1Amount: number;
    lpTokenAmount: number;
}