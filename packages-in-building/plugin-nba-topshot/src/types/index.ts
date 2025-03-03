// Export types from services
export * from '../services/topshot.service';
export * from '../services/market.service';

// Plugin configuration type
export interface TopShotPluginConfig {
  network: 'mainnet' | 'testnet';
  accessNode: string;
  walletDiscovery: string;
}