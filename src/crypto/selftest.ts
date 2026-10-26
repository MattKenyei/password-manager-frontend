import { DEFAULT_KDF_PARAMS, deriveKey } from "./argon2"
import { base64ToBytes, bytesToBase64 } from "./base64"
import { decrypt, encrypt } from "./cipher"
import { deriveItemKey } from "./kdf"

export const runSelfTest = async (): Promise<void> => {
    console.log('[crypto] strating self-test')

    const original = new Uint8Array([0, 1, 127, 128, 255])
    const b64 = bytesToBase64(original)
    const back = base64ToBytes(b64)
    console.assert(original.length === back.length && original.every((v, i) => v === back[i]), 'base64 roundtrip failed')
    console.log('[crypto] base64 ok:', b64)

    const password = new TextEncoder().encode('correct horse battery staple')
    const salt = new Uint8Array(16).fill(0x42)
    const k1 = await deriveKey(password, salt, DEFAULT_KDF_PARAMS)
    const k2 = await deriveKey(password, salt, DEFAULT_KDF_PARAMS)
    console.assert(k1.length === 32, 'derived key length wrong')
    console.assert(k1.every((v, i) => v === k2[i]), 'argon2 not deterministic')
    console.log('[crypto] argin2id ok, first bytes: ', k1.slice(0, 4))

    const plaintext = new TextEncoder().encode('hello, vault!')
    const blob = await encrypt(k1, plaintext)
    console.log('[crypto] encrypted blob length:', blob.length, '(expect', 1 + 12 + plaintext.length + 16, ')')
    const decrypted = await decrypt(k1, blob)
    const decryptedText = new TextDecoder().decode(decrypted)
    console.assert(decryptedText === 'hello, vault!', 'decrypt mismatch')
    console.log('[crypto] AES-GCM roundtrip ok')

    const tampered = new Uint8Array(blob)
    tampered[tampered.length - 1] ^= 0xff
    try {
        await decrypt(k1, tampered)
        console.error('[crypto] tamper NOT detected — SECURITY BUG')
    } catch {
        console.log('[crypto] tamper detection ok')
    }

    const accountKey = new Uint8Array(32).fill(0x99)
    const k_item_a = await deriveItemKey(accountKey, '11111111-1111-1111-1111-111111111111')
    const k_item_b = await deriveItemKey(accountKey, '22222222-2222-2222-2222-222222222222')
    console.assert(k_item_a.every((v, i) => v === k_item_b[i]) === false, 'item keys must differ')
    console.log('[crypto] HKDF per-item isolation ok')

    console.log('[crypto] all tests passed ✓')
}