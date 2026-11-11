import type { AxiosError, AxiosInstance } from "axios"
import axios from "axios"
import type { ApiError } from "./types"
import { isCapacitor } from "@/platform/env"


const chromeRuntime = (globalThis as any).chrome?.runtime


const isExtensionContext =
    typeof chromeRuntime !== 'undefined' &&
    typeof chromeRuntime.id === 'string'

const BASE_URL = isExtensionContext
    ? 'http://localhost:8080'
    : isCapacitor()
        ? (import.meta.env.VITE_API_URL || 'http://10.0.2.2:8080')
        : (import.meta.env.VITE_API_URL || '/api')

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

export function humanizeApiError(err: unknown): string {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return 'No internet connection'
    }

    const axiosErr = err as AxiosError<ApiError>

    // Server structured error
    if (axiosErr.response?.data?.message) {
        return axiosErr.response.data.message
    }
    if (axiosErr.response?.data?.error) {
        switch (axiosErr.response.data.error) {
            case 'invalid_credentials': return 'Invalid email or password'
            case 'email_exists': return 'This email is already registered'
            case 'validation_failed': return 'Please check the form and try again'
            case 'rate_limited': return 'Too many attempts. Try again in a minute.'
            case 'unauthorized': return 'Session expired. Please sign in again.'
            case 'invalid_refresh_token': return 'Session expired. Please sign in again.'
            case 'device_not_found': return 'Device not found'
            case 'internal_error': return 'Server error. Please try again later.'
            default: return axiosErr.response.data.error
        }
    }

    // Plain Error with a message (crypto, validation, etc.)
    // Skip axios's generic messages — they're not useful for users
    if (err instanceof Error && err.message) {
        if (!/^Request failed/.test(err.message) && !/^Network Error/.test(err.message)) {
            return err.message
        }
    }

    // No response — network/CORS/timeout
    if (!axiosErr.response) {
        return 'Cannot reach server. Check your connection.'
    }

    // HTTP status fallback
    switch (axiosErr.response.status) {
        case 400: return 'Invalid request'
        case 401: return 'Invalid email or password'
        case 403: return 'Access denied'
        case 404: return 'Not found'
        case 409: return 'Conflict — please refresh the page'
        case 429: return 'Too many requests. Try again in a minute.'
        case 500: case 502: case 503: return 'Server error. Please try again later.'
        default: return `Request failed (${axiosErr.response.status})`
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