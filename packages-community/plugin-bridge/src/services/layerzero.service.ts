// src/services/layerzero.service.ts
import { injectable, inject } from "inversify";
import { elizaLogger, Service, type ServiceType, type IAgentRuntime } from "@elizaos/core";
import { FlowWalletService } from "@elizaos-plugins/plugin-flow";
import axios from "axios";
import type {
    BridgeParams,
    BridgeResult,
    LayerZeroConfig
} from "../types/bridge.types";
import { CHAIN_CONFIGS, FLOW_EVM_LAYERZERO_CONFIG, TOKENS, DEFAULT_GAS_LIMIT } from "../constants";

// ABI for OFT (Omnichain Fungible Token) contract
const OFT_ABI = [
    // send function
    {
        "inputs": [
            {
                "internalType": "uint32",
                "name": "_dstEid",
                "type": "uint32"
            },
            {
                "internalType": "bytes32",
                "name": "_toAddress",
                "type": "bytes32"
            },
            {
                "internalType": "uint256",
                "name": "_amount",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "_minAmount",
                "type": "uint256"
            },
            {
                "internalType": "MessagingFee",
                "name": "_msgFee",
                "type": "tuple",
                "components": [
                    {
                        "internalType": "uint256",
                        "name": "nativeFee",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "lzTokenFee",
                        "type": "uint256"
                    }
                ]
            },
            {
                "internalType": "address payable",
                "name": "_refundAddress",
                "type": "address"
            },
            {
                "internalType": "bytes",
                "name": "_composeMsg",
                "type": "bytes"
            }
        ],
        "name": "send",
        "outputs": [
            {
                "internalType": "MessagingReceipt",
                "name": "msgReceipt",
                "type": "tuple",
                "components": [
                    {
                        "internalType": "bytes32",
                        "name": "guid",
                        "type": "bytes32"
                    },
                    {
                        "internalType": "uint64",
                        "name": "nonce",
                        "type": "uint64"
                    },
                    {
                        "internalType": "MessagingFee",
                        "name": "fee",
                        "type": "tuple",
                        "components": [
                            {
                                "internalType": "uint256",
                                "name": "nativeFee",
                                "type": "uint256"
                            },
                            {
                                "internalType": "uint256",
                                "name": "lzTokenFee",
                                "type": "uint256"
                            }
                        ]
                    }
                ]
            }
        ],
        "stateMutability": "payable",
        "type": "function"
    },
    // quote send function
    {
        "inputs": [
            {
                "internalType": "uint32",
                "name": "_dstEid",
                "type": "uint32"
            },
            {
                "internalType": "bytes32",
                "name": "_toAddress",
                "type": "bytes32"
            },
            {
                "internalType": "uint256",
                "name": "_amount",
                "type": "uint256"
            },
            {
                "internalType": "bytes",
                "name": "_composeMsg",
                "type": "bytes"
            },
            {
                "internalType": "bool",
                "name": "_payInLzToken",
                "type": "bool"
            }
        ],
        "name": "quoteSend",
        "outputs": [
            {
                "internalType": "MessagingFee",
                "name": "fee",
                "type": "tuple",
                "components": [
                    {
                        "internalType": "uint256",
                        "name": "nativeFee",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "lzTokenFee",
                        "type": "uint256"
                    }
                ]
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    // balanceOf function
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "account",
                "type": "address"
            }
        ],
        "name": "balanceOf",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    // decimals function
    {
        "inputs": [],
        "name": "decimals",
        "outputs": [
            {
                "internalType": "uint8",
                "name": "",
                "type": "uint8"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

// ABI for ERC20 token
const ERC20_ABI = [
    // approve function
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "spender",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "approve",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

@injectable()
export class LayerZeroService extends Service {
    constructor(
        @inject(FlowWalletService)
        private readonly walletService: FlowWalletService
    ) {
        super();
    }

    async initialize(_runtime: IAgentRuntime): Promise<void> {
        elizaLogger.info("Initializing LayerZeroService...");
    }

    static get serviceType(): ServiceType {
        return "layerzero" as ServiceType;
    }

    /**
     * Get LayerZero configuration for a specific path
     * @param sourceChain Source chain name
     * @param destinationChain Destination chain name
     * @returns LayerZero configuration
     */
    async getLayerZeroConfig(sourceChain: string, destinationChain: string): Promise<LayerZeroConfig> {
        try {
            // In a real implementation, this would fetch the configuration from LayerZero API
            // or use hardcoded values for known paths

            // For now, we'll return configuration based on the chains
            return {
                sendLibrary: FLOW_EVM_LAYERZERO_CONFIG.sendUln302,
                receiveLibrary: FLOW_EVM_LAYERZERO_CONFIG.receiveUln302,
                executor: FLOW_EVM_LAYERZERO_CONFIG.lzExecutor,
                dvn1: FLOW_EVM_LAYERZERO_CONFIG.lzDeadDVN,
                dvn2: "0x0000000000000000000000000000000000000000",
                sendConfirmations: 15,
                receiveConfirmations: 20
            };
        } catch (error) {
            elizaLogger.error(`Error getting LayerZero config: ${error.message}`);
            throw error;
        }
    }

    /**
     * Bridge tokens to Flow EVM using LayerZero
     * @param params Bridge parameters
     * @returns Bridge result
     */
    async bridgeToFlowEVM(params: BridgeParams): Promise<BridgeResult> {
        try {
            elizaLogger.info(`Bridging ${params.amount} ${params.token} from ${params.sourceChain} to Flow EVM using LayerZero`);

            // Get source chain config
            const sourceChainConfig = CHAIN_CONFIGS[params.sourceChain];
            if (!sourceChainConfig) {
                throw new Error(`Source chain ${params.sourceChain} not supported`);
            }

            // Get Flow EVM chain config
            const flowEvmChainConfig = CHAIN_CONFIGS['flow-evm'];
            if (!flowEvmChainConfig) {
                throw new Error('Flow EVM chain configuration not found');
            }

            // Get token config
            const tokenConfig = TOKENS[params.token];
            if (!tokenConfig) {
                throw new Error(`Token ${params.token} not supported`);
            }

            // Get token address on source chain
            const tokenAddress = tokenConfig.addresses[params.sourceChain];
            if (!tokenAddress) {
                throw new Error(`Token ${params.token} not available on ${params.sourceChain}`);
            }

            // Get token address on Flow EVM
            const flowEvmTokenAddress = tokenConfig.addresses['flow-evm'];
            if (!flowEvmTokenAddress) {
                throw new Error(`Token ${params.token} not available on Flow EVM`);
            }

            // Calculate amount with decimals
            const decimals = tokenConfig.decimals;
            const amountWithDecimals = params.amount * (10 ** decimals);

            // Calculate minimum amount based on slippage
            const minAmount = amountWithDecimals * (1 - (params.slippage || 0.5) / 100);

            // In a real implementation, this would:
            // 1. Connect to the source chain using a web3 provider
            // 2. Create a contract instance for the OFT token
            // 3. Estimate gas using quoteSend
            // 4. Execute the send transaction

            // For demonstration, we'll simulate the process with the correct parameters

            // Convert recipient address to bytes32 format (required by LayerZero)
            const recipient = params.recipient || this.walletService.address;
            // In a real implementation, this would be:
            // const recipientBytes32 = ethers.utils.hexZeroPad(recipient, 32);
            const recipientBytes32 = `0x${recipient.substring(2).padStart(64, '0')}`;

            // Get the destination endpoint ID from the chain config
            const dstEid = flowEvmChainConfig.endpointId;

            // Compose message (empty for simple transfers)
            const composeMsg = '0x';

            // Quote the fee for the transfer
            // In a real implementation, this would call the quoteSend function on the OFT contract
            const fee = await this.estimateGas(
                params.sourceChain,
                'flow-evm',
                params.token,
                params.amount
            );

            // Execute the send transaction
            // In a real implementation, this would call the send function on the OFT contract

            // For now, we'll return a simulated transaction ID
            return {
                success: true,
                txId: "0x" + Math.random().toString(16).substring(2, 10) + Math.random().toString(16).substring(2, 10)
            };

        } catch (error) {
            elizaLogger.error(`Error bridging to Flow EVM: ${error.message}`);
            return {
                success: false,
                errorMessage: error.message
            };
        }
    }

    /**
     * Bridge tokens from Flow EVM using LayerZero
     * @param params Bridge parameters
     * @returns Bridge result
     */
    async bridgeFromFlowEVM(params: BridgeParams): Promise<BridgeResult> {
        try {
            elizaLogger.info(`Bridging ${params.amount} ${params.token} from Flow EVM to ${params.destinationChain} using LayerZero`);

            // Get destination chain config
            const destChainConfig = CHAIN_CONFIGS[params.destinationChain];
            if (!destChainConfig) {
                throw new Error(`Destination chain ${params.destinationChain} not supported`);
            }

            // Get Flow EVM chain config
            const flowEvmChainConfig = CHAIN_CONFIGS['flow-evm'];
            if (!flowEvmChainConfig) {
                throw new Error('Flow EVM chain configuration not found');
            }

            // Get token config
            const tokenConfig = TOKENS[params.token];
            if (!tokenConfig) {
                throw new Error(`Token ${params.token} not supported`);
            }

            // Get token address on Flow EVM
            const tokenAddress = tokenConfig.addresses['flow-evm'];
            if (!tokenAddress) {
                throw new Error(`Token ${params.token} not available on Flow EVM`);
            }

            // Get token address on destination chain
            const destTokenAddress = tokenConfig.addresses[params.destinationChain];
            if (!destTokenAddress) {
                throw new Error(`Token ${params.token} not available on ${params.destinationChain}`);
            }

            // Calculate amount with decimals
            const decimals = tokenConfig.decimals;
            const amountWithDecimals = params.amount * (10 ** decimals);

            // Calculate minimum amount based on slippage
            const minAmount = amountWithDecimals * (1 - (params.slippage || 0.5) / 100);

            // In a real implementation, this would:
            // 1. Connect to Flow EVM using a web3 provider
            // 2. Create a contract instance for the OFT token
            // 3. Estimate gas using quoteSend
            // 4. Execute the send transaction

            // For demonstration, we'll simulate the process with the correct parameters

            // Convert recipient address to bytes32 format (required by LayerZero)
            const recipient = params.recipient || this.walletService.address;
            // In a real implementation, this would be:
            // const recipientBytes32 = ethers.utils.hexZeroPad(recipient, 32);
            const recipientBytes32 = `0x${recipient.substring(2).padStart(64, '0')}`;

            // Get the destination endpoint ID from the chain config
            const dstEid = destChainConfig.endpointId;

            // Compose message (empty for simple transfers)
            const composeMsg = '0x';

            // Quote the fee for the transfer
            // In a real implementation, this would call the quoteSend function on the OFT contract
            const fee = await this.estimateGas(
                'flow-evm',
                params.destinationChain,
                params.token,
                params.amount
            );

            // Execute the send transaction
            // In a real implementation, this would call the send function on the OFT contract

            // For now, we'll return a simulated transaction ID
            return {
                success: true,
                txId: "0x" + Math.random().toString(16).substring(2, 10) + Math.random().toString(16).substring(2, 10)
            };

        } catch (error) {
            elizaLogger.error(`Error bridging from Flow EVM: ${error.message}`);
            return {
                success: false,
                errorMessage: error.message
            };
        }
    }

    /**
     * Estimate gas for a LayerZero transaction
     * @param sourceChain Source chain name
     * @param destinationChain Destination chain name
     * @param token Token symbol
     * @param amount Amount to bridge
     * @returns Estimated gas in wei
     */
    async estimateGas(sourceChain: string, destinationChain: string, token: string, amount: number): Promise<string> {
        try {
            // In a real implementation, this would:
            // 1. Connect to the source chain using a web3 provider
            // 2. Create a contract instance for the OFT token
            // 3. Call the quoteSend function to get the fee estimate

            // Get source chain config
            const sourceChainConfig = CHAIN_CONFIGS[sourceChain];
            if (!sourceChainConfig) {
                throw new Error(`Source chain ${sourceChain} not supported`);
            }

            // Get destination chain config
            const destChainConfig = CHAIN_CONFIGS[destinationChain];
            if (!destChainConfig) {
                throw new Error(`Destination chain ${destinationChain} not supported`);
            }

            // Get token config
            const tokenConfig = TOKENS[token];
            if (!tokenConfig) {
                throw new Error(`Token ${token} not supported`);
            }

            // Get token address on source chain
            const tokenAddress = tokenConfig.addresses[sourceChain];
            if (!tokenAddress) {
                throw new Error(`Token ${token} not available on ${sourceChain}`);
            }

            // Calculate amount with decimals
            const decimals = tokenConfig.decimals;
            const amountWithDecimals = amount * (10 ** decimals);

            // For demonstration, we'll return a simulated fee
            // In a real implementation, this would be the result of calling quoteSend

            // Base fee varies by destination chain
            const baseFee = {
                'ethereum': '0.01',
                'arbitrum': '0.005',
                'optimism': '0.005',
                'base': '0.004',
                'polygon': '0.003',
                'flow-evm': '0.002'
            };

            // Convert to wei (assuming the fee is in ETH)
            const feeInEth = baseFee[destinationChain] || '0.01';
            const feeInWei = parseFloat(feeInEth) * 1e18;

            return feeInWei.toString();

        } catch (error) {
            elizaLogger.error(`Error estimating gas: ${error.message}`);
            throw error;
        }
    }
}
