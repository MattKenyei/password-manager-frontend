const CLEAR_AFTER_MS = 30_000

let clearTimer: ReturnType<typeof setTimeout> | null = null
let lastCopied: string | null = null

export const copySensitive = async (text: string) => {
    if (!navigator.clipboard) {
        throw new Error('clipboard API is not available (requires https or localhost)')
    }

    await navigator.clipboard.writeText(text)
    lastCopied = text

    if (clearTimer) clearTimeout(clearTimer)
    clearTimer = setTimeout(async () => {
        try {
            const current = await navigator.clipboard.readText()
            if (current === lastCopied) {
                await navigator.clipboard.writeText('')
            }
        } catch (error) {

        }
        lastCopied = null
        clearTimer = null
    }, CLEAR_AFTER_MS)
}

export const cancelClipboardClear = () => {
    if (clearTimer) {
        clearTimeout(clearTimer)
        clearTimer = null
    }
    lastCopied = null
}