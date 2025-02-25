// src/types/errors.ts
export enum IncrementError {
    INSUFFICIENT_LIQUIDITY = "INSUFFICIENT_LIQUIDITY",
    INVALID_PATH = "INVALID_PATH",
    EXPIRED = "EXPIRED",
    SLIPPAGE_TOO_HIGH = "SLIPPAGE_TOO_HIGH",
    PAIR_EXISTS = "PAIR_EXISTS",
    PAIR_DOES_NOT_EXIST = "PAIR_DOES_NOT_EXIST",
    ZERO_ADDRESS = "ZERO_ADDRESS",
    INSUFFICIENT_AMOUNT = "INSUFFICIENT_AMOUNT",
    INVALID_TOKEN = "INVALID_TOKEN",
}

export interface IncrementErrorWithMessage {
    code: IncrementError;
    message: string;
}