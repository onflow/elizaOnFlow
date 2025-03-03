//import add liquidity, remove liquidity
import addLiquidity from "../cadence/ transactions/addLiquidity.cdc"
import removeLiquidity from "../cadence/ transactions/removeLiqudity.cdc"
import createPool from "../cadence/ transactions/createPool.cdc"
import swapflowtoken from "../cadence/ transactions/swapflowtoken.cdc"

export const transactions = {
    addLiquidity,
    removeLiquidity,
    createPool,
    swapflowtoken,
}