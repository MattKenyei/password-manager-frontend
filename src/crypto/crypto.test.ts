import { describe, it, expect } from 'vitest'
import { deriveKeySync } from './argon2-sync'
import { DEFAULT_KDF_PARAMS } from './argon2'
import { encrypt, decrypt } from './cipher'
import { deriveItemKey } from './kdf'
import { bytesToBase64, base64ToBytes } from './base64'

describe('base64', () => {
    it('roundtrips arbitrary bytes', () => {
        const original = new Uint8Array([0, 1, 127, 128, 255, 42])
        const b64 = bytesToBase64(original)
        const back = base64ToBytes(b64)
        expect(Array.from(back)).toEqual(Array.from(original))
    })

    it('produces standard base64 (not URL-safe)', () => {
        const b64 = bytesToBase64(new Uint8Array([0xfb, 0xff]))
        expect(b64).toContain('+')
        expect(b64).toContain('/')
    })
})

describe('Argon2id', () => {
    it('is deterministic', async () => {
        const password = new TextEncoder().encode('correct horse battery staple')
        const salt = new Uint8Array(16).fill(0x42)

        const [k1, k2] = await Promise.all([
            deriveKeySync(password, salt, DEFAULT_KDF_PARAMS),
            deriveKeySync(password, salt, DEFAULT_KDF_PARAMS),
        ])

        expect(k1.length).toBe(32)
        expect(Array.from(k1)).toEqual(Array.from(k2))
    }, 30_000)

    it('different salt → different key', async () => {
        const password = new TextEncoder().encode('password')
        const k1 = await deriveKeySync(password, new Uint8Array(16).fill(1))
        const k2 = await deriveKeySync(password, new Uint8Array(16).fill(2))
        expect(Array.from(k1)).not.toEqual(Array.from(k2))
    }, 30_000)

    it('different password → different key', async () => {
        const salt = new Uint8Array(16).fill(0x42)
        const k1 = await deriveKeySync(new TextEncoder().encode('password-a'), salt)
        const k2 = await deriveKeySync(new TextEncoder().encode('password-b'), salt)
        expect(Array.from(k1)).not.toEqual(Array.from(k2))
    }, 30_000)
})

describe('AES-256-GCM', () => {
    it('roundtrips', async () => {
        const key = new Uint8Array(32).fill(0x99)
        const plain = new TextEncoder().encode('secret message')

        const blob = await encrypt(key, plain)
        const back = await decrypt(key, blob)

        expect(new TextDecoder().decode(back)).toBe('secret message')
    })

    it('detects tampering', async () => {
        const key = new Uint8Array(32).fill(0x99)
        const blob = await encrypt(key, new Uint8Array([1, 2, 3]))

        blob[blob.length - 1] ^= 0xff

        await expect(decrypt(key, blob)).rejects.toThrow()
    })

    it('fails with wrong key', async () => {
        const k1 = new Uint8Array(32).fill(0x99)
        const k2 = new Uint8Array(32).fill(0x11)
        const blob = await encrypt(k1, new Uint8Array([1]))
        await expect(decrypt(k2, blob)).rejects.toThrow()
    })

    it('produces different ciphertext for the same plaintext', async () => {
        const key = new Uint8Array(32).fill(0x99)
        const plain = new TextEncoder().encode('same message')

        const b1 = await encrypt(key, plain)
        const b2 = await encrypt(key, plain)

        expect(Array.from(b1)).not.toEqual(Array.from(b2))

        expect(new TextDecoder().decode(await decrypt(key, b1))).toBe('same message')
        expect(new TextDecoder().decode(await decrypt(key, b2))).toBe('same message')
    })

    it('blob format: version || nonce(12) || ciphertext || tag(16)', async () => {
        const key = new Uint8Array(32).fill(0x99)
        const plain = new Uint8Array(10)
        const blob = await encrypt(key, plain)

        expect(blob.length).toBe(1 + 12 + 10 + 16)
        expect(blob[0]).toBe(1)
    })
})

describe('HKDF per-item key', () => {
    it('different item IDs → different keys', async () => {
        const accountKey = new Uint8Array(32).fill(0x55)
        const k1 = await deriveItemKey(accountKey, 'uuid-1')
        const k2 = await deriveItemKey(accountKey, 'uuid-2')
        expect(Array.from(k1)).not.toEqual(Array.from(k2))
    })

    it('is deterministic per item', async () => {
        const accountKey = new Uint8Array(32).fill(0x55)
        const k1 = await deriveItemKey(accountKey, 'same-uuid')
        const k2 = await deriveItemKey(accountKey, 'same-uuid')
        expect(Array.from(k1)).toEqual(Array.from(k2))
    })
})