transaction(
    index: Int
) {
    prepare(signer: auth(Keys) &Account) {
        // revoke a key from an auth account.
        signer.keys.revoke(keyIndex: index)
    }
}
