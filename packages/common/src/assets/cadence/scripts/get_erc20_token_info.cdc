import "EVM"
import "FlowEVMBridgeUtils"
import "FlowEVMBridgeConfig"

access(all)
fun main(
    erc20Address: String,
): TokenInfo? {
    let ftAddr = EVM.addressFromString(erc20Address)
    if FlowEVMBridgeUtils.isERC20(evmContractAddress: ftAddr) {
        let name  = FlowEVMBridgeUtils.getName(evmContractAddress: ftAddr)
        let symbol = FlowEVMBridgeUtils.getSymbol(evmContractAddress: ftAddr)
        let decimals = FlowEVMBridgeUtils.getTokenDecimals(evmContractAddress: ftAddr)
        let totalSupply = FlowEVMBridgeUtils.totalSupply(evmContractAddress: ftAddr)

        // From https://kittypunch.gitbook.io/kittypunch-docs/litterbox/punchswap
        let punchSwapFactoryAddress = EVM.addressFromString("29372c22459a4e373851798bFd6808e71EA34A71".toLower())
        // let punchSwapRouterAddress = EVM.addressFromString("f45AFe28fd5519d5f8C1d4787a4D5f724C0eFa4d".toLower())
        // From https://evm.flowscan.io/token/0xd3bF53DAC106A0290B0483EcBC89d40FcC961f3e
        let wflowAddress = EVM.addressFromString("d3bF53DAC106A0290B0483EcBC89d40FcC961f3e".toLower())

        let bridgeCOA = borrowCOA()

        // result variables
        var pairAddress: String? = nil
        var reservedTokenInPair: UInt128 = 0
        var reservedFlowInPair: UInt128 = 0

        // Get the pair address
        let pairAddressRes = bridgeCOA.call(
            to: punchSwapFactoryAddress,
            data: EVM.encodeABIWithSignature("getPair(address,address)", [wflowAddress, ftAddr]),
            gasLimit: FlowEVMBridgeConfig.gasLimit,
            value: EVM.Balance(attoflow: 0)
        )
        if pairAddressRes.status == EVM.Status.successful {
            let decodedCallResult = EVM.decodeABI(types: [Type<EVM.EVMAddress>()], data: pairAddressRes.data)
            if decodedCallResult.length == 1 {
                let pairAddr = decodedCallResult[0] as! EVM.EVMAddress
                pairAddress = "0x".concat(pairAddr.toString())

                // Get the reserve of the pair
                let reservesRes = bridgeCOA.call(
                    to: pairAddr,
                    data: EVM.encodeABIWithSignature("getReserves()", []),
                    gasLimit: FlowEVMBridgeConfig.gasLimit,
                    value: EVM.Balance(attoflow: 0)
                )

                // Get the token0 of the pair
                let token0Res = bridgeCOA.call(
                    to: pairAddr,
                    data: EVM.encodeABIWithSignature("token0()", []),
                    gasLimit: FlowEVMBridgeConfig.gasLimit,
                    value: EVM.Balance(attoflow: 0)
                )

                if reservesRes.status == EVM.Status.successful && token0Res.status == EVM.Status.successful {
                    let decodedReservesResult = EVM.decodeABI(types: [Type<UInt128>(), Type<UInt128>(), Type<UInt32>()], data: reservesRes.data)
                    let decodedToken0Result = EVM.decodeABI(types: [Type<EVM.EVMAddress>()], data: token0Res.data)

                    let token0Addr = decodedToken0Result[0] as! EVM.EVMAddress
                    let isToken0FT = token0Addr.toString() == ftAddr.toString()
                    reservedTokenInPair = isToken0FT ? decodedReservesResult[0] as! UInt128 : decodedReservesResult[1] as! UInt128
                    reservedFlowInPair = isToken0FT ? decodedReservesResult[1] as! UInt128 : decodedReservesResult[0] as! UInt128
                }
            }
        }

        return TokenInfo(
            address: erc20Address,
            name: name,
            symbol: symbol,
            decimals: decimals,
            totalSupply: totalSupply,
            pairAddress: pairAddress,
            reservedTokenInPair: reservedTokenInPair,
            reservedFlowInPair: reservedFlowInPair
        )
    }
    return nil
}

/// Enables other bridge contracts to orchestrate bridge operations from contract-owned COA
///
access(all)
view fun borrowCOA(): auth(EVM.Call) &EVM.CadenceOwnedAccount {
    let vmBridgeAddr = Address.fromString("0x1e4aa0b87d10b141")!
    return getAuthAccount<auth(BorrowValue) &Account>(vmBridgeAddr)
        .storage.borrow<auth(EVM.Call) &EVM.CadenceOwnedAccount>(
            from: FlowEVMBridgeConfig.coaStoragePath
        ) ?? panic("Could not borrow COA reference")
}


access(all)
struct TokenInfo {
    access(all)
    let address: String
    access(all)
    let name: String
    access(all)
    let symbol: String
    access(all)
    let decimals: UInt8
    access(all)
    let totalSupply: UInt256
    access(all)
    let pairAddress: String?
    access(all)
    let reservedTokenInPair: UInt128
    access(all)
    let reservedFlowInPair: UInt128

    init(
        address: String,
        name: String,
        symbol: String,
        decimals: UInt8,
        totalSupply: UInt256,
        pairAddress: String?,
        reservedTokenInPair: UInt128,
        reservedFlowInPair: UInt128
    ) {
        self.address = address
        self.name = name
        self.symbol = symbol
        self.decimals = decimals
        self.totalSupply = totalSupply
        self.pairAddress = pairAddress
        self.reservedTokenInPair = reservedTokenInPair
        self.reservedFlowInPair = reservedFlowInPair
    }
}
