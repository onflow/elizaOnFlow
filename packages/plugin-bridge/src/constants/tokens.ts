// src/constants/tokens.ts

export interface TokenInfo {
    symbol: string;
    name: string;
    decimals: number;
    addresses: Record<string, string>; // Chain name to token address mapping
}

export const TOKENS: Record<string, TokenInfo> = {
    'FLOW': {
        symbol: 'FLOW',
        name: 'Flow Token',
        decimals: 18,
        addresses: {
            'flow-evm': '0x0000000000000000000000000000000000000000', // Native FLOW token on Flow EVM
            'arbitrum': '0x8CE0233eE5E2a1d8ee1BE22fF3AC0D5309113D3a', // FLOW token on Arbitrum
            'base': '0x3223f17957Ba502cbe71401D55A0DB26E5F7c68F', // FLOW token on Base
            'ethereum': '0x5C147e74D63B1D31AA3Fd78Eb229B65161983B2b', // FLOW token on Ethereum
            'optimism': '0x6aB5Ae6822647046626e83ee6dB8187151E1d5ab', // FLOW token on Optimism
            'polygon': '0x8C92e38eCA8210f4fcBf17F0951b198Dd7668292', // FLOW token on Polygon
        }
    },
    'USDC': {
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        addresses: {
            'flow-evm': '0x1152D48d1b3B7eaD0e4a5189C5c92C2e38c8AE99', // USDC on Flow EVM
            'arbitrum': '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // USDC on Arbitrum
            'base': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
            'ethereum': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC on Ethereum
            'optimism': '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', // USDC on Optimism
            'polygon': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC on Polygon
        }
    },
    'ETH': {
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        addresses: {
            'flow-evm': '0x74A9a6F7Ec4d4AFbf619a4652CeA1F2A90358f8F', // Wrapped ETH on Flow EVM
            'arbitrum': '0x0000000000000000000000000000000000000000', // Native ETH on Arbitrum
            'base': '0x0000000000000000000000000000000000000000', // Native ETH on Base
            'ethereum': '0x0000000000000000000000000000000000000000', // Native ETH on Ethereum
            'optimism': '0x0000000000000000000000000000000000000000', // Native ETH on Optimism
            'polygon': '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', // Wrapped ETH on Polygon
        }
    },
};

// Default slippage percentage for swaps and bridges
export const DEFAULT_SLIPPAGE = 0.5; // 0.5%

// Default gas limit for cross-chain transactions
export const DEFAULT_GAS_LIMIT = 300000;