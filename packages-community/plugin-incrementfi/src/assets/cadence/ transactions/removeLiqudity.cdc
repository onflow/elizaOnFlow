import "FungibleToken"
import "SwapFactory"
import "StableSwapFactory"
import "SwapInterfaces"
import "SwapConfig"
import "SwapError"

transaction(
    token0Key: String,
    token1Key: String,
    lpTokenAmount: UFix64,
    token0OutMin: UFix64,
    token1OutMin: UFix64,
    deadline: UFix64,
    token0VaultPath: StoragePath,
    token1VaultPath: StoragePath,
    stableMode: Bool
) {
    prepare(userAccount: auth(BorrowValue) &Account) {
        assert(deadline >= getCurrentBlock().timestamp, message:
            SwapError.ErrorEncode(
                msg: "RemoveLiquidity: expired ".concat(deadline.toString()).concat(" < ").concat(getCurrentBlock().timestamp.toString()),
                err: SwapError.ErrorCode.EXPIRED
            )
        )
        let pairAddr = stableMode ?
            StableSwapFactory.getPairAddress(token0Key: token0Key, token1Key: token1Key) ?? panic("AddLiquidity: nonexistent stable pair ".concat(token0Key).concat(" <-> ").concat(token1Key).concat(", create stable pair first"))
            :
            SwapFactory.getPairAddress(token0Key: token0Key, token1Key: token1Key) ?? panic("AddLiquidity: nonexistent pair ".concat(token0Key).concat(" <-> ").concat(token1Key).concat(", create pair first"))

        let lpTokenCollectionRef = userAccount.storage.borrow<auth(FungibleToken.Withdraw) &SwapFactory.LpTokenCollection>(from: SwapConfig.LpTokenCollectionStoragePath)
            ?? panic("RemoveLiquidity: cannot borrow reference to LpTokenCollection")

        let lpTokenRemove <- lpTokenCollectionRef.withdraw(pairAddr: pairAddr, amount: lpTokenAmount)
        let tokens <- getAccount(pairAddr).capabilities.borrow<&{SwapInterfaces.PairPublic}>(SwapConfig.PairPublicPath)!.removeLiquidity(lpTokenVault: <-lpTokenRemove)
        let token0Vault <- tokens[0].withdraw(amount: tokens[0].balance)
        let token1Vault <- tokens[1].withdraw(amount: tokens[1].balance)
        destroy tokens

        assert(token0Vault.balance >= token0OutMin && token1Vault.balance >= token1OutMin, message:
            SwapError.ErrorEncode(
                msg: "RemoveLiquidity: INSUFFICIENT_REMOVE_LIQUIDITY_OUT_AMOUNT",
                err: SwapError.ErrorCode.SLIPPAGE_OFFSET_TOO_LARGE
            )
        )

        /// Here does not detect whether the local receiver vault exsit.
        let localVault0Ref = userAccount.storage.borrow<&{FungibleToken.Vault}>(from: token0VaultPath)!
        let localVault1Ref = userAccount.storage.borrow<&{FungibleToken.Vault}>(from: token1VaultPath)!
        if token0Vault.isInstance(localVault0Ref.getType()) {
            localVault0Ref.deposit(from: <-token0Vault)
            localVault1Ref.deposit(from: <-token1Vault)
        } else {
            localVault0Ref.deposit(from: <-token1Vault)
            localVault1Ref.deposit(from: <-token0Vault)
        }
    }
}
