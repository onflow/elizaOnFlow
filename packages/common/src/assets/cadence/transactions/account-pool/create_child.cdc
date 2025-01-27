#allowAccountLinking
import "FungibleToken"
import "FlowToken"
import "AccountsPool"

/// Creates a child account for the given user by the main account
///
transaction(
    userId: String,
    initialFundingAmt: UFix64?
) {
    let category: String
    let pool: auth(AccountsPool.Admin) &AccountsPool.Pool
    let newAcctCap: Capability<auth(Storage, Contracts, Keys, Inbox, Capabilities) &Account>

    prepare(signer: auth(Storage, Capabilities) &Account) {
        self.category = "eliza"
        self.pool = signer.storage
            .borrow<auth(AccountsPool.Admin) &AccountsPool.Pool>(from: AccountsPool.StoragePath)
            ?? panic("Could not borrow the pool reference")

        // create a new Account, no keys needed
        let newAccount = Account(payer: signer)
        let fundingAmt = initialFundingAmt ?? 0.01 // Default deposit is 0.01 FLOW to the newly created account

        // Get a reference to the signer's stored vault
        let vaultRef = signer.storage
            .borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(from: /storage/flowTokenVault)
            ?? panic("Could not borrow reference to the owner's Vault!")
        // Withdraw the funding amount from the owner's vault
        let flowToReserve <- vaultRef.withdraw(amount: fundingAmt)

        // Borrow the new account's Flow Token Receiver reference
        let newAcctFlowTokenReceiverRef = newAccount.capabilities
            .get<&{FungibleToken.Receiver}>(/public/flowTokenReceiver)
            .borrow()
            ?? panic("Could not borrow receiver reference to the newly created account")
        // Deposit the withdrawn FLOW into the new account's vault
        newAcctFlowTokenReceiverRef.deposit(from: <- flowToReserve)

        /* --- Link the AuthAccount Capability --- */
        //
        self.newAcctCap = newAccount.capabilities.account.issue<auth(Storage, Contracts, Keys, Inbox, Capabilities) &Account>()
    }

    pre {
        self.pool.getAddress(type: self.category, userId) == nil: "Account already exists for the given user"
    }

    execute {
        // Setup the new child account
        self.pool.setupNewChildByKey(type: self.category, key: userId, self.newAcctCap)
    }

    post {
        self.pool.getAddress(type: self.category, userId) != nil: "Account was not created"
    }
}
