import FungibleToken from 0x9a0766d93b6608b7
import SwapRouter from 0xa6850776a94e6551

transaction(
    exactAmountIn: UFix64,
    amountOutMin: UFix64,
    path: [String],
    to: Address,
    deadline: UFix64
) {
    prepare(userAccount: AuthAccount) {
        let tokenInVaultPath = /storage/flowTokenVault
        let tokenOutReceiverPath = /storage/usdcFlowVault

        let inVaultRef = userAccount.borrow<&FungibleToken.Vault>(from: tokenInVaultPath)
            ?? panic("Could not borrow reference to the owner's in FT.Vault")
        /// Note: Receiver (to) should already have out FT.Vault initialized, otherwise tx reverts.
        let outReceiverRef = getAccount(to).getCapability(tokenOutReceiverPath)
            .borrow<&{FungibleToken.Receiver}>()
            ?? panic("Could not borrow receiver reference to the recipient's out FT.Vault")

        let exactVaultIn <- inVaultRef.withdraw(amount: exactAmountIn)
        let vaultOut <- SwapRouter.swapExactTokensForTokens(
            exactVaultIn: <-exactVaultIn,
            amountOutMin: amountOutMin,
            tokenKeyPath: path,
            deadline: deadline
        )
        outReceiverRef.deposit(from: <-vaultOut)
    }
}