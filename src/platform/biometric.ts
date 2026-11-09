import { BiometricAuth } from "@aparajita/capacitor-biometric-auth"
import { isCapacitor } from "./env"

export interface IBiometricAvailability {
    available: boolean
    biometryType: 'fingerprint' | 'face' | 'iris' | 'none'
}

export const checkBiometricAvailable = async (): Promise<IBiometricAvailability> => {
    if (!isCapacitor()) return { available: false, biometryType: 'none' }

    try {
        const info = await BiometricAuth.checkBiometry()
        const type = info.biometryType
        return {
            available: info.isAvailable,
            biometryType:
                type === 1 ? 'fingerprint' : type === 2 ? 'face' : type === 3 ? 'iris' : 'none'
        }
    } catch {
        return { available: false, biometryType: 'none' }
    }
}

export const promptBiometric = async (reason: string): Promise<boolean> => {
    if (!isCapacitor()) return false

    try {
        await BiometricAuth.authenticate({
            reason,
            cancelTitle: 'Cancel',
            allowDeviceCredential: false,
            iosFallbackTitle: 'Use Password',
            androidTitle: 'Unlock vault',
            androidSubtitle: reason
        })
        return true
    } catch {
        return false
    }
}