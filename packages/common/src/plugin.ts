import { injectable } from "inversify";
import { BaseInjactablePlugin } from "@fixes-ai/core";
import { TransferAction } from "./actions";

/**
 * Basic Flow Plugin
 */
@injectable()
export class BasicFlowPlugin extends BaseInjactablePlugin {
    constructor() {
        super({
            name: "flow-basic",
            description:
                "Flow Plugin for Eliza, with basic actions like transfer",
            actions: [TransferAction],
            providers: [],
            evaluators: [],
            services: [],
        });
    }
}
