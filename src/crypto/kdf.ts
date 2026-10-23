import { bufSource } from "./bytes"

const ITEM_INFO_PREFIX = 'pm-item:'

const hkdf = async (ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> => {
    const baseKey = await crypto.subtle.importKey('raw', bufSource(ikm), 'HKDF', false, ['deriveBits'])
    const bits = await crypto.subtle.deriveBits(
        {
            name: "HKDF",
            hash: "SHA-256",
            salt: bufSource(new Uint8Array(0)),
            info: bufSource(info),
        },
        baseKey,
        length * 8
    )
    return new Uint8Array(bits)
}

export const deriveItemKey = (accountKey: Uint8Array, itemId: string): Promise<Uint8Array> => {
    const info = new TextEncoder().encode(ITEM_INFO_PREFIX + itemId)
    return hkdf(accountKey, info, 32)
}