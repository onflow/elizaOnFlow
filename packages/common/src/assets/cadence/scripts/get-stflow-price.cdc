import "AddressUtils"
import "PublicPriceOracle"

access(all)
fun main(): UFix64 {
    let network = AddressUtils.currentNetwork()
    // reference: https://docs.increment.fi/protocols/decentralized-price-feed-oracle/deployment-addresses
    var oracleAddress: Address? = nil
    if network == "MAINNET" {
        oracleAddress = Address.fromString("0x".concat("031dabc5ba1d2932"))
    } else {
        return 1.0
    }
    return PublicPriceOracle.getLatestPrice(oracleAddr: oracleAddress!)
}
