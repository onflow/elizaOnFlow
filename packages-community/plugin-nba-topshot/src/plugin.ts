import type { PluginOptions } from "@elizaos-plugins/plugin-di";
import {
    GetMomentsAction,
    ListMomentAction,
    PurchaseMomentAction,
    CancelSaleAction,
    GetMarketPricesAction
} from "./actions";
import { TopShotService } from "./services/topshot.service";
import { MarketService } from "./services/market.service";

/**
 * NBA TopShot Plugin configuration
 * Required for the plugin to be loaded, will be exported as default
 */
export const nbaTopShotPlugin: PluginOptions = {
    name: "nba-topshot",
    description: "NBA TopShot Plugin for Eliza with NFT trading features.",
    actions: [
        GetMomentsAction,
        ListMomentAction,
        PurchaseMomentAction,
        CancelSaleAction,
        GetMarketPricesAction
    ],
    providers: [],
    evaluators: [],
    services: [TopShotService, MarketService],
};
