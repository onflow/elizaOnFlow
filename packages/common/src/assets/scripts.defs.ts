// Source:
//
// This file contains the definitions of the Cadence scripts used in the plugin.
// The scripts are defined as strings and exported as a dictionary.

// Scripts for prices
import getFlowPrice from "./cadence/scripts/get-flow-price.cdc?raw";
import getStFlowPrice from "./cadence/scripts/get-stflow-price.cdc?raw";

export const scripts = {
    getFlowPrice,
    getStFlowPrice,
};
