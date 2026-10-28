import type { IItemPayload } from "@/db/types"
import { deriveItemKey } from "./kdf"
import { decrypt, encrypt } from "./cipher"
import { base64ToBytes, bytesToBase64 } from "./base64"

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export const emptyPayload = (): IItemPayload => ({
    title: '',
    username: '',
    password: '',
    url: '',
    notes: '',
    tags: [],
    totp: null,
})

export const encryptPayload = async (accountKey: Uint8Array, itemId: string, payload: IItemPayload): Promise<string> => {
    const itemKey = await deriveItemKey(accountKey, itemId)
    const plaintext = encoder.encode(JSON.stringify(payload))
    const blob = await encrypt(itemKey, plaintext)
    itemKey.fill(0)
    return bytesToBase64(blob)
}

export const decryptPayload = async (accountKey: Uint8Array, itemId: string, encryptedBlob: string): Promise<IItemPayload> => {
    const itemKey = await deriveItemKey(accountKey, itemId)
    try {
        const blob = base64ToBytes(encryptedBlob)
        const plaintext = await decrypt(itemKey, blob)
        const parsed = JSON.parse(decoder.decode(plaintext)) as Partial<IItemPayload>
        return {
            title: parsed.title ?? '',
            username: parsed.username ?? '',
            password: parsed.password ?? '',
            url: parsed.url ?? '',
            notes: parsed.notes ?? '',
            tags: parsed.tags ?? [],
            totp: parsed.totp ?? null,
        }
    } finally {
        itemKey.fill(0)
    }
}