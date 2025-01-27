import "AddressUtils"
import "PublicPriceOracle"

access(all)
fun main(): UFix64 {
    let network = AddressUtils.currentNetwork()
    // reference: https://docs.increment.fi/protocols/decentralized-price-feed-oracle/deployment-addresses
    var oracleAddress: Address? = nil
    if network == "MAINNET" {
        oracleAddress = Address.fromString("0x".concat("e385412159992e11"))
    } else if network == "TESTNET" {
        oracleAddress = Address.fromString("0x".concat("cbdb5a7b89c3c844"))
    } else {
        return 1.0
    }
    return PublicPriceOracle.getLatestPrice(oracleAddr: oracleAddress!)
}
