import * as fcl from '@onflow/fcl';
import * as t from '@onflow/types';

export interface ListMomentParams {
  momentId: number;
  price: number;
}

export interface ListMomentResult {
  transactionId: string;
  success: boolean;
}

export async function listMoment({ momentId, price }: ListMomentParams): Promise<ListMomentResult> {
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
    const txId = await fcl.mutate({
      cadence: transaction,
      args: (arg: any, t: any) => [
        arg(momentId, t.UInt64),
        arg(price.toFixed(8), t.UFix64)
      ],
      limit: 1000
    });

    const sealed = await fcl.tx(txId).onceSealed();

    return {
      transactionId: txId,
      success: sealed.status === 4 // 4 means SEALED in FCL
    };
  } catch (error) {
    console.error('Error listing moment for sale:', error);
    throw error;
  }
}