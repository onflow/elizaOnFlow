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
pnpm install @elizaos/plugin-nba-topshot
```

## Usage

### Register the Plugin

The plugin follows the standard Eliza plugin structure and can be registered in your Eliza application:

```typescript
import { nbaTopShotPlugin } from '@elizaos/plugin-nba-topshot';
import { registerPlugin } from '@elizaos/plugin-di';

// Register the plugin
registerPlugin(nbaTopShotPlugin);
```

### Using Actions

The plugin provides several actions that can be used in your Eliza application:

#### Get Moments

```typescript
import { GetMomentsAction } from '@elizaos/plugin-nba-topshot';

// In your agent runtime context
const result = await runtime.executeAction(GetMomentsAction, {
  address: '0x1234...' // Flow address
});

// Access the moments
const moments = result.data.moments;
```

#### List a Moment for Sale

```typescript
import { ListMomentAction } from '@elizaos/plugin-nba-topshot';

const result = await runtime.executeAction(ListMomentAction, {
  momentId: 12345,
  price: 25.0
});
```

#### Purchase a Moment

```typescript
import { PurchaseMomentAction } from '@elizaos/plugin-nba-topshot';

const result = await runtime.executeAction(PurchaseMomentAction, {
  momentId: 12345
});
```

#### Cancel a Sale

```typescript
import { CancelSaleAction } from '@elizaos/plugin-nba-topshot';

const result = await runtime.executeAction(CancelSaleAction, {
  momentId: 12345
});
```

#### Get Market Prices

```typescript
import { GetMarketPricesAction } from '@elizaos/plugin-nba-topshot';

// Get all listings
const result = await runtime.executeAction(GetMarketPricesAction, {});

// Filter by set or play
const filteredResult = await runtime.executeAction(GetMarketPricesAction, {
  setId: 12345,
  playId: 67890
});
```

### Using Services Directly

For more advanced usage, you can also use the services directly:

```typescript
import { TopShotService, MarketService } from '@elizaos/plugin-nba-topshot';
import { globalContainer } from '@elizaos/plugin-di';

// Get service instances
const topShotService = globalContainer.get(TopShotService);
const marketService = globalContainer.get(MarketService);

// Use the services
const moments = await topShotService.getMoments('0x1234...');
const listings = await marketService.getMarketPrices();
```

### Backward Compatibility

The plugin also provides backward-compatible functions for simpler usage:

```typescript
import { getMoments, listMoment, purchaseMoment, cancelSale, getMarketPrices } from '@elizaos/plugin-nba-topshot';

// Use the functions
const { moments } = await getMoments({ address: '0x1234...' });
const result = await listMoment({ momentId: 12345, price: 25.0 });
```

## Contract Addresses

The plugin uses the following Flow contract addresses:

- TopShot: `0x0b2a3299cc857e29` (mainnet) / `0x877931736ee77cff` (testnet)
- TopShotMarketV3: `0xc1e4f4f4c4257510` (mainnet) / `0x547f93a11d1cc9c9` (testnet)
- DapperUtilityCoin: `0x82ec283f88a62e65` (mainnet) / `0xead892083b3e2c6c` (testnet)

## Error Handling

All methods include proper error handling and return structured responses:

```typescript
const result = await runtime.executeAction(ListMomentAction, {
  momentId: 12345,
  price: 25.0
});

if (result.success) {
  console.log('Moment listed successfully:', result.data);
} else {
  console.error('Failed to list moment:', result.error);
}
```

## Development

```bash
# Install dependencies
pnpm install

# Build the plugin
pnpm run build

# Run tests
pnpm test
```

## License

MIT