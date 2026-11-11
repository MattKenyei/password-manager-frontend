import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import * as authApi from '@/api/auth'
import { humanizeApiError, onAuthFailure, setAccessToken } from '@/api/client'
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
import { startWs, stopWs, updateToken } from '@/services/websocket'
import { triggerSync } from '@/services/sync'
import { isCapacitor } from '@/platform/env'
import { checkBiometricAvailable, promptBiometric } from '@/platform/biometric'
import { deleteAccountKeyFromKeychain, isBiometricEnabled, loadAccountKeyFromKeychain, saveAccountKeyToKeychain, setBiometricEnabled } from '@/platform/storage.capacitor'
import { deriveRecoveryKey, generateRecoveryCode, recoveryCodeToBase32 } from '@/crypto/recovery'

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

    const biometricAvailable = ref(false)
    const biometricEnabled = ref(false)


    const persistTokens = (access: string, refresh: string | null) => {
        setAccessToken(access)
        if (refresh) {
            if (settings.value.rememberDevice) {
                localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
            } else {
                localStorage.removeItem(REFRESH_TOKEN_KEY)
            }
        }
        updateToken(access)
    }

    const clearTokens = () => {
        setAccessToken(null)
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

    const register = async (userEmail: string, masterPassword: string): Promise<string> => {
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

            const wrappedMaster = await encrypt(masterKey, accountKey)
            masterKey.fill(0)

            const recoveryCode = generateRecoveryCode()
            const recoveryKey = await deriveRecoveryKey(recoveryCode)
            const wrappedRecovery = await encrypt(recoveryKey, accountKey)
            recoveryKey.fill(0)

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
                wrapped_keys: [
                    { kind: 'master', wrapped_blob: bytesToBase64(wrappedMaster) },
                    { kind: 'recovery', wrapped_blob: bytesToBase64(wrappedRecovery) },
                ],
            })

            await loginFinish(userEmail, authKey, accountKey)

            return recoveryCodeToBase32(recoveryCode)
        } catch (err) {
            lastError.value = humanizeApiError(err)
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
    ) => {
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

        let wrappedMasterB64: string | undefined

        if (resp.wrapped_keys && resp.wrapped_keys.length > 0) {
            const master = resp.wrapped_keys.find((k) => k.kind === 'master')
            if (!master) {
                console.error('[auth] wrapped_keys[] missing master kind:', resp)
                throw new Error('Server response is missing master wrapped key')
            }
            wrappedMasterB64 = master.wrapped_blob
        } else if (resp.wrapped_account_key) {
            wrappedMasterB64 = resp.wrapped_account_key
        }

        if (!wrappedMasterB64) {
            console.error('[auth] loginFinish: no wrapped key in response:', resp)
            throw new Error(
                `Server response is missing wrapped keys. ` +
                `Check that the backend is reachable at ${import.meta.env.VITE_API_URL || 'http://10.0.2.2:8080'}. ` +
                `Raw response: ${JSON.stringify(resp)}`,
            )
        }

        session.setAccountKey(accountKey)
        session.setWrappedAccountKey(base64ToBytes(wrappedMasterB64))

        isUnlocked.value = true
        const accessToken = localStorage.getItem('pm.access_token') ?? ''
        touchActivity()
        startWs(accessToken, () => { void triggerSync() })
    }

    const login = async (userEmail: string, masterPassword: string) => {
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

                let wrappedMasterB64: string | undefined
                if (resp.wrapped_keys && resp.wrapped_keys.length > 0) {
                    const master = resp.wrapped_keys.find((k) => k.kind === 'master')
                    if (!master) throw new Error('Server response is missing master wrapped key')
                    wrappedMasterB64 = master.wrapped_blob
                } else if (resp.wrapped_account_key) {
                    wrappedMasterB64 = resp.wrapped_account_key
                }
                if (!wrappedMasterB64) {
                    throw new Error('Server response is missing wrapped keys')
                }

                const wrapped = base64ToBytes(wrappedMasterB64)
                const accountKey = await decrypt(masterKey, wrapped)

                persistTokens(resp.access_token, resp.refresh_token)
                localStorage.setItem(USER_EMAIL_KEY, userEmail)
                email.value = userEmail

                session.setAccountKey(accountKey)
                session.setWrappedAccountKey(wrapped)

                isUnlocked.value = true
                touchActivity()


                const accessToken = localStorage.getItem('pm.access_token') ?? ''
                if (accessToken) {
                    startWs(accessToken, () => { void triggerSync() })
                }
            } finally {
                masterKey.fill(0)
                authKey.fill(0)
            }
        } catch (err) {
            lastError.value = humanizeApiError(err)
            throw err
        } finally {
            busy.value = false
        }
    }

    const logout = async () => {
        const refresh = getStoredRefresh()
        if (refresh) {
            try {
                await authApi.logout(refresh)
            } catch {
            }
        }
        lock()
        await deleteAccountKeyFromKeychain()
        await setBiometricEnabled(false)
        biometricEnabled.value = false
        clearTokens()
        email.value = null
    }

    const lock = () => {
        session.lock()
        isUnlocked.value = false
        stopWs()
        setAccessToken(null)
    }

    const touchActivity = () => {
        lastActivityAt.value = Date.now()
    }

    const shouldAutoLock = (): boolean => {
        if (!isUnlocked.value) return false
        if (settings.value.autoLockMinutes === 0) return false
        return Date.now() - lastActivityAt.value >= autoLockMs.value
    }

    const updateSettings = (patch: Partial<ISessionSettings>) => {
        settings.value = { ...settings.value, ...patch }
        saveSessionSettings(settings.value)
    }

    const resetSettings = () => {
        settings.value = { ...DEFAULT_SESSION_SETTINGS }
        saveSessionSettings(settings.value)
    }

    const bootstrap = async () => {
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

    const initBiometric = async () => {
        if (!isCapacitor()) return
        const availability = await checkBiometricAvailable()
        biometricAvailable.value = availability.available
        if (availability.available) {
            biometricEnabled.value = await isBiometricEnabled()
        }
    }

    const enableBiometricUnlock = async () => {
        if (!isCapacitor() || !biometricAvailable.value) {
            throw new Error('biometric not available')
        }
        const accountKey = session.getAccountKey()
        await saveAccountKeyToKeychain(accountKey)
        await setBiometricEnabled(true)
        biometricEnabled.value = true
    }

    const disableBiometricUnlock = async () => {
        await setBiometricEnabled(false)
        biometricEnabled.value = false
    }

    const unlockWithBiometric = async () => {
        if (!biometricEnabled.value) {
            throw new Error('biometric unlock is not enabled')
        }
        const ok = await promptBiometric('Unlock your vault')
        if (!ok) throw new Error('biometric authentication failed')

        const accountKey = await loadAccountKeyFromKeychain()
        if (!accountKey) {
            throw new Error('no stored key — please log in with master password')
        }

        session.setAccountKey(accountKey)
        isUnlocked.value = true
        touchActivity()

        const accessToken = localStorage.getItem('pm.access_token')
        if (accessToken) {
            startWs(accessToken, () => { void triggerSync() })
        }
    }

    return {
        isUnlocked,
        isAuthenticated,
        email,
        settings,
        busy,
        lastError,
        biometricAvailable,
        biometricEnabled,

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
        initBiometric,
        enableBiometricUnlock,
        disableBiometricUnlock,
        unlockWithBiometric
    }
})