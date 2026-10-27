import type { SyncMessage } from "@/api/types"

type SyncHandler = () => void

let ws: WebSocket | null = null
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
let reconnectAttempts = 0
let currentToken: string | null = null
let currentHandler: SyncHandler | null = null
let stopped = true

const BASE_WS_URL = (() => {
    const apiUrl = import.meta.env.VITE_API_URL as string | undefined
    if (apiUrl && apiUrl.startsWith('http')) {
        return apiUrl.replace(/^http/, 'ws') + '/ws'
    }
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws'
    return `${proto}//${window.location.host}/ws`
})

const connect = () => {
    if (stopped || !currentToken) return

    const url = `${BASE_WS_URL}?token=${encodeURIComponent(currentToken)}`
    ws = new WebSocket(url)

    ws.onopen = () => {
        console.log('[ws] connected')
        reconnectAttempts = 0
    }

    ws.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data as string) as SyncMessage
            if (msg.type === 'sync' && currentHandler) {
                currentHandler()
            }
        } catch (error) {

        }
    }

    ws.onclose = (event) => {
        ws = null
        if (stopped) return
        if (event.code === 1008) {
            console.warn('[ws] auth failed, not reconnecting')
            return
        }
        scheduleReconnect()
    }

    ws.onerror = () => {

    }
}


const scheduleReconnect = (): void => {
    if (reconnectTimeout || stopped) return
    const delay = Math.min(30_000, 1000 * Math.pow(2, reconnectAttempts))
    reconnectAttempts++
    console.log(`[ws] reconnecting in ${delay}ms (attempt ${reconnectAttempts})`)
    reconnectTimeout = setTimeout(() => {
        reconnectTimeout = null
        connect()
    }, delay)
}

export const startWs = (token: string, onSync: SyncHandler): void => {
    stopped = false
    currentToken = token
    currentHandler = onSync
    connect()
}

export const stopWs = (): void => {
    stopped = true
    currentToken = null
    currentHandler = null
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
        reconnectTimeout = null
    }
    if (ws) {
        ws.close(1000, 'client shutdown')
        ws = null
    }
}

export const updateToken = (token: string): void => {
    currentToken = token
    if (ws && ws.readyState === WebSocket.OPEN) {
        return
    }
}
