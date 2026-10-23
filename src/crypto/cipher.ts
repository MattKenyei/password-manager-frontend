import { bufSource } from "./bytes"

const VERSION = 0x01
const NONCE_LENGTH = 12
const TAG_LENGTH = 16
const KEY_LENGTH = 32

export interface EncryptedBlob {
    version: number
    nonce: Uint8Array
    cipherText: Uint8Array
    tag: Uint8Array
}

export const packBlob = (nonce: Uint8Array, cipherTextWithTag: Uint8Array): Uint8Array => {
    if (nonce.length !== NONCE_LENGTH) {
        throw new Error(`nonce must be ${NONCE_LENGTH} bytes`)
    }
    const out = new Uint8Array(1 + NONCE_LENGTH + cipherTextWithTag.length)
    out[0] = VERSION
    out.set(nonce, 1)
    out.set(cipherTextWithTag, 1 + NONCE_LENGTH)
    return out
}

export const unpackBlob = (blob: Uint8Array): EncryptedBlob => {
    if (blob.length < 1 + NONCE_LENGTH + TAG_LENGTH)
        throw new Error('encrypted blob too short')
    const version = blob[0]
    if (version !== VERSION)
        throw new Error(`unsupported blob version : ${version}`)
    const nonce = blob.slice(1, 1 + NONCE_LENGTH)
    const ctWithTag = blob.slice(1 + NONCE_LENGTH)
    const cipherText = ctWithTag.slice(0, ctWithTag.length - TAG_LENGTH)
    const tag = ctWithTag.slice(ctWithTag.length - TAG_LENGTH)
    return { version, nonce, cipherText, tag }
}

const importAesKey = async (raw: Uint8Array, usages: KeyUsage[]): Promise<CryptoKey> => {
    if (raw.length !== KEY_LENGTH)
        throw new Error(`AES-256 key must be ${KEY_LENGTH} bytes`)
    return crypto.subtle.importKey('raw', bufSource(raw), { name: 'AES-GCM' }, false, usages)
}

export const encrypt = async (key: Uint8Array, plaintext: Uint8Array): Promise<Uint8Array> => {
    const cryptoKey = await importAesKey(key, ['encrypt'])
    const nonce = crypto.getRandomValues(new Uint8Array(NONCE_LENGTH))
    const ciphertextWithTag = new Uint8Array(
        await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: bufSource(nonce) },
            cryptoKey,
            bufSource(plaintext),
        ),
    )
    return packBlob(nonce, ciphertextWithTag)
}

export const decrypt = async (key: Uint8Array, blob: Uint8Array): Promise<Uint8Array> => {
    const { nonce, cipherText, tag } = unpackBlob(blob)
    const cryptoKey = await importAesKey(key, ['decrypt'])

    const ctWithTag = new Uint8Array(cipherText.length + tag.length)
    ctWithTag.set(cipherText, 0)
    ctWithTag.set(tag, cipherText.length)

    const plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: bufSource(nonce) },
        cryptoKey,
        bufSource(ctWithTag),
    )
    return new Uint8Array(plaintext)
}