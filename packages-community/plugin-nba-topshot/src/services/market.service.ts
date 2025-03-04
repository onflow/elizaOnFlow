import { inject, injectable } from 'inversify';
import { Service, type ServiceType } from '@elizaos/core';
import type { GetMarketPricesResult, MarketItem } from '../types';
import { FlowWalletService, type TransactionSentResponse } from '@elizaos-plugins/plugin-flow';
import { globalContainer } from '@elizaos-plugins/plugin-di';

@injectable()
export class MarketService extends Service {
    // Inject the Flow Eliza Provider
    @inject(FlowWalletService)
    private readonly walletService: FlowWalletService;

    private readonly CONTRACT_ADDRESSES = {
        TopShot: '0x0b2a3299cc857e29',
        TopShotMarketV3: '0xc1e4f4f4c4257510',
        DapperUtilityCoin: '0x82ec283f88a62e65',
        FungibleToken: '0xf233dcee88fe0abe'
    };

    static get serviceType(): ServiceType {
        return "market" as ServiceType;
    }

    async initialize(): Promise<void> {
        // Configure contract addresses based on network
        const network = this.walletService.connector.network;

        if (network === 'testnet') {
            this.CONTRACT_ADDRESSES.TopShot = '0x877931736ee77cff';
            this.CONTRACT_ADDRESSES.TopShotMarketV3 = '0x547f93a11d1cc9c9';
            this.CONTRACT_ADDRESSES.DapperUtilityCoin = '0xead892083b3e2c6c';
            this.CONTRACT_ADDRESSES.FungibleToken = '0x9a0766d93b6608b7';
        }

        // Verify market contract access
        try {
            const script = `
        import TopShotMarketV3 from ${this.CONTRACT_ADDRESSES.TopShotMarketV3}

        pub fun main(): Bool {
            return true
        }
        `;

            await this.walletService.executeScript(script, () => [], true);
        } catch (error) {
            throw new Error('Failed to initialize Market service: Unable to access TopShotMarketV3 contract');
        }

        // Verify DUC contract access
        try {
            const script = `
        import DapperUtilityCoin from ${this.CONTRACT_ADDRESSES.DapperUtilityCoin}

        pub fun main(): Bool {
          return true
        }
      `;
            await this.walletService.executeScript(script, () => [], true);
        } catch (error) {
            throw new Error('Failed to initialize Market service: Unable to access DapperUtilityCoin contract');
        }
    }

    async getMarketPrices(setId?: number, playId?: number): Promise<GetMarketPricesResult> {
        const script = `
      import TopShot from 0xTOPSHOTADDRESS
      import TopShotMarketV3 from 0xMARKETADDRESS

      pub fun main(setId: UInt32?, playId: UInt32?): [{String: AnyStruct}] {
        let marketCollection = getAccount(0xMARKETADDRESS)
          .getCapability(/public/TopShotSaleCollection)
          .borrow<&TopShotMarketV3.SaleCollection{TopShotMarketV3.SalePublic}>()
          ?? panic("Could not borrow market collection")

        let items: [{String: AnyStruct}] = []
        let momentIds = marketCollection.getIDs()

        for id in momentIds {
          if let price = marketCollection.getPrice(tokenID: id) {
            if let moment = marketCollection.borrowMoment(id: id) {
              let data = moment.data

              // Filter by setId and playId if provided
              if let setId = setId {
                if data.setID != setId {
                  continue
                }
              }

              if let playId = playId {
                if data.playID != playId {
                  continue
                }
              }

              items.append({
                "momentId": data.id,
                "price": price,
                "seller": marketCollection.owner?.address,
                "metadata": data.metadata
              })
            }
          }
        }

        return items
      }
    `;

        try {
            const response = await this.walletService.executeScript(script, (arg, t) => [
                arg(setId, t.Optional(t.UInt32)),
                arg(playId, t.Optional(t.UInt32))
            ], []);

            return {
                items: this.transformMarketData(response)
            };
        } catch (error) {
            console.error('Error fetching market prices:', error);
            throw error;
        }
    }

