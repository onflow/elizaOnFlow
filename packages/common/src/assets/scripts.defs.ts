// Source:
//
// This file contains the definitions of the Cadence scripts used in the plugin.
// The scripts are defined as strings and exported as a dictionary.

// Scripts for prices
import getFlowPrice from "./cadence/scripts/get-flow-price.cdc?raw";
import getStFlowPrice from "./cadence/scripts/get-stflow-price.cdc?raw";
import getTokenInfoCadence from "./cadence/scripts/get-flow-token-info.cdc?raw";
import getTokenInfoEVM from "./cadence/scripts/get-erc20-token-info.cdc?raw";

export const scripts = {
    getFlowPrice,
    getStFlowPrice,
    getTokenInfoCadence,
    getTokenInfoEVM,
};
