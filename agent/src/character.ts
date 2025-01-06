import {
    Character,
    ModelProviderName,
    defaultCharacter as DefaultElizaCharacter,
} from "@elizaos/core";
import { basicFlowPluginOptions } from "@fixes-ai/common";

const localDefaultCharacter: Character = {
    modelProvider: ModelProviderName.OLLAMA,
    plugins: [basicFlowPluginOptions],
} as Character;

export const defaultCharacter: Character = Object.assign(
    {},
    DefaultElizaCharacter,
    localDefaultCharacter
);

export default defaultCharacter;
