import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import * as authApi from '@/api/auth'
import { extractApiError, onAuthFailure, setAccessToken } from '@/api/client'
import { base64ToBytes, bytesToBase64 } from '@/crypto/base64'
import { decrypt, encrypt } from '@/crypto/cipher'
import { DEFAULT_KDF_PARAMS, deriveKey } from '@/crypto/argon2'
import * as session from '@/crypto/session'
import { getDeviceID, getDeviceName, getDevicePlatform } from '@/platform/device'
import {
    DEFAULT_SESSION_SETTINGS,
    loadSessionSettings,
    saveSessionSettings,
    type ISessionSettings,
} from '@/platform/session-settings'

const ACCESS_TOKEN_KEY = 'pm.access_token'
const REFRESH_TOKEN_KEY = 'pm.refresh_token'
const USER_EMAIL_KEY = 'pm.user_email'

const deriveMasterKey = async (password: string, encSalt: Uint8Array): Promise<Uint8Array> => {
    return deriveKey(new TextEncoder().encode(password), encSalt, DEFAULT_KDF_PARAMS)
}

const deriveAuthKey = async (password: string, authSalt: Uint8Array): Promise<Uint8Array> => {
    return deriveKey(new TextEncoder().encode(password), authSalt, DEFAULT_KDF_PARAMS)
}

