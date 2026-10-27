import { ZxcvbnFactory } from '@zxcvbn-ts/core'
import * as common from '@zxcvbn-ts/language-common'
import * as en from '@zxcvbn-ts/language-en'

// Создаём один инстанс при первом использовании.
let zxcvbnInstance: ZxcvbnFactory | null = null

const getZxcvbn = (): ZxcvbnFactory => {
    if (zxcvbnInstance) return zxcvbnInstance

    const options = {
        dictionary: {
            ...common.dictionary,
            ...en.dictionary,
        },
        graphs: common.adjacencyGraphs,
        translations: en.translations,
    }

    zxcvbnInstance = new ZxcvbnFactory(options)
    return zxcvbnInstance
}

export interface PasswordStrength {
    score: 0 | 1 | 2 | 3 | 4
    label: string
    color: string
    width: string
    warning: string
    suggestions: string[]
}

const EMPTY: PasswordStrength = {
    score: 0,
    label: '',
    color: '',
    width: 'w-0',
    warning: '',
    suggestions: [],
}

const LABELS = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong']
const COLORS = ['bg-red-600', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500']
const WIDTHS = ['w-1/5', 'w-2/5', 'w-3/5', 'w-4/5', 'w-full']

export const checkPasswordStrength = (password: string): PasswordStrength => {
    if (!password) return { ...EMPTY }

    const result = getZxcvbn().check(password)
    const score = result.score as 0 | 1 | 2 | 3 | 4

    return {
        score,
        label: LABELS[score],
        color: COLORS[score],
        width: WIDTHS[score],
        warning: result.feedback.warning ?? '',
        suggestions: result.feedback.suggestions ?? [],
    }
}