# NBA TopShot Plugin for Eliza

This plugin enables trading NBA TopShot moments through the Eliza platform. It provides functionality to list, buy, and manage NBA TopShot NFTs using Flow blockchain.

## Features

- View owned TopShot moments
- List moments for sale
- Purchase moments from the marketplace
- Cancel sale listings
- View market prices and metadata

## Installation

```bash
pnpm install @eliza/plugin-nba-topshot
```

## Configuration

The plugin requires Flow network configuration:

```typescript
import { TopShotPlugin } from '@eliza/plugin-nba-topshot';

const plugin = new TopShotPlugin({
  network: 'mainnet', // or 'testnet'
  accessNode: 'https://rest-mainnet.onflow.org',
  walletDiscovery: 'https://fcl-discovery.onflow.org/authn'
});
```

## Usage

### Initialize the Plugin

```typescript
await plugin.initialize();
```

### View Owned Moments

```typescript
const moments = await plugin.getMoments('0x1234...'); // Flow address
```

### List a Moment for Sale

```typescript
await plugin.listMomentForSale(momentId, price);
```

### Purchase a Moment

```typescript
await plugin.purchaseMoment(momentId);
```

### Cancel a Sale

```typescript
await plugin.cancelSale(momentId);
```

### Get Market Prices

```typescript
// Get all listings
const listings = await plugin.getMarketPrices();

// Filter by set or play
const filteredListings = await plugin.getMarketPrices(setId, playId);
```

## Dependencies

- Flow Client Library (FCL)
- NBA TopShot Smart Contracts
- Dapper Utility Coin (DUC) for transactions

## Contract Addresses

The plugin uses the following Flow contract addresses:

- TopShot: `0x0b2a3299cc857e29`
- TopShotMarketV3: `0xc1e4f4f4c4257510`
- DapperUtilityCoin: `0x82ec283f88a62e65`

## Error Handling

All methods throw errors with descriptive messages when operations fail. It's recommended to implement proper error handling:

```typescript
try {
  await plugin.listMomentForSale(momentId, price);
} catch (error) {
  console.error('Failed to list moment:', error);
}
```

## Development

```bash
# Install dependencies
npm install

# Build the plugin
npm run build

# Run tests
npm test
```

## License

MIT