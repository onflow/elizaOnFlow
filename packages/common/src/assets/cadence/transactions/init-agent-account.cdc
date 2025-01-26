import "EVM"
import "HybridCustody"
import "AccountsPool"

/// Transaction to initialize the agent account
/// The following resources are required:
/// - EVM
/// - HybridCustody.Manager
/// - AccountsPool
transaction() {

    prepare(acct: auth(Storage, Capabilities) &Account) {
        // --- Start --- EVM initialization ---
        let evmStoragePath = StoragePath(identifier: "evm")!
        let evmPublicPath = PublicPath(identifier: "evm")!
        if acct.storage.borrow<&AnyResource>(from: evmStoragePath) == nil {
            let coa <- EVM.createCadenceOwnedAccount()
            // Save the COA to the new account
            acct.storage.save<@EVM.CadenceOwnedAccount>(<-coa, to: evmStoragePath)
        }

        if acct.capabilities.get<&EVM.CadenceOwnedAccount>(evmPublicPath).borrow() == nil {
            acct.capabilities.unpublish(evmPublicPath)
            let addressableCap = acct.capabilities.storage.issue<&EVM.CadenceOwnedAccount>(evmStoragePath)
            acct.capabilities.publish(addressableCap, at: evmPublicPath)
        }
        // --- End --- EVM initialization ---

        // --- Start --- HybridCustody.Manager initialization ---
        // create account manager with hybrid custody manager capability
        if acct.storage.borrow<&HybridCustody.Manager>(from: HybridCustody.ManagerStoragePath) == nil {
            let m <- HybridCustody.createManager(filter: nil)
            acct.storage.save(<- m, to: HybridCustody.ManagerStoragePath)
        }

        if acct.capabilities.get<&HybridCustody.Manager>(HybridCustody.ManagerPublicPath).borrow() == nil {
            acct.capabilities.unpublish(HybridCustody.ManagerPublicPath)
            acct.capabilities.publish(
                acct.capabilities.storage.issue<&HybridCustody.Manager>(HybridCustody.ManagerStoragePath),
                at: HybridCustody.ManagerPublicPath
            )
        }
        // --- End --- HybridCustody.Manager initialization ---

        // --- Start --- AccountsPool initialization ---
        // create account pool with accounts pool capability
        if acct.storage.borrow<&AccountsPool.Pool>(from: AccountsPool.StoragePath) == nil {
            let acctCap = acct.capabilities.storage
                .issue<auth(HybridCustody.Manage) &HybridCustody.Manager>(HybridCustody.ManagerStoragePath)

            let pool <- AccountsPool.createAccountsPool(acctCap)
            acct.storage.save(<- pool, to: AccountsPool.StoragePath)
        }

        if acct.capabilities.get<&AccountsPool.Pool>(AccountsPool.PublicPath).borrow() == nil {
            acct.capabilities.unpublish(AccountsPool.PublicPath)
            acct.capabilities.publish(
                acct.capabilities.storage.issue<&AccountsPool.Pool>(AccountsPool.StoragePath),
                at: AccountsPool.PublicPath
            )
        }
        // --- End --- AccountsPool initialization ---
    }
}
