import { injectable } from 'inversify';
import * as fcl from '@onflow/fcl';
import * as t from '@onflow/types';

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

@injectable()
export class TopShotService {
  private readonly CONTRACT_ADDRESSES = {
    TopShot: '0x0b2a3299cc857e29',
    MetadataViews: '0x1d7e57aa55817448'
  };

  async initialize(): Promise<void> {
    // Configure contract addresses based on network
    const network = await fcl.config().get('flow.network');

    if (network === 'testnet') {
      this.CONTRACT_ADDRESSES.TopShot = '0x877931736ee77cff';
      this.CONTRACT_ADDRESSES.MetadataViews = '0x631e88ae7f1d7c20';
    }

    // Verify contract access
    try {
      const script = `
        import TopShot from ${this.CONTRACT_ADDRESSES.TopShot}

        pub fun main(): Bool {
          return true
        }
      `;

      await fcl.query({
        cadence: script
      });
    } catch (error) {
      throw new Error('Failed to initialize TopShot service: Unable to access TopShot contract');
    }
  }

  async getMoments(address: string): Promise<GetMomentsResult> {
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
        moments: this.transformMomentData(response)
      };
    } catch (error) {
      console.error('Error fetching moments:', error);
      throw error;
    }
  }

  async getMomentMetadata(momentId: number): Promise<any> {
    const script = `
      import TopShot from 0xTOPSHOTADDRESS
      import MetadataViews from 0xMETADATAVIEWSADDRESS

      pub fun main(momentId: UInt64): {String: String} {
        let account = getAccount(0xTOPSHOTADDRESS)

        if let collection = account.getCapability(/public/MomentCollection)
                            .borrow<&{TopShot.MomentCollectionPublic}>() {
          if let moment = collection.borrowMoment(id: momentId) {
            return moment.getMetadata()
          }
        }

        return {}
      }
    `;

    try {
      return await fcl.query({
        cadence: script,
        args: (arg: any, t: any) => [arg(momentId, t.UInt64)]
      });
    } catch (error) {
      console.error('Error fetching moment metadata:', error);
      throw error;
    }
  }

  private transformMomentData(rawMoments: any[]): Moment[] {
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
}