export const useAuthStore = defineStore('auth', () => {
    const isUnlocked = ref(false)
    const email = ref<string | null>(null)
    const settings = ref<ISessionSettings>(loadSessionSettings())
    const lastActivityAt = ref<number>(Date.now())
    const busy = ref(false)
    const lastError = ref<string | null>(null)

    const isAuthenticated = computed(() => isUnlocked.value)
    const autoLockMs = computed(() => settings.value.autoLockMinutes * 60_000)

    const persistTokens = (access: string, refresh: string | null): void => {
        setAccessToken(access)
        localStorage.setItem(ACCESS_TOKEN_KEY, access)
        if (refresh) {
            if (settings.value.rememberDevice) {
                localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
            } else {
                localStorage.removeItem(REFRESH_TOKEN_KEY)
            }
        }
    }

    const clearTokens = (): void => {
        setAccessToken(null)
        localStorage.removeItem(ACCESS_TOKEN_KEY)
        localStorage.removeItem(REFRESH_TOKEN_KEY)
        localStorage.removeItem(USER_EMAIL_KEY)
    }

    const getStoredRefresh = (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY)

    const refreshAccessToken = async (): Promise<boolean> => {
        const refresh = getStoredRefresh()
        if (!refresh) return false
        try {
            const resp = await authApi.refresh({ refresh_token: refresh })
            persistTokens(resp.access_token, resp.refresh_token)
            return true
        } catch {
            clearTokens()
            return false
        }
    }

    const register = async (userEmail: string, masterPassword: string): Promise<void> => {
        busy.value = true
        lastError.value = null

        let authKey: Uint8Array | null = null

        try {
            const encSalt = crypto.getRandomValues(new Uint8Array(16))
            const authSalt = crypto.getRandomValues(new Uint8Array(16))

            const [masterKey, derivedAuthKey] = await Promise.all([
                deriveMasterKey(masterPassword, encSalt),
                deriveAuthKey(masterPassword, authSalt),
            ])
            authKey = derivedAuthKey

            const accountKey = crypto.getRandomValues(new Uint8Array(32))
            const wrapped = await encrypt(masterKey, accountKey)

            masterKey.fill(0)

            await authApi.register({
                email: userEmail,
                auth_key: bytesToBase64(authKey),
                auth_salt: bytesToBase64(authSalt),
                enc_salt: bytesToBase64(encSalt),
                kdf_params: bytesToBase64(
                    new TextEncoder().encode(
                        JSON.stringify({
                            algo: 'argon2id',
                            memoryKiB: DEFAULT_KDF_PARAMS.memoryKiB,
                            iterations: DEFAULT_KDF_PARAMS.iterations,
                            parallelism: DEFAULT_KDF_PARAMS.parallelism,
                        }),
                    ),
                ),
                wrapped_account_key: bytesToBase64(wrapped),
            })

            // authKey ещё нужен для loginFinish — обнулим в finally
            await loginFinish(userEmail, authKey, accountKey)
        } catch (err) {
            const apiErr = extractApiError(err)
            lastError.value = apiErr?.message ?? (err as Error).message
            throw err
        } finally {
            if (authKey) authKey.fill(0)
            busy.value = false
        }
    }

    const loginFinish = async (
        userEmail: string,
        authKey: Uint8Array,
        accountKey: Uint8Array,
    ): Promise<void> => {
        const resp = await authApi.loginFinish({
            email: userEmail,
            auth_key: bytesToBase64(authKey),
            device_id: getDeviceID(),
            device_name: getDeviceName(),
            device_platform: getDevicePlatform(),
        })

        persistTokens(resp.access_token, resp.refresh_token)
        localStorage.setItem(USER_EMAIL_KEY, userEmail)
        email.value = userEmail

        session.setAccountKey(accountKey)
        session.setWrappedAccountKey(base64ToBytes(resp.wrapped_account_key))

        isUnlocked.value = true
        touchActivity()
    }

    const login = async (userEmail: string, masterPassword: string): Promise<void> => {
        busy.value = true
        lastError.value = null
        try {
            const start = await authApi.loginStart({ email: userEmail })
            const authSalt = base64ToBytes(start.auth_salt)
            const encSalt = base64ToBytes(start.enc_salt)

            const [masterKey, authKey] = await Promise.all([
                deriveMasterKey(masterPassword, encSalt),
                deriveAuthKey(masterPassword, authSalt),
            ])

            try {
                const resp = await authApi.loginFinish({
                    email: userEmail,
                    auth_key: bytesToBase64(authKey),
                    device_id: getDeviceID(),
                    device_name: getDeviceName(),
                    device_platform: getDevicePlatform(),
                })

                const wrapped = base64ToBytes(resp.wrapped_account_key)
                const accountKey = await decrypt(masterKey, wrapped)

                persistTokens(resp.access_token, resp.refresh_token)
                localStorage.setItem(USER_EMAIL_KEY, userEmail)
                email.value = userEmail

                session.setAccountKey(accountKey)
                session.setWrappedAccountKey(wrapped)

                isUnlocked.value = true
                touchActivity()
            } finally {
                masterKey.fill(0)
                authKey.fill(0)
            }
        } catch (err) {
            const apiErr = extractApiError(err)
            lastError.value = apiErr?.message ?? (err as Error).message
            throw err
        } finally {
            busy.value = false
        }
    }

    const logout = async (): Promise<void> => {
        const refresh = getStoredRefresh()
        if (refresh) {
            try {
                await authApi.logout(refresh)
            } catch {
            }
        }
        lock()
        clearTokens()
        email.value = null
    }

    const lock = (): void => {
        session.lock()
        isUnlocked.value = false
        setAccessToken(null)
    }

    const touchActivity = (): void => {
        lastActivityAt.value = Date.now()
    }

    const shouldAutoLock = (): boolean => {
        if (!isUnlocked.value) return false
        if (settings.value.autoLockMinutes === 0) return false
        return Date.now() - lastActivityAt.value >= autoLockMs.value
    }

    const updateSettings = (patch: Partial<ISessionSettings>): void => {
        settings.value = { ...settings.value, ...patch }
        saveSessionSettings(settings.value)
    }

    const resetSettings = (): void => {
        settings.value = { ...DEFAULT_SESSION_SETTINGS }
        saveSessionSettings(settings.value)
    }

    const bootstrap = async (): Promise<void> => {
        const storedEmail = localStorage.getItem(USER_EMAIL_KEY)
        if (storedEmail) email.value = storedEmail

        const hasRefresh = !!getStoredRefresh()
        if (!hasRefresh) return

        await refreshAccessToken()
    }

    onAuthFailure(async () => {
        const ok = await refreshAccessToken()
        if (!ok) lock()
    })

    return {
        isUnlocked,
        isAuthenticated,
        email,
        settings,
        busy,
        lastError,

        register,
        login,
        logout,
        lock,
        touchActivity,
        shouldAutoLock,
        updateSettings,
        resetSettings,
        bootstrap,
        refreshAccessToken,
    }
})