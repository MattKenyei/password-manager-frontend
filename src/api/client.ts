import type { AxiosError, AxiosInstance } from "axios"
import axios from "axios"
import type { ApiError } from "./types"
const BASE_URL = import.meta.env.VITE_API_URL || '/api'

export const api: AxiosInstance = axios.create({
    baseURL: BASE_URL,
    timeout: 30_000,
    headers: {
        'Content-Type': 'application/json'
    }
})

let accessToken: string | null = localStorage.getItem('pm.access_token')
let onUnauthorized: (() => void) | null = null

export function setAccessToken(token: string | null): void {
    accessToken = token
    if (token) {
        localStorage.setItem('pm.access_token', token)
    } else {
        localStorage.removeItem('pm.access_token')
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