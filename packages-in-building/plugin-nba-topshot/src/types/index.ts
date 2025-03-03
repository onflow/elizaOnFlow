// Types for the NBA Top Shot plugin

export interface MarketItem {
  momentId: number;
  price: number;
  seller: string;
  metadata: {
    playerName: string;
    playType: string;
    serialNumber: number;
  };
}

// Keep the original function for backward compatibility
export interface GetMarketPricesParams {
  setId?: number;
  playId?: number;
}

export interface GetMarketPricesResult {
  items: MarketItem[];
}

export interface Moment {
  id: number;
  playId: number;
  setId: number;
  serialNumber: number;
  metadata: {
    playerName: string;
    playType: string;
    teamAtMoment: string;
    dateOfMoment: string;
    description: string;
  };
}

export interface GetMomentsResult {
  moments: Moment[];
}

// Plugin configuration type
export interface TopShotPluginConfig {
  network: 'mainnet' | 'testnet';
  accessNode: string;
  walletDiscovery: string;
}
