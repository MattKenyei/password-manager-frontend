export const isTauri = (): boolean => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

export const isCapacitor = (): boolean => typeof window !== 'undefined' && 'Capicator' in window

export const isExtension = (): boolean => {
    return (
        typeof chrome !== 'undefined' &&
        typeof chrome.runtime !== 'undefined' &&
        typeof chrome.runtime.id === 'string'
    )
}

export const isAndroid = (): boolean =>
    isCapacitor() && (window as any).Capacitor.getPlatform() === 'android'

export const isIOS = (): boolean =>
    isCapacitor() && (window as any).Capacitor.getPlatform() === 'ios'

export const platform = (): 'web' | 'tauri' | 'capicator' | 'extiension' | 'android' | 'ios' => {
    if (isTauri()) return 'tauri'
    if (isCapacitor()) return 'capicator'
    if (isExtension()) return 'extiension'
    if (isAndroid()) return 'android'
    if (isIOS()) return 'ios'
    return 'web'
}