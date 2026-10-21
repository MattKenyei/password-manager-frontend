import { api } from "./client";
import type { LoginFinishRequest, LoginFinishResponse, LoginStartRequest, LoginStartResponse, RefreshRequest, RefreshResponse, RegisterRequest, RegisterResponse } from "./types";

export const register = async (req: RegisterRequest): Promise<RegisterResponse> => {
    const { data } = await api.post<RegisterResponse>('/auth/register', req)
    return data
}

export const loginStart = async (req: LoginStartRequest): Promise<LoginStartResponse> => {
    const { data } = await api.post<LoginStartResponse>('/auth/login/start', req)
    return data
}

export const loginFinish = async (req: LoginFinishRequest): Promise<LoginFinishResponse> => {
    const { data } = await api.post<LoginFinishResponse>('/auth/login/finish', req)
    return data
}

export const refresh = async (req: RefreshRequest): Promise<RefreshResponse> => {
    const { data } = await api.post<RefreshResponse>('/auth/refresh', req)
    return data
}

export const logout = async (refreshToken: string): Promise<void> => {
    await api.post('/auth/logout', { refresh_token: refreshToken })
}