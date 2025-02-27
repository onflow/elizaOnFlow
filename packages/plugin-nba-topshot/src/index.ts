import { Plugin } from '@eliza/core';
import * as fcl from '@onflow/fcl';
import {
  getMoments,
  listMoment,
  purchaseMoment,
  cancelSale,
  getMarketPrices
} from './actions';

export interface TopShotPluginConfig {
  network: 'mainnet' | 'testnet';
  accessNode: string;
  walletDiscovery: string;
}

export class TopShotPlugin implements Plugin {
  constructor(config: TopShotPluginConfig) {
    // Configure Flow Client Library
    fcl.config()
      .put('accessNode.api', config.accessNode)
      .put('discovery.wallet', config.walletDiscovery)
      .put('flow.network', config.network);
  }

  async initialize(): Promise<void> {
    // Verify FCL configuration
    const network = await fcl.config().get('flow.network');
    if (!network) {
      throw new Error('Flow network not configured');
    }
  }

  getName(): string {
    return 'nba-topshot';
  }

  getDescription(): string {
    return 'NBA TopShot trading plugin for Eliza';
  }

  // Plugin methods using actions
  async getMoments(address: string) {
    return getMoments({ address });
  }

  async listMomentForSale(momentId: number, price: number) {
    return listMoment({ momentId, price });
  }

  async purchaseMoment(momentId: number) {
    return purchaseMoment({ momentId });
  }

  async cancelSale(momentId: number) {
    return cancelSale({ momentId });
  }

  async getMarketPrices(setId?: number, playId?: number) {
    return getMarketPrices({ setId, playId });
  }
}