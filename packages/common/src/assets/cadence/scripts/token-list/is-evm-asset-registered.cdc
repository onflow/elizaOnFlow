import "EVMTokenList"

access(all)
fun main(
    evmContractAddress: String,
): Bool {
    let addrNo0x = evmContractAddress.slice(from: 0, upTo: 2) == "0x"
            ? evmContractAddress.slice(from: 2, upTo: evmContractAddress.length)
            : evmContractAddress
    return EVMTokenList.isEVMAddressRegistered(addrNo0x)
}
