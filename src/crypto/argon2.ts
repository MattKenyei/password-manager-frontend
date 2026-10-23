import type { Argon2Request, Argon2Response } from './argon2.worker'
import Argon2Worker from './argon2.worker?worker'
const WORKER_INIT_TIMEOUT_MS = 60_000

export interface Argon2Params {
    memoryKiB: number
    iterations: number
    parallelism: number
    hashLength: number
}

export const DEFAULT_KDF_PARAMS: Argon2Params = {
    memoryKiB: 64 * 1024,
    iterations: 3,
    parallelism: 1,
    hashLength: 32
}

interface PendingCall {
    resolve: (hash: Uint8Array) => void
    reject: (err: Error) => void
    timer: ReturnType<typeof setTimeout>
}

let worker: Worker | null = null
const pending = new Map<string, PendingCall>()
let nextId = 0

const ensureWorker = (): Worker => {
    if (worker) return worker

    worker = new Argon2Worker()

    worker.onmessage = (event: MessageEvent<Argon2Response>) => {
        const { id, hash, error } = event.data
        const call = pending.get(id)
        if (!call) return

        pending.delete(id)
        clearTimeout(call.timer)

        if (error) {
            call.reject(new Error(error))
        } else if (hash) {
            call.resolve(hash)
        } else call.reject(new Error('empty response from argon2 worker'))
    }

    worker.onerror = (event) => {
        const err = new Error(`argon2 worker error: ${event.message}`)
        for (const call of pending.values()) {
            clearTimeout(call.timer)
            call.reject(err)
        }
        pending.clear()
        worker = null
    }

    return worker
}

export const deriveKey = (password: Uint8Array, salt: Uint8Array, params: Argon2Params = DEFAULT_KDF_PARAMS): Promise<Uint8Array> => {
    const w = ensureWorker()
    const id = String(nextId++)

    return new Promise<Uint8Array>((resolve, reject) => {
        const timer = setTimeout(() => {
            pending.delete(id)
            reject(new Error('argon2 derivation timed out'))
        }, WORKER_INIT_TIMEOUT_MS)
        pending.set(id, { resolve, reject, timer })

        const req: Argon2Request = {
            id, password, salt, memoryKiB: params.memoryKiB, iterations: params.iterations, parallelism: params.parallelism, hashLength: params.hashLength
        }

        w.postMessage(req)
    })
}