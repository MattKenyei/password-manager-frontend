const RECOVERY_INFO = new TextEncoder().encode('pm-recovery-v1')
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export const generateRecoveryCode = (): Uint8Array => {
    return crypto.getRandomValues(new Uint8Array(32))
}

export const deriveRecoveryKey = async (code: Uint8Array): Promise<Uint8Array> => {
    if (code.length !== 32) throw new Error('recovery code must be 32 bytes')
    const baseKey = await crypto.subtle.importKey('raw', code, 'HKDF', false, ['deriveBits'])
    const bits = await crypto.subtle.deriveBits(
        { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: RECOVERY_INFO },
        baseKey,
        256,
    )
    return new Uint8Array(bits)
}

export const recoveryCodeToBase32 = (code: Uint8Array): string => {
    let out = ''
    let buffer = 0
    let bits = 0
    for (const b of code) {
        buffer = (buffer << 8) | b
        bits += 8
        while (bits >= 5) {
            bits -= 5
            out += BASE32[(buffer >> bits) & 0x1f]
        }
    }
    if (bits > 0) out += BASE32[(buffer << (5 - bits)) & 0x1f]
    return out.match(/.{1,4}/g)!.join(' ')
}

export const base32ToRecoveryCode = (input: string): Uint8Array => {
    const cleaned = input.toUpperCase().replace(/[^A-Z2-7]/g, '')
    const out: number[] = []
    let buffer = 0
    let bits = 0
    for (const c of cleaned) {
        const v = BASE32.indexOf(c)
        if (v === -1) continue
        buffer = (buffer << 5) | v
        bits += 5
        if (bits >= 8) {
            bits -= 8
            out.push((buffer >> bits) & 0xff)
        }
    }
    if (out.length !== 32) throw new Error('recovery code must decode to 32 bytes')
    return new Uint8Array(out)
}