import { api } from './client'
import type {
    LoginFinishRequest,
    LoginFinishResponse,
    LoginStartRequest,
    LoginStartResponse,
    RefreshRequest,
    RefreshResponse,
    RegisterRequest,
    RegisterResponse,
} from './types'

export async function register(req: RegisterRequest): Promise<RegisterResponse> {
    const { data } = await api.post<RegisterResponse>('/auth/register', req)
    return data
}

export async function loginStart(req: LoginStartRequest): Promise<LoginStartResponse> {
    const { data } = await api.post<LoginStartResponse>('/auth/login/start', req)
    return data
}

export async function loginFinish(req: LoginFinishRequest): Promise<LoginFinishResponse> {
    const { data } = await api.post<LoginFinishResponse>('/auth/login/finish', req)
    return data
}

export async function refresh(req: RefreshRequest): Promise<RefreshResponse> {
    const { data } = await api.post<RefreshResponse>('/auth/refresh', req)
    return data
}

export async function logout(refreshToken: string) {
    await api.post('/auth/logout', { refresh_token: refreshToken })
}

export async function recoverStart(req: { email: string }): Promise<{ wrapped_recovery_blob: string }> {
    const { data } = await api.post<{ wrapped_recovery_blob: string }>('/auth/recover/start', req)
    return data
}

export async function recoverFinish(req: {
    email: string
    new_auth_key: string
    new_auth_salt: string
    new_enc_salt: string
    new_kdf_params: string
    new_wrapped_keys: Array<{ kind: string; wrapped_blob: string }>
}) {
    await api.post('/auth/recover/finish', req)
}