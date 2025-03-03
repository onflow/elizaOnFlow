import "FungibleToken"
import "SwapFactory"
import "StableSwapFactory"
import "SwapInterfaces"
import "SwapConfig"
import "SwapError"

transaction(
    token0Key: String,
    token1Key: String,
    token0InDesired: UFix64,
    token1InDesired: UFix64,
    token0InMin: UFix64,
    token1InMin: UFix64,
    deadline: UFix64,
    token0VaultPath: StoragePath,
    token1VaultPath: StoragePath,
    stableMode: Bool
) {
    prepare(userAccount: auth(Storage, Capabilities) &Account) {
        assert(deadline >= getCurrentBlock().timestamp, message:
            SwapError.ErrorEncode(
                msg: "AddLiquidity: expired ".concat(deadline.toString()).concat(" < ").concat(getCurrentBlock().timestamp.toString()),
                err: SwapError.ErrorCode.EXPIRED
            )
        )
        let pairAddr = (stableMode)?
            StableSwapFactory.getPairAddress(token0Key: token0Key, token1Key: token1Key) ?? panic("AddLiquidity: nonexistent stable pair ".concat(token0Key).concat(" <-> ").concat(token1Key).concat(", create stable pair first"))
            :
            SwapFactory.getPairAddress(token0Key: token0Key, token1Key: token1Key) ?? panic("AddLiquidity: nonexistent pair ".concat(token0Key).concat(" <-> ").concat(token1Key).concat(", create pair first"))
        let pairPublicRef = getAccount(pairAddr).capabilities.borrow<&{SwapInterfaces.PairPublic}>(SwapConfig.PairPublicPath)!
        /*
            pairInfo = [
                SwapPair.token0Key,
                SwapPair.token1Key,
                SwapPair.token0Vault.balance,
                SwapPair.token1Vault.balance,
                SwapPair.account.address,
                SwapPair.totalSupply
            ]
        */
        let pairInfo = pairPublicRef.getPairInfo()
        var token0In = 0.0
        var token1In = 0.0
        var token0Reserve = 0.0
        var token1Reserve = 0.0
        if token0Key == (pairInfo[0] as! String) {
            token0Reserve = (pairInfo[2] as! UFix64)
            token1Reserve = (pairInfo[3] as! UFix64)
        } else {
            token0Reserve = (pairInfo[3] as! UFix64)
            token1Reserve = (pairInfo[2] as! UFix64)
        }
        if token0Reserve == 0.0 && token1Reserve == 0.0 {
            token0In = token0InDesired
            token1In = token1InDesired
        } else {
            var amount1Optimal = SwapConfig.quote(amountA: token0InDesired, reserveA: token0Reserve, reserveB: token1Reserve)
            if (amount1Optimal <= token1InDesired) {
                assert(amount1Optimal >= token1InMin, message:
                    SwapError.ErrorEncode(
                        msg: "SLIPPAGE_OFFSET_TOO_LARGE expect min".concat(token1InMin.toString()).concat(" got ").concat(amount1Optimal.toString()),
                        err: SwapError.ErrorCode.SLIPPAGE_OFFSET_TOO_LARGE
                    )
                )
                token0In = token0InDesired
                token1In = amount1Optimal
            } else {
                var amount0Optimal = SwapConfig.quote(amountA: token1InDesired, reserveA: token1Reserve, reserveB: token0Reserve)
                assert(amount0Optimal <= token0InDesired)
                assert(amount0Optimal >= token0InMin, message:
                    SwapError.ErrorEncode(
                        msg: "SLIPPAGE_OFFSET_TOO_LARGE expect min".concat(token0InMin.toString()).concat(" got ").concat(amount0Optimal.toString()),
                        err: SwapError.ErrorCode.SLIPPAGE_OFFSET_TOO_LARGE
                    )
                )
                token0In = amount0Optimal
                token1In = token1InDesired
            }
        }

        let token0Vault <- userAccount.storage.borrow<auth(FungibleToken.Withdraw) &{FungibleToken.Vault}>(from: token0VaultPath)!.withdraw(amount: token0In)
        let token1Vault <- userAccount.storage.borrow<auth(FungibleToken.Withdraw) &{FungibleToken.Vault}>(from: token1VaultPath)!.withdraw(amount: token1In)
        let lpTokenVault <- pairPublicRef.addLiquidity(
            tokenAVault: <- token0Vault,
            tokenBVault: <- token1Vault
        )

        let lpTokenCollectionStoragePath = SwapConfig.LpTokenCollectionStoragePath
        let lpTokenCollectionPublicPath = SwapConfig.LpTokenCollectionPublicPath
        var lpTokenCollectionRef = userAccount.storage.borrow<&SwapFactory.LpTokenCollection>(from: lpTokenCollectionStoragePath)
        if lpTokenCollectionRef == nil {
            destroy <- userAccount.storage.load<@AnyResource>(from: lpTokenCollectionStoragePath)
            userAccount.storage.save(<-SwapFactory.createEmptyLpTokenCollection(), to: lpTokenCollectionStoragePath)
            let lpTokenCollectionCap = userAccount.capabilities.storage.issue<&{SwapInterfaces.LpTokenCollectionPublic}>(lpTokenCollectionStoragePath)
            userAccount.capabilities.publish(lpTokenCollectionCap, at: lpTokenCollectionPublicPath)
            lpTokenCollectionRef = userAccount.storage.borrow<&SwapFactory.LpTokenCollection>(from: lpTokenCollectionStoragePath)
        }
        lpTokenCollectionRef!.deposit(pairAddr: pairAddr, lpTokenVault: <- lpTokenVault)
    }
}
