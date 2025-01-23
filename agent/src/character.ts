import {
    type Character,
    ModelProviderName,
    defaultCharacter as DefaultElizaCharacter,
} from "@elizaos/core";
import { basicFlowPluginOptions } from "@fixes-ai/common";

const localDefaultCharacter: Character = {
    modelProvider: ModelProviderName.DEEPSEEK,
    plugins: [basicFlowPluginOptions],
} as Character;

export const defaultCharacter: Character = Object.assign(
    {},
    DefaultElizaCharacter,
    localDefaultCharacter
);

export default defaultCharacter;
