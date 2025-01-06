import { inject, injectable, unmanaged } from "inversify";
import type {
    InjectablePlugin,
    PluginFactory,
    PluginOptions,
} from "./interfaces";
import { FACTORIES } from "./symbols";
import { Plugin } from "@elizaos/core";

/**
 * Base abstract class for injectable plugins
 */
@injectable()
export abstract class BaseInjactablePlugin implements InjectablePlugin {
    // -------- Injects --------

    @inject(FACTORIES.PluginFactory)
    public readonly factory: PluginFactory;

    constructor(
        @unmanaged()
        protected readonly opts: PluginOptions
    ) {}

    // -------- Methods --------

    /**
     * Get the instance of the plugin
     * @returns
     * @memberof BaseInjactablePlugin
     * @implements {InjectablePlugin}
     */
    get(): Plugin {
        return this.factory(this.opts);
    }
}
