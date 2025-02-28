import { z } from "zod";
import { inject, injectable } from "inversify";
import {
    elizaLogger,
    type ActionExample,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@elizaos/core";
import { type ActionOptions, globalContainer, property } from "@elizaos/plugin-di";
import { BaseFlowInjectableAction } from "@fixes-ai/core";
import { TopShotService } from "../services/topshot.service";
import { Moment } from "../services/topshot.service";

export class GetMomentsContent {
    @property({
        description: "The Flow address to get moments for",
        schema: z.string(),
    })
    address: string;
}

@injectable()
export class GetMomentsAction extends BaseFlowInjectableAction<GetMomentsContent> {
    constructor(
        @inject(TopShotService)
        private readonly topShotService: TopShotService,
    ) {
        super({
            name: "get-moments",
            description: "Get NBA TopShot moments for a Flow address",
            examples: [
                {
                    content: {
                        address: "0x1234567890abcdef",
                    },
                },
            ],
            contentClass: GetMomentsContent,
        });
    }

    async validate(_runtime: IAgentRuntime, _message: Memory): Promise<boolean> {
        return true;
    }

    async execute(
        content: GetMomentsContent,
        _runtime: IAgentRuntime,
        _message: Memory,
        _state?: State,
        _callback?: HandlerCallback,
    ) {
        try {
            const result = await this.topShotService.getMoments(content.address);
            return {
                success: true,
                data: result,
            };
        } catch (error) {
            elizaLogger.error("Error getting moments:", error);
            return {
                success: false,
                error: `Failed to get moments: ${error}`,
            };
        }
    }
}

// Keep the original function for backward compatibility
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
    const topShotService = globalContainer.get(TopShotService);
    return await topShotService.getMoments(address);
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