let accountKey: Uint8Array | null = null
let wrappedAccountKey: Uint8Array | null = null

export const setAccountKey = (key: Uint8Array) => {
    if (accountKey) accountKey.fill(0)
    accountKey = new Uint8Array(key)
}

export const getAccountKey = (): Uint8Array => {
    if (!accountKey) throw new Error('vault is locked')
    return accountKey
}

export const setWrappedAccountKey = (blob: Uint8Array) => {
    if (wrappedAccountKey) wrappedAccountKey.fill(0)
    wrappedAccountKey = new Uint8Array(blob)
}

export const getWrappedAccountKey = (): Uint8Array | null => {
    return wrappedAccountKey
}

export const isUnlocked = (): boolean => {
    return accountKey !== null
}

export const lock = () => {
    if (accountKey) accountKey.fill(0)
    if (wrappedAccountKey) wrappedAccountKey.fill(0)
    accountKey = null
    wrappedAccountKey = null
}