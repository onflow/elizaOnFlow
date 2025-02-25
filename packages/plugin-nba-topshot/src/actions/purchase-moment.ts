import * as fcl from '@onflow/fcl';
import * as t from '@onflow/types';

export interface PurchaseMomentParams {
  momentId: number;
}

export interface PurchaseMomentResult {
  transactionId: string;
  success: boolean;
}

export async function purchaseMoment({ momentId }: PurchaseMomentParams): Promise<PurchaseMomentResult> {
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
    const txId = await fcl.mutate({
      cadence: transaction,
      args: (arg: any, t: any) => [arg(momentId, t.UInt64)],
      limit: 1000
    });

    const sealed = await fcl.tx(txId).onceSealed();

    return {
      transactionId: txId,
      success: sealed.status === 4
    };
  } catch (error) {
    console.error('Error purchasing moment:', error);
    throw error;
  }
}