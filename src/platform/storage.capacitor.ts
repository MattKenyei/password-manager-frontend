import { SecureStorage } from '@aparajita/capacitor-secure-storage'
import { bytesToBase64, base64ToBytes } from '@/crypto/base64'

const ACCOUNT_KEY = 'pm.mobile.account_key'
const BIOMETRIC_ENABLED_KEY = 'pm.mobile.biometric_enabled'

export const saveAccountKeyToKeychain = async (key: Uint8Array) => {
    await SecureStorage.set(ACCOUNT_KEY, bytesToBase64(key))
}

export const loadAccountKeyFromKeychain = async (): Promise<Uint8Array | null> => {
    const raw = await SecureStorage.get(ACCOUNT_KEY)
    if (!raw) return null
    return base64ToBytes(raw as string)
}

export const deleteAccountKeyFromKeychain = async () => {
    await SecureStorage.remove(ACCOUNT_KEY)
}

export const setBiometricEnabled = async (enabled: boolean) => {
    if (enabled) {
        await SecureStorage.set(BIOMETRIC_ENABLED_KEY, '1')
    } else {
        await SecureStorage.remove(BIOMETRIC_ENABLED_KEY)
        await deleteAccountKeyFromKeychain()
    }
}

export const isBiometricEnabled = async (): Promise<boolean> => {
    const raw = await SecureStorage.get(BIOMETRIC_ENABLED_KEY)
    return raw === '1'
}