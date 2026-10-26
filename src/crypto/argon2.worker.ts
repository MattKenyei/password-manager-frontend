///<reference lib="webworker"/>
import { argon2id } from "hash-wasm"

export interface Argon2Request {
    id: string
    password: Uint8Array
    salt: Uint8Array
    memoryKiB: number
    iterations: number
    parallelism: number
    hashLength: number
}

export interface Argon2Response {
    id: string
    hash?: Uint8Array
    error?: string
}

self.onmessage = async (event: MessageEvent<Argon2Request>) => {
    const { id, password, salt, memoryKiB, iterations, parallelism, hashLength } = event.data

    try {
        const hash = await argon2id({
            password,
            salt,
            memorySize: memoryKiB,
            iterations,
            parallelism,
            hashLength,
            outputType: 'binary'
        })
        const resp: Argon2Response = { id, hash }
            ; (self as DedicatedWorkerGlobalScope).postMessage(resp, [hash.buffer])
    } catch (err) {
        const resp: Argon2Response = { id, error: err instanceof Error ? err.message : String(err) }
            ; (self as DedicatedWorkerGlobalScope).postMessage(resp)
    }
}