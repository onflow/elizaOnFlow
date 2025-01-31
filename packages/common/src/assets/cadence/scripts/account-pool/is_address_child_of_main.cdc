import "AccountsPool"
import "EVM"

/// Check if the address belongs to the main account
///
access(all) fun main(
    mainAddr: Address,
    address: Address,
): Bool {
    let acct = getAuthAccount<auth(Storage) &Account>(mainAddr)
    if let pool = acct.storage
        .borrow<auth(AccountsPool.Child) &AccountsPool.Pool>(from: AccountsPool.StoragePath) {
        return AccountsPool.isAddressOwnedBy(mainAddr, checkAddress: address)
    }
    return false
}
