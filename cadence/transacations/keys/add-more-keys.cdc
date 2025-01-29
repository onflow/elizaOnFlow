transaction(
    amount: Int
) {
    prepare(service: auth(Keys) &Account) {
        let keys = service.keys
        let firstKey = keys.get(keyIndex: 0) ?? panic("No Key 0")

        var i: Int = 0
        while i < amount {
            keys.add(publicKey: firstKey.publicKey, hashAlgorithm: firstKey.hashAlgorithm, weight: 1000.0)
            i = i + 1
        }
    }
}
