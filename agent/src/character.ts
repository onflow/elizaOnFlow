import {
    type Character,
    ModelProviderName,
} from "@elizaos/core";
import { advancedFlowPlugin } from "@elizaos-plugins/plugin-flow-advanced";
import { defaultCharacter as elizaDefaultCharacter } from "./defaultCharacter";

export const defaultCharacter: Character = Object.assign(
    {},
    elizaDefaultCharacter,
    {
        modelProvider: ModelProviderName.DEEPSEEK,
        plugins: [advancedFlowPlugin],
    }
);

export default defaultCharacter;
