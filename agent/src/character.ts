import {
    type Character,
    ModelProviderName,
    defaultCharacter as DefaultElizaCharacter,
} from "@elizaos/core";
import { basicFlowPlugin } from "@fixes-ai/common";

const localDefaultCharacter: Character = {
    modelProvider: ModelProviderName.DEEPSEEK,
    plugins: [basicFlowPlugin],
} as Character;

export const defaultCharacter: Character = Object.assign(
    {},
    DefaultElizaCharacter,
    localDefaultCharacter
);

export default defaultCharacter;
