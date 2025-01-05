import { interfaces } from "inversify";
import { Plugin } from "@elizaos/core";
import type { PluginFactory, PluginOptions } from "../interfaces";
import { WalletProvider } from "../providers";

/**
 * Create a plugin factory
 */
export function createPlugin(ctx: interfaces.Context): PluginFactory {
    return (opts: PluginOptions): Plugin => {
        // Create a new plugin object
        const plugin: Plugin = {
            name: opts.name,
            description: opts.description,
        };

        // Handle actions - if provided, map through them
        // For class constructors (functions), get instance from container
        // For regular actions, use as-is
        if (typeof opts.actions !== "undefined") {
            plugin.actions = opts.actions.map(
                (action) =>
                    typeof action === "function"
                        ? ctx.container.get(action) // Get instance from DI container
                        : action // Use action directly
            );
        }

        // Handle providers - if provided, map through them
        // For class constructors (functions), get instance from container
        // For regular providers, use as-is
        if (typeof opts.providers !== "undefined") {
            plugin.providers = opts.providers.map((provider) => {
                if (typeof provider === "function") {
                    return ctx.container.get(provider); // Get instance from DI container
                }
                return provider; // Use provider directly
            });
            // Add WalletProvider if not already present
            if (
                !plugin.providers.some(
                    (provider) => provider instanceof WalletProvider
                )
            ) {
                plugin.providers.unshift(ctx.container.get(WalletProvider));
            }
        }

        // Handle evaluators - if provided, map through them
        // For class constructors (functions), get instance from container
        // For regular evaluators, use as-is
        if (typeof opts.evaluators !== "undefined") {
            plugin.evaluators = opts.evaluators.map(
                (evaluator) =>
                    typeof evaluator === "function"
                        ? ctx.container.get(evaluator) // Get instance from DI container
                        : evaluator // Use evaluator directly
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
