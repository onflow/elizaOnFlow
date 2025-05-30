import { inject, injectable } from 'inversify';
import { Service, type ServiceType } from '@elizaos/core';
import type { GetMomentsResult, Moment } from '../types';
import { FlowWalletService } from '@elizaos-plugins/plugin-flow';
import { globalContainer } from '@elizaos-plugins/plugin-di';

@injectable()
export class TopShotService extends Service {
    // Inject the Flow Eliza Provider
    @inject(FlowWalletService)
    private readonly walletService: FlowWalletService;

    private readonly CONTRACT_ADDRESSES = {
        TopShot: '0x0b2a3299cc857e29',
        MetadataViews: '0x1d7e57aa55817448'
    };

    static get serviceType(): ServiceType {
        return "topshot" as ServiceType;
    }

  async initialize(): Promise<void> {
    // Configure contract addresses based on network
    const network = this.walletService.connector.network;

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

      await this.walletService.executeScript(script, () => [], false);
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
      const response = await this.walletService.executeScript(script, (arg, t) => [arg(address, t.Address)], []);
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
      return await this.walletService.executeScript(script, (arg, t) => [arg(momentId, t.UInt64)], {});
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

globalContainer.bind<TopShotService>(TopShotService).toSelf();
