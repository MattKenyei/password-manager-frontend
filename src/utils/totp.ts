import type { ITotpConfig } from '@/db/types'

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

const base32Decode = (input: string): Uint8Array => {
    const cleaned = input.toUpperCase().replace(/[^A-Z2-7]/g, '')
    const bytes: number[] = []
    let buffer = 0
    let bitsLeft = 0

    for (const char of cleaned) {
        const value = BASE32_ALPHABET.indexOf(char)
        if (value === -1) continue
        buffer = (buffer << 5) | value
        bitsLeft += 5
        if (bitsLeft >= 8) {
            bytes.push((buffer >> (bitsLeft - 8)) & 0xff)
            bitsLeft -= 8
        }
    }

    return new Uint8Array(bytes)
}

const normalizeAlgorithm = (raw: string): 'SHA-1' | 'SHA-256' | 'SHA-512' => {
    const upper = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (upper === 'SHA256') return 'SHA-256'
    if (upper === 'SHA512') return 'SHA-512'
    return 'SHA-1'
}

export const DEFAULT_TOTP: Omit<ITotpConfig, 'secret'> = {
    algorithm: 'SHA-1',
    digits: 6,
    period: 30,
}

export const parseOtpauthUri = (uri: string): ITotpConfig | null => {
    try {
        const trimmed = uri.trim()
        if (!trimmed.startsWith('otpauth://')) return null

        const url = new URL(trimmed)
        if (url.host !== 'totp') return null

        const secret = url.searchParams.get('secret')
        if (!secret) return null

        const digits = parseInt(url.searchParams.get('digits') ?? '6', 10)
        const period = parseInt(url.searchParams.get('period') ?? '30', 10)
        const algorithm = normalizeAlgorithm(url.searchParams.get('algorithm') ?? 'SHA1')

        const label = decodeURIComponent(url.pathname.slice(1))
        const colonIdx = label.indexOf(':')
        const labelIssuer = colonIdx >= 0 ? label.slice(0, colonIdx).trim() : undefined
        const account = colonIdx >= 0 ? label.slice(colonIdx + 1).trim() : label.trim()
        const issuer = url.searchParams.get('issuer')?.trim() ?? labelIssuer

        return {
            secret: secret.toUpperCase(),
            algorithm,
            digits: Math.max(6, Math.min(8, digits)),
            period: Math.max(15, Math.min(120, period)),
            issuer: issuer || undefined,
            account: account || undefined,
        }
    } catch {
        return null
    }
}

export const isValidBase32Secret = (secret: string): boolean => {
    const cleaned = secret.toUpperCase().replace(/[^A-Z2-7]/g, '')
    return cleaned.length >= 16 && cleaned.length <= 128
}

export const generateTotp = async (
    config: ITotpConfig,
    timeMs: number = Date.now(),
): Promise<string> => {
    const counter = Math.floor(timeMs / 1000 / config.period)
    const secretBytes = base32Decode(config.secret)

    if (secretBytes.length === 0) {
        throw new Error('invalid TOTP secret')
    }

    const key = await crypto.subtle.importKey(
        'raw',
        new Uint8Array(secretBytes),
        { name: 'HMAC', hash: config.algorithm },
        false,
        ['sign'],
    )

    const counterBuffer = new ArrayBuffer(8)
    const view = new DataView(counterBuffer)
    view.setBigUint64(0, BigInt(counter))

    const hmac = new Uint8Array(await crypto.subtle.sign('HMAC', key, counterBuffer))

    const offset = hmac[hmac.length - 1] & 0x0f
    const truncated =
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff)

    const code = truncated % Math.pow(10, config.digits)
    return code.toString().padStart(config.digits, '0')
}

export const secondsRemaining = (config: ITotpConfig, timeMs: number = Date.now()): number => {
    const periodMs = config.period * 1000
    return Math.ceil(((periodMs - (timeMs % periodMs)) / 1000))
}