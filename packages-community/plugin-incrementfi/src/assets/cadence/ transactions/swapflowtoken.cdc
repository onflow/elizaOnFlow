import "FungibleToken"
import "SwapRouter"

// TODO: implement SwapFlowToken
transaction(
) {
    prepare(userAccount: auth(Storage, Capabilities) &Account) {
        panic("SwapFlowToken: not implemented")
    }
}
