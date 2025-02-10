import FlowToken from 0x7e60df042a9c0868
// FUSD Fungible Token
import FungibleToken from 0x9a0766d93b6608b7
import SwapFactory from 0x6ca93d49c45a249f

// Deploy a SwapPair given token{0|1}'s TokenName and contract address.
//`stableMode` specifies whether the pair uses Uniswap-V2 algorithm (stableMode:false) or Solidly-Stableswap algorithm (stableMode:true).
// Flow testnet token and FUSD FungibleToken

transaction(Token0Name: String, Token0Addr: Address, Token1Name: String, Token1Addr: Address, stableMode: Bool) {
    prepare(userAccount: AuthAccount) {
        let flowVaultRef = userAccount.borrow<&FlowToken.Vault>(from: /storage/flowTokenVault)!
        assert(flowVaultRef.balance >= 0.002, message: "Insufficient balance to create pair, minimum balance requirement: 0.002 flow")
        let accountCreationFeeVault <- flowVaultRef.withdraw(amount: 0.001)

        let token0Vault <- getAccount(Token0Addr).contracts.borrow<&FungibleToken>(name: Token0Name)!.createEmptyVault()
        let token1Vault <- getAccount(Token1Addr).contracts.borrow<&FungibleToken>(name: Token1Name)!.createEmptyVault()
        SwapFactory.createPair(token0Vault: <-token0Vault, token1Vault: <-token1Vault, accountCreationFee: <-accountCreationFeeVault, stableMode: stableMode)
    }
}