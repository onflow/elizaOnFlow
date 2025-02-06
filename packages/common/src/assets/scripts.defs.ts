// Source:
//
// This file contains the definitions of the Cadence scripts used in the plugin.
// The scripts are defined as strings and exported as a dictionary.

// Scripts for prices
import getFlowPrice from "./cadence/scripts/get_flow_price.cdc?raw";
import getStFlowPrice from "./cadence/scripts/get_stflow_price.cdc?raw";
import getTokenInfoCadence from "./cadence/scripts/get_flow_token_info.cdc?raw";
import getTokenInfoEVM from "./cadence/scripts/get_erc20_token_info.cdc?raw";

// Scripts for account pool
import isAddressChildOf from "./cadence/scripts/account-pool/is_address_child_of_main.cdc?raw";
import getAccountInfoFrom from "./cadence/scripts/account-pool/get_acct_info_from.cdc?raw";
import getAccountStatus from "./cadence/scripts/account-pool/get_acct_status.cdc?raw";

// Scripts for TokenList
import isTokenRegistered from "./cadence/scripts/token-list/is-token-registered.cdc?raw";
import isEVMAssetRegistered from "./cadence/scripts/token-list/is-evm-asset-registered.cdc?raw";

export const scripts = {
    getFlowPrice,
    getStFlowPrice,
    getTokenInfoCadence,
    getTokenInfoEVM,
    getAccountInfoFrom,
    getAccountStatus,
    isAddressChildOf,
    isTokenRegistered,
    isEVMAssetRegistered,
};
