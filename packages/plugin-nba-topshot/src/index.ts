import { Plugin } from '@eliza/core';
import * as fcl from '@onflow/fcl';
import { TopShotService } from './services/topshot.service';
import { MarketService } from './services/market.service';

export interface TopShotPluginConfig {
  network: 'mainnet' | 'testnet';
  accessNode: string;
  walletDiscovery: string;
}

export class TopShotPlugin implements Plugin {
  private topShotService: TopShotService;
  private marketService: MarketService;

  constructor(config: TopShotPluginConfig) {
    fcl.config()
      .put('accessNode.api', config.accessNode)
      .put('discovery.wallet', config.walletDiscovery)
      .put('flow.network', config.network);

    this.topShotService = new TopShotService();
    this.marketService = new MarketService();
  }

  async initialize(): Promise<void> {
    await this.topShotService.initialize();
    await this.marketService.initialize();
  }

  getName(): string {
    return 'nba-topshot';
  }

  getDescription(): string {
    return 'NBA TopShot trading plugin for Eliza';
  }


  async getMoments(address: string) {
    return this.topShotService.getMoments(address);
  }

  async listMomentForSale(momentId: number, price: number) {
    return this.marketService.listForSale(momentId, price);
  }

  async purchaseMoment(momentId: number) {
    return this.marketService.purchase(momentId);
  }

  async cancelSale(momentId: number) {
    return this.marketService.cancelSale(momentId);
  }

  async getMarketPrices(setId?: number, playId?: number) {
    return this.marketService.getPrices(setId, playId);
  }
}