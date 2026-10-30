import { argon2id } from 'hash-wasm'
import { DEFAULT_KDF_PARAMS, type Argon2Params } from './argon2'

export const deriveKeySync = async (
    password: Uint8Array,
    salt: Uint8Array,
    params: Argon2Params = DEFAULT_KDF_PARAMS,
): Promise<Uint8Array> => {
    return argon2id({
        password,
        salt,
        memorySize: params.memoryKiB,
        iterations: params.iterations,
        parallelism: params.parallelism,
        hashLength: params.hashLength,
        outputType: 'binary',
    })
}