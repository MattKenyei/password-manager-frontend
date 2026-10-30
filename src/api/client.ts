import type { AxiosError, AxiosInstance } from "axios"
import axios from "axios"
import type { ApiError } from "./types"


const chromeRuntime = (globalThis as any).chrome?.runtime


const isExtensionContext =
    typeof chromeRuntime !== 'undefined' &&
    typeof chromeRuntime.id === 'string'

const BASE_URL = isExtensionContext
    ? 'http://localhost:8080'
    : import.meta.env.VITE_API_URL || '/api'

console.log('[client] init', {
    BASE_URL,
    isExtensionContext,
    hasChrome: typeof (globalThis as any).chrome !== 'undefined',
    hasRuntime: typeof (globalThis as any).chrome?.runtime !== 'undefined',
})

export const api: AxiosInstance = axios.create({
    baseURL: BASE_URL,
    timeout: 30_000,
    headers: {
        'Content-Type': 'application/json'
    }
})

const hasLocalStorage = typeof localStorage !== 'undefined'


let accessToken: string | null = hasLocalStorage ? localStorage.getItem('pm.access_token') : null

let onUnauthorized: (() => void) | null = null

export function setAccessToken(token: string | null): void {
    accessToken = token
    if (hasLocalStorage) {
        if (token) localStorage.setItem('pm.access_token', token)
        else localStorage.removeItem('pm.access_token')
    }
}

export const onAuthFailure = (handler: () => void): void => {
    onUnauthorized = handler
}

api.interceptors.request.use((config) => {
    if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`
    }
    return config
})

api.interceptors.response.use(
    (r) => r,
    (error: AxiosError<ApiError>) => {
        if (error.response?.status === 401 && onUnauthorized) {
            onUnauthorized()
        }
        return Promise.reject(error)
    }
)

export const extractApiError = (err: unknown): ApiError | null => {
    const axiosErr = err as AxiosError<ApiError>
    return axiosErr.response?.data ?? null
}

export { BASE_URL }