import type { IItemPayload } from '@/db/types'

export type ExtensionMessage =
    | { type: 'STATUS' }
    | { type: 'UNLOCK_START'; email: string }
    | { type: 'UNLOCK_FINISH'; email: string; authKey: string; accountKey: string; accessToken: string; refreshToken: string }
    | { type: 'LOCK' }
    | { type: 'SYNC' }
    | { type: 'LIST_ITEMS' }
    | { type: 'CREATE_ITEM'; payload: IItemPayload }
    | { type: 'UPDATE_ITEM'; id: string; payload: IItemPayload }
    | { type: 'DELETE_ITEM'; id: string }
    | { type: 'GET_CREDENTIALS_FOR_URL'; url: string }

export type ExtensionResponse<T = unknown> =
    | { ok: true; data: T }
    | { ok: false; error: string }

export interface IStatusData {
    unlocked: boolean
    email: string | null
    itemCount: number
    pendingCount: number
}

export interface IUnlockStartData {
    authSalt: string
    encSalt: string
    kdfParams: string
}

export interface IDecryptedItem {
    id: string
    version: number
    syncState: string
    payload: IItemPayload
}

export interface ICredentialCandidate {
    id: string
    title: string
    username: string
    password: string
}

export const send = <T = unknown>(msg: ExtensionMessage): Promise<ExtensionResponse<T>> =>
    chrome.runtime.sendMessage(msg)