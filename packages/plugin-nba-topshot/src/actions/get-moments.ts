import * as fcl from '@onflow/fcl';
import * as t from '@onflow/types';
import { Moment } from '../services/topshot.service';

export interface GetMomentsParams {
  address: string;
}

export interface GetMomentsResult {
  moments: Moment[];
}

export async function getMoments({ address }: GetMomentsParams): Promise<GetMomentsResult> {
  const script = `
    import TopShot from 0xTOPSHOTADDRESS
    import MetadataViews from 0xMETADATAVIEWSADDRESS

    pub fun main(address: Address): [TopShot.MomentData] {
      let account = getAccount(address)

      if let collection = account.getCapability(/public/MomentCollection)
                          .borrow<&{TopShot.MomentCollectionPublic}>() {
        let momentIds = collection.getIDs()
        let moments: [TopShot.MomentData] = []

        for id in momentIds {
          if let moment = collection.borrowMoment(id: id) {
            moments.append(moment.data)
          }
        }

        return moments
      }

      return []
    }
  `;

  try {
    const response = await fcl.query({
      cadence: script,
      args: (arg: any, t: any) => [arg(address, t.Address)]
    });

    return {
      moments: transformMomentData(response)
    };
  } catch (error) {
    console.error('Error fetching moments:', error);
    throw error;
  }
}

function transformMomentData(rawMoments: any[]): Moment[] {
  return rawMoments.map(moment => ({
    id: Number(moment.id),
    playId: Number(moment.playID),
    setId: Number(moment.setID),
    serialNumber: Number(moment.serialNumber),
    metadata: {
      playerName: moment.metadata.PlayerName || '',
      playType: moment.metadata.PlayType || '',
      teamAtMoment: moment.metadata.TeamAtMoment || '',
      dateOfMoment: moment.metadata.DateOfMoment || '',
      description: moment.metadata.Description || ''
    }
  }));
}