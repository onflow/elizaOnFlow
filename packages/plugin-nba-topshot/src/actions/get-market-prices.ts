import * as fcl from '@onflow/fcl';
import * as t from '@onflow/types';
import { MarketItem } from '../services/market.service';

export interface GetMarketPricesParams {
  setId?: number;
  playId?: number;
}

export interface GetMarketPricesResult {
  items: MarketItem[];
}

export async function getMarketPrices({ setId, playId }: GetMarketPricesParams): Promise<GetMarketPricesResult> {
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
    const response = await fcl.query({
      cadence: script,
      args: (arg: any, t: any) => [
        arg(setId, t.Optional(t.UInt32)),
        arg(playId, t.Optional(t.UInt32))
      ]
    });

    return {
      items: transformMarketData(response)
    };
  } catch (error) {
    console.error('Error fetching market prices:', error);
    throw error;
  }
}

function transformMarketData(rawItems: any[]): MarketItem[] {
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