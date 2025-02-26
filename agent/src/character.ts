import {
    type Character,
    ModelProviderName,
} from "@elizaos/core";
import { basicFlowPlugin } from "@elizaos-plugins/plugin-flow-advanced";
import { defaultCharacter as elizaDefaultCharacter } from "./defaultCharacter";

const localDefaultCharacter: Character = {
    modelProvider: ModelProviderName.DEEPSEEK,
    plugins: [basicFlowPlugin],
} as Character;

export const defaultCharacter: Character = Object.assign(
    {},
    elizaDefaultCharacter,
    localDefaultCharacter
);

export default defaultCharacter;
