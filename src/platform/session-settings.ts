export interface ISessionSettings {
    autoLockMinutes: number
    lockOnTabHide: boolean
    rememberDevice: boolean
}

const STORAGE_KEY = 'pm.session_settings'

export const DEFAULT_SESSION_SETTINGS: ISessionSettings = {
    autoLockMinutes: 5,
    lockOnTabHide: false,
    rememberDevice: true
}

export const loadSessionSettings = (): ISessionSettings => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SESSION_SETTINGS }
    try {
        const parsed = JSON.parse(raw) as Partial<ISessionSettings>
        return { ...DEFAULT_SESSION_SETTINGS, ...parsed }
    } catch (error) {
        return { ...DEFAULT_SESSION_SETTINGS }
    }
}

export const saveSessionSettings = (settings: ISessionSettings) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}