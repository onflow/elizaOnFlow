// Source:
//
// This file contains the definitions of the Cadence transactins used in the plugin.
// The transactions are defined as strings and exported as a dictionary.

import initAgentAccount from "./cadence/transactions/init_agent_account.cdc?raw";
// Account Pool related transactions
import acctPoolCreateChildAccount from "./cadence/transactions/account-pool/create_child.cdc?raw";
import acctPoolEVMTransferERC20 from "./cadence/transactions/account-pool/evm/transfer_erc20_from.cdc?raw";
import acctPoolFlowTokenDynamicTransfer from "./cadence/transactions/account-pool/flow-token/dynamic_vm_transfer_from.cdc?raw";
import acctPoolFTGenericTransfer from "./cadence/transactions/account-pool/ft/generic_transfer_with_address_from.cdc?raw";
// TokenList related transactions
import tlRegisterEVMAsset from './cadence/transactions/account-pool/token-list/register_evm_asset_from.cdc?raw';
import tlRegisterCadenceAsset from './cadence/transactions/account-pool/token-list/register_standard_asset_from.cdc?raw';
import tlRegisterCadenceAssetNoBridge from './cadence/transactions/token-list/register_standard_asset_no_bridge.cdc?raw';

export const transactions = {
    initAgentAccount,
    acctPoolCreateChildAccount,
    acctPoolEVMTransferERC20,
    acctPoolFlowTokenDynamicTransfer,
    acctPoolFTGenericTransfer,
    tlRegisterEVMAsset,
    tlRegisterCadenceAsset,
    tlRegisterCadenceAssetNoBridge,
};
