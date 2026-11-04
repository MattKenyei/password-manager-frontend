import { describe, it, expect } from 'vitest'
import { generatePassword, estimateEntropy, DEFAULT_GENERATOR_OPTIONS } from './password-generator'

describe('generatePassword', () => {
    it('produces the requested length', () => {
        for (const len of [8, 16, 32, 64]) {
            const pwd = generatePassword({ ...DEFAULT_GENERATOR_OPTIONS, length: len })
            expect(pwd.length).toBe(len)
        }
    })

    it('guarantees at least one char from each enabled class', () => {
        for (let i = 0; i < 20; i++) {
            const pwd = generatePassword(DEFAULT_GENERATOR_OPTIONS)
            expect(pwd).toMatch(/[a-z]/)
            expect(pwd).toMatch(/[A-Z]/)
            expect(pwd).toMatch(/[0-9]/)
            expect(pwd).toMatch(/[^a-zA-Z0-9]/)
        }
    })

    it('omits disabled classes entirely', () => {
        const pwd = generatePassword({
            length: 32,
            useLowercase: true,
            useUppercase: false,
            useDigits: false,
            useSymbols: false,
            avoidAmbiguous: false,
        })
        expect(pwd).toMatch(/^[a-z]+$/)
    })

    it('avoids ambiguous characters when requested', () => {
        for (let i = 0; i < 20; i++) {
            const pwd = generatePassword({ ...DEFAULT_GENERATOR_OPTIONS, length: 64, avoidAmbiguous: true })
            expect(pwd).not.toMatch(/[lI1O0o]/)
        }
    })

    it('does not produce the same password twice', () => {
        const a = generatePassword(DEFAULT_GENERATOR_OPTIONS)
        const b = generatePassword(DEFAULT_GENERATOR_OPTIONS)
        expect(a).not.toBe(b)
    })

    it('throws when no character classes enabled', () => {
        expect(() =>
            generatePassword({
                length: 20,
                useLowercase: false,
                useUppercase: false,
                useDigits: false,
                useSymbols: false,
                avoidAmbiguous: false,
            }),
        ).toThrow()
    })
})

describe('estimateEntropy', () => {
    it('20 chars all classes ≈ 130 bits', () => {
        const bits = estimateEntropy({
            length: 20,
            useLowercase: true,
            useUppercase: true,
            useDigits: true,
            useSymbols: true,
            avoidAmbiguous: false,
        })
        // log2(26+26+10+~32) * 20 ≈ 6.5 * 20 = 130
        expect(bits).toBeGreaterThan(120)
        expect(bits).toBeLessThan(140)
    })

    it('lowercase only = log2(26) * length', () => {
        const bits = estimateEntropy({
            length: 10,
            useLowercase: true,
            useUppercase: false,
            useDigits: false,
            useSymbols: false,
            avoidAmbiguous: false,
        })
        // log2(26) ≈ 4.7, * 10 ≈ 47
        expect(bits).toBeGreaterThanOrEqual(45)
        expect(bits).toBeLessThanOrEqual(50)
    })

    it('returns 0 when no classes', () => {
        const bits = estimateEntropy({
            length: 20,
            useLowercase: false,
            useUppercase: false,
            useDigits: false,
            useSymbols: false,
            avoidAmbiguous: false,
        })
        expect(bits).toBe(0)
    })
})