    async listMoment(momentId: number, price: number): Promise<TransactionSentResponse> {
        const transaction = `
      import TopShot from 0xTOPSHOTADDRESS
      import TopShotMarketV3 from 0xMARKETADDRESS
      import FungibleToken from 0xFUNGIBLETOKENADDRESS

      transaction(momentId: UInt64, price: UFix64) {
        let saleCollection: &TopShotMarketV3.SaleCollection

        prepare(acct: AuthAccount) {
          // Get a reference to the seller's sale collection
          self.saleCollection = acct.borrow<&TopShotMarketV3.SaleCollection>(
            from: /storage/TopShotSaleCollection
          ) ?? panic("Could not borrow seller's sale collection")
        }

        execute {
          // List the moment for sale
          self.saleCollection.listForSale(tokenID: momentId, price: price)
        }
      }
    `;

        try {
            return await this.walletService.sendTransaction(
                transaction,
                (arg, t) => [
                    arg(momentId, t.UInt64),
                    arg(price.toFixed(8), t.UFix64)
                ]
            );
        } catch (error) {
            console.error('Error listing moment for sale:', error);
            throw error;
        }
    }

    async purchaseMoment(momentId: number): Promise<TransactionSentResponse> {
        const transaction = `
      import TopShot from 0xTOPSHOTADDRESS
      import TopShotMarketV3 from 0xMARKETADDRESS
      import FungibleToken from 0xFUNGIBLETOKENADDRESS
      import DapperUtilityCoin from 0xDUCADDRESS

      transaction(momentId: UInt64) {
        let marketCollection: &TopShotMarketV3.SaleCollection{TopShotMarketV3.SalePublic}
        let buyerCollection: &TopShot.Collection
        let ducVault: &DapperUtilityCoin.Vault

        prepare(acct: AuthAccount) {
          // Get the references to the buyer's collection
          self.buyerCollection = acct.borrow<&TopShot.Collection>(
            from: /storage/MomentCollection
          ) ?? panic("Could not borrow buyer's collection")

          // Get DUC vault reference
          self.ducVault = acct.borrow<&DapperUtilityCoin.Vault>(
            from: /storage/dapperUtilityCoinVault
          ) ?? panic("Could not borrow DUC vault")

          // Get a reference to the market collection
          self.marketCollection = getAccount(0xMARKETADDRESS)
            .getCapability(/public/TopShotSaleCollection)
            .borrow<&TopShotMarketV3.SaleCollection{TopShotMarketV3.SalePublic}>()
            ?? panic("Could not borrow market collection")
        }

        execute {
          // Get the price of the moment
          let price = self.marketCollection.getPrice(tokenID: momentId)
            ?? panic("No price found for moment")

          // Withdraw the tokens to purchase the moment
          let tokens <- self.ducVault.withdraw(amount: price)

          // Purchase the moment
          let moment <- self.marketCollection.purchase(
            tokenID: momentId,
            buyTokens: <-tokens
          )

          // Deposit the purchased moment into the buyer's collection
          self.buyerCollection.deposit(token: <-moment)
        }
      }
    `;

        try {
            return await this.walletService.sendTransaction(
                transaction,
                (arg, t) => [arg(momentId, t.UInt64)]
            );
        } catch (error) {
            console.error('Error purchasing moment:', error);
            throw error;
        }
    }

    async cancelSale(momentId: number): Promise<TransactionSentResponse> {
        const transaction = `
      import TopShotMarketV3 from 0xMARKETADDRESS

      transaction(momentId: UInt64) {
        let saleCollection: &TopShotMarketV3.SaleCollection

        prepare(acct: AuthAccount) {
          self.saleCollection = acct.borrow<&TopShotMarketV3.SaleCollection>(
            from: /storage/TopShotSaleCollection
          ) ?? panic("Could not borrow sale collection")
        }

        execute {
          self.saleCollection.cancelSale(tokenID: momentId)
        }
      }
    `;

        try {
            return await this.walletService.sendTransaction(
                transaction,
                (arg, t) => [arg(momentId, t.UInt64)]
            );
        } catch (error) {
            console.error('Error canceling sale:', error);
            throw error;
        }
    }

    private transformMarketData(rawItems: any[]): MarketItem[] {
        return rawItems.map(item => ({
            momentId: Number(item.momentId),
            price: Number(item.price),
            seller: item.seller,
            metadata: {
                playerName: item.metadata.PlayerName || '',
                playType: item.metadata.PlayType || '',
                serialNumber: Number(item.metadata.SerialNumber) || 0
            }
        }));
    }
}

globalContainer.bind<MarketService>(MarketService).toSelf();
