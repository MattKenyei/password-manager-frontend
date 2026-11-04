export interface IGeneratorOptions {
    length: number
    useLowercase: boolean
    useUppercase: boolean
    useDigits: boolean
    useSymbols: boolean
    avoidAmbiguous: boolean
}

export const DEFAULT_GENERATOR_OPTIONS: IGeneratorOptions = {
    length: 20,
    useLowercase: true,
    useUppercase: true,
    useDigits: true,
    useSymbols: true,
    avoidAmbiguous: true
}

const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz'
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const DIGITS = '0123456789'
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?'
const AMBIGUOUS = 'lI1O0o'

const pick = (chars: string): string => {
    const bytes = crypto.getRandomValues(new Uint32Array(1))
    return chars[bytes[0] % chars.length]
}

export const generatePassword = (opts: IGeneratorOptions = DEFAULT_GENERATOR_OPTIONS): string => {
    const filterAmbiguous = (s: string): string => {
        if (!opts.avoidAmbiguous) return s
        return [...s].filter((c) => !AMBIGUOUS.includes(c)).join('')
    }

    // Apply filter to EVERY group
    const groups: string[] = []
    if (opts.useLowercase) groups.push(filterAmbiguous(LOWERCASE))
    if (opts.useUppercase) groups.push(filterAmbiguous(UPPERCASE))
    if (opts.useDigits) groups.push(filterAmbiguous(DIGITS))
    if (opts.useSymbols) groups.push(filterAmbiguous(SYMBOLS))

    const nonEmpty = groups.filter((g) => g.length > 0)
    if (nonEmpty.length === 0) {
        throw new Error('at least one character class must be selected')
    }

    const pool = nonEmpty.join('')
    const length = Math.max(opts.length, nonEmpty.length)

    const required = nonEmpty.map((g) => pick(g))

    const rest: string[] = []
    for (let i = required.length; i < length; i++) {
        rest.push(pick(pool))
    }

    const all = [...required, ...rest]
    for (let i = all.length - 1; i > 0; i--) {
        const bytes = crypto.getRandomValues(new Uint32Array(1))
        const j = bytes[0] % (i + 1)
            ;[all[i], all[j]] = [all[j], all[i]]
    }

    return all.join('')
}

export const estimateEntropy = (opts: IGeneratorOptions): number => {
    const classes =
        (opts.useLowercase ? 26 : 0) +
        (opts.useUppercase ? 26 : 0) +
        (opts.useDigits ? 10 : 0) +
        (opts.useSymbols ? SYMBOLS.length : 0)

    if (classes === 0) return 0
    return Math.floor(opts.length * Math.log2(classes))
}