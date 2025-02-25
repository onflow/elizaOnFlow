import "TokenList"

access(all)
fun main(
    ftAddress: Address,
    ftContractName: String,
): Bool {
    return TokenList.isFungibleTokenRegistered(ftAddress, ftContractName)
}
