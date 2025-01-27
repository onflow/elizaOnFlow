import "SwapFactory"
import "SwapConfig"
import "SwapInterfaces"
import "FlowToken"
import "FungibleToken"
import "FungibleTokenMetadataViews"

access(all)
fun main(
    address: Address,
    contractName: String
): TokenInfo? {
    if let ftContract = getAccount(address).contracts.borrow<&{FungibleToken}>(name: contractName) {
        let totalSupply = ftContract.resolveContractView(resourceType: nil, viewType: Type<FungibleTokenMetadataViews.TotalSupply>()) as! FungibleTokenMetadataViews.TotalSupply?
        if let tokenKey = getFTKey(address, contractName) {
            if let pairRef = borrowSwapPairRef(tokenKey) {
                let priceInFLOW = getSwapEstimatedAmountIn(tokenKey: tokenKey, pairRef: pairRef, amount: 1.0)
                return TokenInfo(
                    address: address,
                    contractName: contractName,
                    totalSupply: totalSupply?.supply ?? 0.0,
                    priceInFLOW: priceInFLOW
                )
            }
        }
        return TokenInfo(address: address, contractName: contractName, totalSupply: totalSupply?.supply ?? 0.0, priceInFLOW: 0.0)
    }
    return nil
}

access(all)
view fun getFTKey(_ address: Address, _ contractName: String): String? {
    let addrStr = address.toString()
    let addrStrNo0x = addrStr.slice(from: 2, upTo: addrStr.length)
    if let tokenVaultType = CompositeType("A.".concat(addrStrNo0x).concat(".").concat(contractName).concat(".Vault")) {
        return SwapConfig.SliceTokenTypeIdentifierFromVaultType(vaultTypeIdentifier: tokenVaultType.identifier)
    } else {
        return nil
    }
}

/// Borrow the swap pair reference
///
access(all)
view fun borrowSwapPairRef(_ token0Key: String): &{SwapInterfaces.PairPublic}? {
    let token1Key = SwapConfig.SliceTokenTypeIdentifierFromVaultType(vaultTypeIdentifier: Type<@FlowToken.Vault>().identifier)
    if let pairAddr = SwapFactory.getPairAddress(token0Key: token0Key, token1Key: token1Key) {
        // ensure the pair's contract exists
        let acct = getAccount(pairAddr)
        let allNames = acct.contracts.names
        if !allNames.contains("SwapPair") {
            return nil
        }

        // Now we can borrow the reference
        return acct
            .capabilities.get<&{SwapInterfaces.PairPublic}>(SwapConfig.PairPublicPath)
            .borrow()
    }
    return nil
}

/// Get the swap pair reserved info for the liquidity pool
/// 0 - Token0 reserve
/// 1 - Token1 reserve
/// 2 - LP token supply
///
access(all)
view fun getSwapPairReservedInfo(
    tokenKey: String,
    pairRef: &{SwapInterfaces.PairPublic},
): [UFix64; 3]? {
    let pairInfo = pairRef.getPairInfo()

    var reserve0 = 0.0
    var reserve1 = 0.0
    if tokenKey == (pairInfo[0] as! String) {
        reserve0 = (pairInfo[2] as! UFix64)
        reserve1 = (pairInfo[3] as! UFix64)
    } else {
        reserve0 = (pairInfo[3] as! UFix64)
        reserve1 = (pairInfo[2] as! UFix64)
    }
    let lpTokenSupply = pairInfo[5] as! UFix64
    return [reserve0, reserve1, lpTokenSupply]
}

/// Get the estimated swap amount by amount in
///
access(all)
view fun getSwapEstimatedAmountIn(
    tokenKey: String,
    pairRef: &{SwapInterfaces.PairPublic},
    amount: UFix64,
): UFix64 {
    let pairInfo = getSwapPairReservedInfo(tokenKey: tokenKey, pairRef: pairRef)
    if pairInfo == nil {
        return 0.0
    }
    let reserveToken = pairInfo![0]
    let reserveFlow = pairInfo![1]

    if reserveToken == 0.0 || reserveFlow == 0.0 {
        return 0.0
    }

    return SwapConfig.getAmountIn(amountOut: amount, reserveIn: reserveFlow, reserveOut: reserveToken)
}

access(all)
struct TokenInfo {
    access(all)
    let address: Address
    access(all)
    let contractName: String
    access(all)
    let totalSupply: UFix64
    access(all)
    let priceInFLOW: UFix64

    init(
        address: Address,
        contractName: String,
        totalSupply: UFix64,
        priceInFLOW: UFix64
    ) {
        self.address = address
        self.contractName = contractName
        self.totalSupply = totalSupply
        self.priceInFLOW = priceInFLOW
    }
}
