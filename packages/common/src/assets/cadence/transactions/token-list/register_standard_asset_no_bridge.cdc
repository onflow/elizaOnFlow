import "TokenList"
import "NFTList"

transaction(
    address: Address,
    contractName: String,
) {
    prepare(signer: &Account) {
        if TokenList.isValidToRegister(address, contractName) {
            TokenList.ensureFungibleTokenRegistered(address, contractName)
        } else if NFTList.isValidToRegister(address, contractName) {
            NFTList.ensureNFTCollectionRegistered(address, contractName)
        }
    }
}
