import { describe, it, expect } from 'vitest'
import { generateTotp, secondsRemaining, parseOtpauthUri, isValidBase32Secret } from './totp'

const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'

describe('TOTP (RFC 6238 test vectors, SHA-1, 8 digits)', () => {
    const config = {
        secret: RFC_SECRET,
        algorithm: 'SHA-1' as const,
        digits: 8,
        period: 30,
    }

    it.each([
        [59_000, '94287082'],           // T = 1
        [1_111_111_109_000, '07081804'], // T = 37037037
        [1_111_111_111_000, '14050471'], // T = 37037037
        [1_234_567_890_000, '89005924'], // T = 41152263
        [2_000_000_000_000, '69279037'], // T = 66666667
        [20_000_000_000_000, '65353130'], // T = 666666667
    ])('t=%i ms → %s', async (timeMs, expected) => {
        const code = await generateTotp(config, timeMs)
        expect(code).toBe(expected)
    })
})

describe('TOTP 6-digit (real-world)', () => {
    it('generates 6 digits by default', async () => {
        const code = await generateTotp({
            secret: 'JBSWY3DPEHPK3PXP',
            algorithm: 'SHA-1',
            digits: 6,
            period: 30,
        })
        expect(code).toMatch(/^\d{6}$/)
    })
})

describe('secondsRemaining', () => {
    it('counts down within a period', () => {
        const config = { secret: RFC_SECRET, algorithm: 'SHA-1' as const, digits: 6, period: 30 }
        expect(secondsRemaining(config, 0)).toBe(30)
        expect(secondsRemaining(config, 10_000)).toBe(20)
        expect(secondsRemaining(config, 29_500)).toBe(1)
    })
})

describe('parseOtpauthUri', () => {
    it('parses a standard URI', () => {
        const uri = 'otpauth://totp/ACME:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=ACME&digits=6&period=30'
        const config = parseOtpauthUri(uri)
        expect(config).not.toBeNull()
        expect(config!.secret).toBe('JBSWY3DPEHPK3PXP')
        expect(config!.issuer).toBe('ACME')
        expect(config!.account).toBe('user@example.com')
        expect(config!.digits).toBe(6)
        expect(config!.period).toBe(30)
        expect(config!.algorithm).toBe('SHA-1')
    })

    it('rejects non-totp scheme', () => {
        expect(parseOtpauthUri('https://example.com')).toBeNull()
        expect(parseOtpauthUri('otpauth://hotp/foo?secret=BAR')).toBeNull()
    })

    it('rejects URI without secret', () => {
        expect(parseOtpauthUri('otpauth://totp/foo')).toBeNull()
    })
})

describe('isValidBase32Secret', () => {
    it('accepts standard Base32', () => {
        expect(isValidBase32Secret('JBSWY3DPEHPK3PXP')).toBe(true)
        expect(isValidBase32Secret('jbswy3dpehpk3pxp')).toBe(true)
    })

    it('rejects too short', () => {
        expect(isValidBase32Secret('ABC')).toBe(false)
    })

    it('rejects invalid characters', () => {
        expect(isValidBase32Secret('JBSWY3DP!!!')).toBe(false)
    })
})