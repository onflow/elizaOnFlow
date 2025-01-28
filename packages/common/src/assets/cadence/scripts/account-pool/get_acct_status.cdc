import "FungibleToken"
import "EVM"
import "AccountsPool"

/// Returns the hex encoded address of the COA in the given Flow address
///
access(all) fun main(
    mainAddr: Address,
): AccountStatus? {
    if let pool = AccountsPool.borrowAccountsPool(mainAddr) {
        var flowBalance: UFix64 = 0.0
        if let flowVaultRef = getAccount(mainAddr)
            .capabilities.get<&{FungibleToken.Balance}>(/public/flowTokenBalance)
            .borrow() {
            flowBalance = flowVaultRef.balance
        }

        let childrenAmount = pool.getChildrenAmount(type: "Eliza")
        return AccountStatus(
            mainAddr,
            flowBalance,
            childrenAmount
        )
    }
    return nil
}

access(all) struct AccountStatus {
    access(all) let address: Address
    access(all) let balance: UFix64
    access(all) let childrenAmount: UInt64

    init(
        _ address: Address,
        _ balance: UFix64,
        _ childrenAmount: UInt64
    ) {
        self.address = address
        self.balance = balance
        self.childrenAmount = childrenAmount
    }
}
