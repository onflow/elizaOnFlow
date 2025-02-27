import {
    type Character,
    ModelProviderName,
} from "@elizaos/core";
import diPlugin from "@elizaos-plugins/plugin-di";
import { advancedFlowPlugin } from "@elizaos-plugins/plugin-flow-advanced";
import { defaultCharacter as elizaDefaultCharacter } from "./defaultCharacter";

export const defaultCharacter: Character = Object.assign(
    {},
    elizaDefaultCharacter,
    {
        modelProvider: ModelProviderName.DEEPSEEK,
        plugins: [advancedFlowPlugin],
        postProcessors: [diPlugin],
    }
);

export default defaultCharacter;
