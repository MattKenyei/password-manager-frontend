export interface ITotpConfig {
    secret: string
    algorithm: 'SHA-1' | 'SHA-256' | 'SHA-512'
    digits: number
    period: number
    issuer?: string
    account?: string
}

export interface IItemPayload {
    title: string
    username: string
    password: string
    url: string
    notes: string
    tags: string[]
    totp?: ITotpConfig | null
}

export type SyncState = 'synced' | 'pending' | 'conflict' | 'deleted'

export interface DbItem {
    id: string
    encrypted_blob: string
    version: number
    deleted: 0 | 1
    sync_state: SyncState
    updated_at: number
}

export interface DbPendingChange {
    id: string
    base_version: number
    encrypted_blob: string
    deleted: 0 | 1
    queued_at: number
}

export interface DbMeta {
    key: string
    value: unknown
}