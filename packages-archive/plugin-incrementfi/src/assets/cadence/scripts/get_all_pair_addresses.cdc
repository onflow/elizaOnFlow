import SwapFactory from 0x6ca93d49c45a249f

access(all) fun main(): [Address] {
  let len = SwapFactory.getAllPairsLength()
  if (len == 0) {
    return []
  } else {
    return SwapFactory.getSlicedPairs(from: 0, to: UInt64.max)
  }
}