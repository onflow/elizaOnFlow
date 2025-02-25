import "FungibleToken"
import "FlowToken"

import "ScopedFTProviders"
import "FlowEVMBridgeConfig"

import "TokenList"
import "NFTList"
import "EVMTokenList"

import "AccountsPool"

transaction(
    address: Address,
    contractName: String,
    from: String?,
) {
    let scopedProvider: @ScopedFTProviders.ScopedFTProvider

    prepare(signer: auth(Storage, Capabilities) &Account) {
        // ------------- Start - Load the correct Account from signer's Account Pool -------------
        let acct = (from == nil
            ? signer
            : (signer.storage.borrow<auth(AccountsPool.Child) &AccountsPool.Pool>(from: AccountsPool.StoragePath)
                ?? panic("Failed to load Accounts Pool for ".concat(signer.address.toString()))
            ).borrowChildAccount(type: "eliza", from))
                ?? panic("Could not borrow Account reference for ".concat(from ?? "signer"))
        // ------------- End - Load the correct Account from signer's Account Pool -------------

        /* --- Configure a ScopedFTProvider - Start -- */

        // Issue and store bridge-dedicated Provider Capability in storage if necessary
        if acct.storage.type(at: FlowEVMBridgeConfig.providerCapabilityStoragePath) == nil {
            let providerCap = acct.capabilities
                .storage.issue<auth(FungibleToken.Withdraw) &{FungibleToken.Provider}>(/storage/flowTokenVault)
            acct.storage.save(providerCap, to: FlowEVMBridgeConfig.providerCapabilityStoragePath)
        }
        // Copy the stored Provider capability and create a ScopedFTProvider
        let providerCapCopy = acct.storage
            .copy<Capability<auth(FungibleToken.Withdraw) &{FungibleToken.Provider}>>(
                from: FlowEVMBridgeConfig.providerCapabilityStoragePath
            ) ?? panic("Invalid Provider Capability found in storage.")
        let providerFilter = ScopedFTProviders.AllowanceFilter(FlowEVMBridgeConfig.onboardFee)
        self.scopedProvider <- ScopedFTProviders.createScopedFTProvider(
            provider: providerCapCopy,
            filters: [ providerFilter ],
            expiration: getCurrentBlock().timestamp + 1.0
        )
        /* --- Configure a ScopedFTProvider - End -- */
    }

    execute {
        EVMTokenList.ensureCadenceAssetRegistered(
            address,
            contractName,
            feeProvider:  &self.scopedProvider as auth(FungibleToken.Withdraw) &{FungibleToken.Provider}
        )
        destroy self.scopedProvider
    }
}
