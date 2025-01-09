import { interfaces } from "inversify";
import type {
    ExtendedPlugin,
    PluginFactory,
    PluginOptions,
} from "../interfaces";
import { CacheProvider, WalletProvider } from "../providers";

/**
 * Create a plugin factory
 */
export function createPlugin(ctx: interfaces.Context): PluginFactory {
    return async (opts: PluginOptions): Promise<ExtendedPlugin> => {
        // Create a new plugin object
        const plugin: ExtendedPlugin = {
            name: opts.name,
            description: opts.description,
            options: opts,
        };

        // Handle actions - if provided, map through them
        // For class constructors (functions), get instance from container
        // For regular actions, use as-is
        if (typeof opts.actions !== "undefined") {
            plugin.actions = await Promise.all(
                opts.actions.map(
                    async (action) =>
                        typeof action === "function"
                            ? await ctx.container.getAsync(action) // Get instance from DI container
                            : action // Use action directly
                )
            );
        }

        // Handle providers - if provided, map through them
        // For class constructors (functions), get instance from container
        // For regular providers, use as-is
        if (typeof opts.providers !== "undefined") {
            plugin.providers = await Promise.all(
                opts.providers.map(async (provider) => {
                    if (typeof provider === "function") {
                        return await ctx.container.getAsync(provider); // Get instance from DI container
                    }
                    return provider; // Use provider directly
                })
            );
            // Add WalletProvider if not already present
            if (
                !plugin.providers.some(
                    (provider) => provider instanceof WalletProvider
                )
            ) {
                plugin.providers.unshift(
                    await ctx.container.getAsync(WalletProvider)
                );
            }
            // Add CacheProvider by default
            if (
                !plugin.providers.some(
                    (provider) => provider instanceof CacheProvider
                )
            ) {
                plugin.providers.unshift(
                    await ctx.container.getAsync(CacheProvider)
                );
            }
        }

        // Handle evaluators - if provided, map through them
        // For class constructors (functions), get instance from container
        // For regular evaluators, use as-is
        if (typeof opts.evaluators !== "undefined") {
            plugin.evaluators = await Promise.all(
                opts.evaluators.map(
                    async (evaluator) =>
                        typeof evaluator === "function"
                            ? await ctx.container.getAsync(evaluator) // Get instance from DI container
                            : evaluator // Use evaluator directly
                )
            );
        }

        // Handle services - if provided, assign directly
        if (typeof opts.services !== "undefined") {
            plugin.services = opts.services;
        }

        // Handle clients - if provided, assign directly
        if (typeof opts.clients !== "undefined") {
            plugin.clients = opts.clients;
        }
        return plugin;
    };
}
