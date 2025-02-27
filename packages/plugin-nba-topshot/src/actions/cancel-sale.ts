import * as fcl from '@onflow/fcl';
import * as t from '@onflow/types';

export interface CancelSaleParams {
  momentId: number;
}

export interface CancelSaleResult {
  transactionId: string;
  success: boolean;
}

export async function cancelSale({ momentId }: CancelSaleParams): Promise<CancelSaleResult> {
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
    console.error('Error canceling sale:', error);
    throw error;
  }
}