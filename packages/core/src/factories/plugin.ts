import { interfaces } from "inversify";
import {
    Action,
    Client,
    Evaluator,
    Plugin,
    Provider,
    Service,
} from "@elizaos/core";
import type {
    InjectableActionClass,
    InjectableEvaluatorClass,
    InjectableProviderClass,
    PluginFactory,
} from "../interfaces";
import { WalletProvider } from "../providers";

/**
 * Create a plugin factory
 */
export function createPlugin(ctx: interfaces.Context): PluginFactory {
    return (
        name: string,
        description: string,
        /** Optional actions */
        actions?: (Action | InjectableActionClass)[],
        /** Optional providers */
        providers?: (Provider | InjectableProviderClass)[],
        /** Optional evaluators */
        evaluators?: (Evaluator | InjectableEvaluatorClass)[],
        /** Optional services */
        services?: Service[],
        /** Optional clients */
        clients?: Client[]
    ): Plugin => {
        // Create a new plugin object
        const plugin: Plugin = {
            name,
            description,
        };

        // Handle actions - if provided, map through them
        // For class constructors (functions), get instance from container
        // For regular actions, use as-is
        if (typeof actions !== "undefined") {
            plugin.actions = actions.map(
                (action) =>
                    typeof action === "function"
                        ? ctx.container.get(action) // Get instance from DI container
                        : action // Use action directly
            );
        }

        // Handle providers - if provided, map through them
        // For class constructors (functions), get instance from container
        // For regular providers, use as-is
        if (typeof providers !== "undefined") {
            plugin.providers = providers.map((provider) => {
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
        if (typeof evaluators !== "undefined") {
            plugin.evaluators = evaluators.map(
                (evaluator) =>
                    typeof evaluator === "function"
                        ? ctx.container.get(evaluator) // Get instance from DI container
                        : evaluator // Use evaluator directly
            );
        }

        // Handle services - if provided, assign directly
        if (typeof services !== "undefined") {
            plugin.services = services;
        }

        // Handle clients - if provided, assign directly
        if (typeof clients !== "undefined") {
            plugin.clients = clients;
        }
        return plugin;
    };
}
