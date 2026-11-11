import { describe, it, expect } from 'vitest'
import {
    generateRecoveryCode,
    deriveRecoveryKey,
    recoveryCodeToBase32,
    base32ToRecoveryCode,
} from './recovery'

describe('generateRecoveryCode', () => {
    it('returns 32 bytes', () => {
        const code = generateRecoveryCode()
        expect(code.length).toBe(32)
    })

    it('produces different codes on each call', () => {
        const a = generateRecoveryCode()
        const b = generateRecoveryCode()
        expect(Array.from(a)).not.toEqual(Array.from(b))
    })
})

describe('deriveRecoveryKey', () => {
    it('is deterministic', async () => {
        const code = new Uint8Array(32).fill(0x42)
        const k1 = await deriveRecoveryKey(code)
        const k2 = await deriveRecoveryKey(code)
        expect(Array.from(k1)).toEqual(Array.from(k2))
        expect(k1.length).toBe(32)
    })

    it('different codes → different keys', async () => {
        const k1 = await deriveRecoveryKey(new Uint8Array(32).fill(0x01))
        const k2 = await deriveRecoveryKey(new Uint8Array(32).fill(0x02))
        expect(Array.from(k1)).not.toEqual(Array.from(k2))
    })

    it('rejects wrong-length input', async () => {
        await expect(deriveRecoveryKey(new Uint8Array(16))).rejects.toThrow()
        await expect(deriveRecoveryKey(new Uint8Array(33))).rejects.toThrow()
    })
})

describe('base32 encoding', () => {
    it('roundtrips arbitrary 32-byte code', () => {
        const original = new Uint8Array(32)
        for (let i = 0; i < 32; i++) original[i] = (i * 7 + 13) & 0xff

        const encoded = recoveryCodeToBase32(original)
        const decoded = base32ToRecoveryCode(encoded)

        expect(Array.from(decoded)).toEqual(Array.from(original))
    })

    it('formats with groups of 4 chars', () => {
        const code = new Uint8Array(32).fill(0)
        const encoded = recoveryCodeToBase32(code)
        const groups = encoded.split(' ')
        expect(groups.length).toBe(13)
        groups.forEach((g) => expect(g.length).toBe(4))
    })

    it('tolerates spaces and lowercase', () => {
        const code = new Uint8Array(32).fill(0xAB)
        const encoded = recoveryCodeToBase32(code)
        const messy = encoded.toLowerCase().replace(/ /g, '')
        const decoded = base32ToRecoveryCode(messy)
        expect(Array.from(decoded)).toEqual(Array.from(code))
    })

    it('rejects input that does not decode to 32 bytes', () => {
        expect(() => base32ToRecoveryCode('JBSW Y3DP')).toThrow()
    })

    it('roundtrips randomly generated code', () => {
        for (let i = 0; i < 5; i++) {
            const original = generateRecoveryCode()
            const decoded = base32ToRecoveryCode(recoveryCodeToBase32(original))
            expect(Array.from(decoded)).toEqual(Array.from(original))
        }
    })
})