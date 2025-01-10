import { interfaces } from "inversify";
import { elizaLogger, Plugin } from "@elizaos/core";
import type { PluginFactory, PluginOptions } from "../types";
import { CacheProvider, WalletProvider } from "../providers";

/**
 * Create a plugin factory
 */
export function createPlugin(ctx: interfaces.Context): PluginFactory {
    return async (opts: PluginOptions): Promise<Plugin> => {
        // Create a new plugin object
        const plugin: Plugin = {
            name: opts.name,
            description: opts.description,
        };

        // Handle providers - if provided, map through them
        // For class constructors (functions), get instance from container
        // For regular providers, use as-is
        if (typeof opts.providers !== "undefined") {
            plugin.providers = (
                await Promise.all(
                    opts.providers.map(async (provider) => {
                        if (typeof provider === "function") {
                            try {
                                return await ctx.container.getAsync(provider); // Get instance from DI container
                            } catch (e) {
                                elizaLogger.error(
                                    `Error normalizing provider: ${provider.name}`,
                                    e.message
                                );
                                return undefined; // Return undefined if failed to get instance
                            }
                        }
                        return provider; // Use provider directly
                    })
                )
            ).filter((provider) => provider !== undefined); // Filter out undefined providers

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

        // Handle actions - if provided, map through them
        // For class constructors (functions), get instance from container
        // For regular actions, use as-is
        if (typeof opts.actions !== "undefined") {
            plugin.actions = (
                await Promise.all(
                    opts.actions.map(async (action) => {
                        if (typeof action === "function") {
                            try {
                                return await ctx.container.getAsync(action); // Get instance from DI container
                            } catch (e) {
                                elizaLogger.error(
                                    `Error normalizing action: ${action.name}`,
                                    e.message
                                );
                                console.error(e);
                                return undefined; // Return undefined if failed to get instance
                            }
                        } else {
                            return action; // Use action directly
                        }
                    })
                )
            ).filter((action) => action !== undefined); // Filter out undefined actions
        }

        // Handle evaluators - if provided, map through them
        // For class constructors (functions), get instance from container
        // For regular evaluators, use as-is
        if (typeof opts.evaluators !== "undefined") {
            plugin.evaluators = (
                await Promise.all(
                    opts.evaluators.map(async (evaluator) => {
                        if (typeof evaluator === "function") {
                            try {
                                return await ctx.container.getAsync(evaluator); // Get instance from DI container
                            } catch (e) {
                                elizaLogger.error(
                                    `Error normalizing evaluator: ${evaluator.name}`,
                                    e.message
                                );
                                return undefined; // Return undefined if failed to get instance
                            }
                        } else {
                            return evaluator; // Use evaluator directly
                        }
                    })
                )
            ).filter((evaluator) => evaluator !== undefined); // Filter out undefined evaluators
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
