import { base64ToBytes, bytesToBase64 } from '@/crypto/base64'

const SESSION_KEY = 'pm.ext.session'

let accountKey: Uint8Array | null = null
let currentEmail: string | null = null
let deviceId: string | null = null

interface PersistedSession {
    accountKeyB64: string
    email: string
    deviceId: string
}

const saveToSessionStorage = async () => {
    if (!accountKey || !currentEmail || !deviceId) return
    const data: PersistedSession = {
        accountKeyB64: bytesToBase64(accountKey),
        email: currentEmail,
        deviceId,
    }
    await chrome.storage.session.set({ [SESSION_KEY]: data })
}

const loadFromSessionStorage = async (): Promise<boolean> => {
    const raw = await chrome.storage.session.get(SESSION_KEY)
    const data = raw[SESSION_KEY] as PersistedSession | undefined
    if (!data) return false
    accountKey = base64ToBytes(data.accountKeyB64)
    currentEmail = data.email
    deviceId = data.deviceId
    return true
}

export const initSession = async () => {
    if (accountKey) return
    await loadFromSessionStorage()
}

export const unlockSession = async (
    key: Uint8Array,
    email: string,
    devId: string,
) => {
    accountKey = new Uint8Array(key)
    currentEmail = email
    deviceId = devId
    await saveToSessionStorage()
}

export const getAccountKey = (): Uint8Array => {
    if (!accountKey) throw new Error('vault is locked')
    return accountKey
}

export const getEmail = (): string | null => currentEmail
export const getDeviceId = (): string | null => deviceId
export const isUnlocked = (): boolean => accountKey !== null

export const lockSession = async () => {
    if (accountKey) accountKey.fill(0)
    accountKey = null
    currentEmail = null
    deviceId = null
    await chrome.storage.session.remove(SESSION_KEY)
}