# Eliza Bridge Plugin

A plugin for Eliza on Flow that enables bridging and swapping tokens between Flow and other ecosystems using LayerZero's OFT (Omnichain Fungible Token) standard.

## Features

- Bridge tokens from other ecosystems to Flow EVM using LayerZero
- Bridge tokens from Flow EVM to other ecosystems using LayerZero
- Swap tokens on Flow EVM
- Check token balances across multiple chains

## Supported Chains

- Flow EVM (Chain ID: 747, LayerZero Endpoint ID: 30747)
- Ethereum (Chain ID: 1, LayerZero Endpoint ID: 30101)
- Arbitrum (Chain ID: 42161, LayerZero Endpoint ID: 30110)
- Optimism (Chain ID: 10, LayerZero Endpoint ID: 30111)
- Base (Chain ID: 8453, LayerZero Endpoint ID: 30184)
- Polygon (Chain ID: 137, LayerZero Endpoint ID: 30109)

## Supported Tokens

- FLOW
- USDC
- ETH

## Installation

```bash
npm install @elizaos-plugins/plugin-bridge
```

## Usage

### Register the plugin

```typescript
import { bridgePlugin } from '@elizaos-plugins/plugin-bridge';

// In your Eliza configuration
const config = {
  plugins: [
    // other plugins
    bridgePlugin,
  ],
};
```

### Bridge Tokens

```typescript
// Bridge 100 USDC from Ethereum to Flow EVM
const result = await agent.execute("Bridge 100 USDC from Ethereum to Flow EVM");

// Bridge 50 FLOW from Flow EVM to Arbitrum
const result = await agent.execute("Bridge 50 FLOW from Flow EVM to Arbitrum");
```

### Swap Tokens

```typescript
// Swap 50 FLOW to USDC on Flow EVM
const result = await agent.execute("Swap 50 FLOW to USDC");

// Swap with custom slippage
const result = await agent.execute("Swap 100 USDC to FLOW with 1% slippage");
```

### Check Balances

```typescript
// Check FLOW balance on Flow EVM
const result = await agent.execute("Check my FLOW balance on Flow EVM");

// Check all token balances on Ethereum
const result = await agent.execute("Show my balances on Ethereum");
```

## Technical Details

### LayerZero Integration

This plugin uses LayerZero's OFT (Omnichain Fungible Token) standard for cross-chain token transfers. The OFT standard allows for seamless token transfers between different blockchains without the need for wrapped tokens.

#### How it works:

1. **Token Bridging**: When a user initiates a token bridge, the plugin:
   - Connects to the source chain
   - Approves the OFT contract to spend the tokens
   - Calls the `send` function on the OFT contract with the appropriate parameters
   - The OFT contract locks the tokens on the source chain and mints equivalent tokens on the destination chain

2. **Fee Estimation**: Before executing a bridge transaction, the plugin estimates the fees by calling the `quoteSend` function on the OFT contract.

3. **Address Conversion**: LayerZero requires recipient addresses to be in bytes32 format. The plugin handles this conversion automatically.

### Token Swapping

For token swapping on Flow EVM, the plugin connects to decentralized exchanges (DEXs) to execute swaps with the following process:

1. Calculate the amount with decimals
2. Calculate minimum amount out based on slippage
3. Execute the swap through the DEX
4. Return the transaction details

## Development

### Build

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

### Lint

```bash
npm run lint
```

## Resources

- [LayerZero Documentation](https://docs.layerzero.network/)
- [OFT Standard](https://docs.layerzero.network/v2/developers/evm/oft/quickstart)
- [Flow EVM Documentation](https://developers.flow.com/evm)

## License

MIT