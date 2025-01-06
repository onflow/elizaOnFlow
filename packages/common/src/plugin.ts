import { injectable } from "inversify";
import {
    BaseInjactablePlugin,
    globalContainer,
    type PluginOptions,
} from "@fixes-ai/core";
import { TransferAction } from "./actions";

/**
 * Basic Flow Plugin Options
 * Required for the plugin to be loaded, will be exported as default
 */
export const basicFlowPluginOptions: PluginOptions = {
    name: "flow-basic",
    description: "Flow Plugin for Eliza, with basic actions like transfer",
    actions: [TransferAction],
    providers: [],
    evaluators: [],
    services: [],
};

/**
 * (Optional) Basic Flow Plugin, for future fully injactable usage
 */
@injectable()
export class BasicFlowPlugin extends BaseInjactablePlugin {
    constructor() {
        super(basicFlowPluginOptions);
    }
}
// Bind the plugin to the global container
globalContainer.bind<BasicFlowPlugin>(BasicFlowPlugin).toSelf();
