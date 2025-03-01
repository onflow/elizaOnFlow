import { ChainConfig } from '../types';

// LayerZero endpoint IDs for mainnet chains
// Reference: https://docs.layerzero.network/v2/developers/evm/endpoints
export const CHAIN_CONFIGS: Record<string, ChainConfig> = {
    'flow-evm': {
        name: 'Flow EVM',
        chainId: 747,
        endpointId: 30747, // LayerZero Endpoint ID for Flow EVM
        rpcUrl: 'https://mainnet.flow-evm.com',
        tokenAddress: '0x0000000000000000000000000000000000000000', // Native FLOW token
        bridgeAddress: '0x9a1cB6b0EF4B6B8E0D181bE32F85C2111BA56b11', // OFT contract address
    },
    'arbitrum': {
        name: 'Arbitrum',
        chainId: 42161,
        endpointId: 30110, // LayerZero Endpoint ID for Arbitrum
        rpcUrl: 'https://arb1.arbitrum.io/rpc',
        tokenAddress: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // USDC on Arbitrum
        bridgeAddress: '0x12DcEd4DcD8f0D1B5dCB8f568E1152B8b46eD200', // OFT contract address
    },
    'base': {
        name: 'Base',
        chainId: 8453,
        endpointId: 30184, // LayerZero Endpoint ID for Base
        rpcUrl: 'https://mainnet.base.org',
        tokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
        bridgeAddress: '0x4F1F9841a8D61FE5786a608c5E97C0d98cad10aE', // OFT contract address
    },
    'ethereum': {
        name: 'Ethereum',
        chainId: 1,
        endpointId: 30101, // LayerZero Endpoint ID for Ethereum
        rpcUrl: 'https://mainnet.infura.io/v3/your-infura-key',
        tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC on Ethereum
        bridgeAddress: '0x66A2A913e447d6b4BF33EFbec43aAeF87890FBbc', // OFT contract address
    },
    'optimism': {
        name: 'Optimism',
        chainId: 10,
        endpointId: 30111, // LayerZero Endpoint ID for Optimism
        rpcUrl: 'https://mainnet.optimism.io',
        tokenAddress: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', // USDC on Optimism
        bridgeAddress: '0x4200000000000000000000000000000000000010', // OFT contract address
    },
    'polygon': {
        name: 'Polygon',
        chainId: 137,
        endpointId: 30109, // LayerZero Endpoint ID for Polygon
        rpcUrl: 'https://polygon-rpc.com',
        tokenAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC on Polygon
        bridgeAddress: '0x2036E2F5AE9b3d62BB3566b9E8CCB5fFA4C720B5', // OFT contract address
    },
};

// Flow EVM LayerZero configuration
// These addresses would be provided by LayerZero for Flow EVM integration
export const FLOW_EVM_LAYERZERO_CONFIG = {
    // Endpoint contract address
    endpointV2: '0x1a44076050125825900e736c501f859c50fE728c',

    // Send libraries
    sendUln302: '0x3d3e2492eFf5926a0d7fDE6Da9D7a0108C7e7889',
    sendUln301: '0xD7D4D7F3F8E15E0110E63B3CC9D3E52C9F96C4F7',

    // Receive libraries
    receiveUln302: '0x4D73156653F04f1F3Eb86495b5320c0C4D46dE2D',
    receiveUln301: '0x4D73156653F04f1F3Eb86495b5320c0C4D46dE2D',

    // Other LayerZero contracts
    blockedMessageLib: '0x0000000000000000000000000000000000000000',
    lzExecutor: '0x5B19bd330A84c049b62D5B0FC2bA120217A18C2C',
    lzDeadDVN: '0x0000000000000000000000000000000000000000',
};