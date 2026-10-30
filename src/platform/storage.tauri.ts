import { setPassword, getPassword, deletePassword } from 'tauri-plugin-keyring-api'

const SERVICE = 'com.passwordmanager.app'
const ACCOUNT = 'wrapped_account_key'

export const saveToKeychain = async (data: string): Promise<void> => {
    await setPassword(SERVICE, ACCOUNT, data)
}

export const loadFromKeychain = async (): Promise<string | null> => {
    try {
        return await getPassword(SERVICE, ACCOUNT)
    } catch {
        return null
    }
}

export const deleteFromKeychain = async (): Promise<void> => {
    try {
        await deletePassword(SERVICE, ACCOUNT)
    } catch {
    }
}