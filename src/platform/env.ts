export const isTauri = (): boolean => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

export const isCapicator = (): boolean => typeof window !== 'undefined' && 'Capicator' in window

export const isExtension = (): boolean => {
    return (
        typeof chrome !== 'undefined' &&
        typeof chrome.runtime !== 'undefined' &&
        typeof chrome.runtime.id === 'string'
    )
}

export const platform = (): 'web' | 'tauri' | 'capicator' | 'extiension' => {
    if (isTauri()) return 'tauri'
    if (isCapicator()) return 'capicator'
    if (isExtension()) return 'extiension'
    return 'web'
}