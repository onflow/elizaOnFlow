import {
    Character,
    ModelProviderName,
    defaultCharacter as DefaultElizaCharacter,
} from "@elizaos/core";

const localDefaultCharacter: Character = {
    modelProvider: ModelProviderName.OLLAMA,
} as Character;

export const defaultCharacter: Character = Object.assign(
    {},
    DefaultElizaCharacter,
    localDefaultCharacter
);

export default defaultCharacter;
