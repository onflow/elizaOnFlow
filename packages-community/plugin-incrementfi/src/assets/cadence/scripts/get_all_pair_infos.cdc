import "SwapFactory"

access(all) fun main(): [AnyStruct] {
  let len = SwapFactory.getAllPairsLength()
  if (len == 0) {
    return []
  } else {
    return SwapFactory.getSlicedPairInfos(from: 0, to: UInt64.max)
  }
}
