export interface WrappedKeyDTO {
    kind: 'master' | 'recovery' | 'passkey'
    wrapped_blob: string
}

export interface RegisterRequest {
    email: string
    auth_key: string
    auth_salt: string
    enc_salt: string
    kdf_params: string
    wrapped_keys: WrappedKeyDTO[]
}


export interface RegisterResponse {
    id: string
    email: string
    created_at: string
}

export interface LoginStartRequest {
    email: string
}

export interface LoginStartResponse {
    auth_salt: string
    enc_salt: string
    kdf_params: string
}

export interface LoginFinishRequest {
    email: string
    auth_key: string
    device_id: string
    device_name: string
    device_platform: string
}

export interface LoginFinishResponse {
    access_token: string
    refresh_token: string
    expires_in: number
    wrapped_keys: WrappedKeyDTO[]
    wrapped_account_key?: string
}

export interface RefreshRequest {
    refresh_token: string
}

export interface RefreshResponse {
    access_token: string
    refresh_token: string
    expires_in: number
}

export interface DeviceResponse {
    id: string
    name: string
    platform: string
    last_seen_at: string
    created_at: string
}

export interface Change {
    id: string
    encrypted_blob: string
    base_version: number
    deleted: boolean
}

export interface PushRequest {
    changes: Change[]
}

export interface Conflict {
    id: string
    server_version: number
}

export interface PushResponse {
    applied: string[]
    conflicts: Conflict[]
    new_revision: number
}

export interface ItemResponse {
    id: string
    encrypted_blob: string
    version: number
    deleted: boolean
}

export interface PullResponse {
    items: ItemResponse[]
    new_revision: number
}

// Единый формат ошибок от бэка
export interface ApiError {
    error: string
    message?: string
    fields?: Record<string, string>
}

// WebSocket-сообщения
export interface SyncMessage {
    type: 'sync'
    revision: number
}