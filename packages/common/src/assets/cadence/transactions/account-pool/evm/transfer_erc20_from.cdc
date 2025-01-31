import "EVM"
import "FlowEVMBridgeUtils"

import "AccountsPool"

/// Executes a token transfer to the defined recipient address against the specified ERC20 contract.
///
transaction(
    evmContractAddressHex: String,
    recipientAddressHex: String,
    amount: UInt256,
    from: String?,
) {

    let evmContractAddress: EVM.EVMAddress
    let recipientAddress: EVM.EVMAddress
    let coa: auth(EVM.Call) &EVM.CadenceOwnedAccount
    let preBalance: UInt256
    var postBalance: UInt256

    prepare(signer: auth(Storage) &Account) {
        // ------------- Start - Load the correct Account from signer's Account Pool -------------
        let acct = (from == nil
            ? signer
            : (signer.storage.borrow<auth(AccountsPool.Child) &AccountsPool.Pool>(from: AccountsPool.StoragePath)
                ?? panic("Failed to load Accounts Pool for ".concat(signer.address.toString()))
            ).borrowChildAccount(type: "eliza", from))
                ?? panic("Could not borrow Account reference for ".concat(from ?? "signer"))
        // ------------- End - Load the correct Account from signer's Account Pool -------------

        self.evmContractAddress = EVM.addressFromString(evmContractAddressHex)
        self.recipientAddress = EVM.addressFromString(recipientAddressHex)

        self.coa = acct.storage.borrow<auth(EVM.Call) &EVM.CadenceOwnedAccount>(from: /storage/evm)
            ?? panic("Could not borrow CadenceOwnedAccount reference")

        self.preBalance = FlowEVMBridgeUtils.balanceOf(owner: self.coa.address(), evmContractAddress: self.evmContractAddress)
        self.postBalance = 0
    }

    execute {
        let calldata = EVM.encodeABIWithSignature("transfer(address,uint256)", [self.recipientAddress, amount])
        let callResult = self.coa.call(
            to: self.evmContractAddress,
            data: calldata,
            gasLimit: 15_000_000,
            value: EVM.Balance(attoflow: 0)
        )
        assert(callResult.status == EVM.Status.successful, message: "Call to ERC20 contract failed")
        self.postBalance = FlowEVMBridgeUtils.balanceOf(owner: self.coa.address(), evmContractAddress: self.evmContractAddress)
    }

    post {
        self.postBalance == self.preBalance - amount: "Transfer failed"
    }
}
