import * as authApi from '@/api/auth'
import * as syncApi from '@/api/sync'
import { setAccessToken } from '@/api/client'
import { bytesToBase64, base64ToBytes } from '@/crypto/base64'
import { decrypt, encrypt } from '@/crypto/cipher'
import { deriveItemKey } from '@/crypto/kdf'
import { getAllItems, getItem, putItem, markDeleted } from '@/db/items-repo'
import { enqueue, getAllPending, removePending } from '@/db/pending-repo'
import { getMeta, setMeta, LAST_SERVER_REVISION_KEY } from '@/db/meta-repo'
import type { DbItem, IItemPayload } from '@/db/types'
import * as session from './session'

const REFRESH_KEY = 'pm.ext.refresh_token'
const DEVICE_KEY = 'pm.ext.device_id'
const EMAIL_KEY = 'pm.ext.email'

const getOrCreateDeviceId = async (): Promise<string> => {
    const raw = await chrome.storage.local.get(DEVICE_KEY)
    let id = raw[DEVICE_KEY] as string | undefined
    if (!id) {
        id = crypto.randomUUID()
        await chrome.storage.local.set({ [DEVICE_KEY]: id })
    }
    return id
}

const getStoredRefresh = async (): Promise<string | null> => {
    const raw = await chrome.storage.local.get(REFRESH_KEY)
    return (raw[REFRESH_KEY] as string | undefined) ?? null
}

const persistRefresh = async (token: string | null) => {
    if (token) await chrome.storage.local.set({ [REFRESH_KEY]: token })
    else await chrome.storage.local.remove(REFRESH_KEY)
}

const persistEmail = async (email: string | null) => {
    if (email) await chrome.storage.local.set({ [EMAIL_KEY]: email })
    else await chrome.storage.local.remove(EMAIL_KEY)
}

const encryptPayload = async (id: string, payload: IItemPayload): Promise<string> => {
    const itemKey = await deriveItemKey(session.getAccountKey(), id)
    try {
        const plain = new TextEncoder().encode(JSON.stringify(payload))
        return bytesToBase64(await encrypt(itemKey, plain))
    } finally {
        itemKey.fill(0)
    }
}

const decryptPayload = async (id: string, blob: string): Promise<IItemPayload> => {
    const itemKey = await deriveItemKey(session.getAccountKey(), id)
    try {
        const plain = await decrypt(itemKey, base64ToBytes(blob))
        return JSON.parse(new TextDecoder().decode(plain)) as IItemPayload
    } finally {
        itemKey.fill(0)
    }
}

export const unlockStart = async (email: string) => {
    const resp = await authApi.loginStart({ email })
    return {
        authSalt: resp.auth_salt,
        encSalt: resp.enc_salt,
        kdfParams: resp.kdf_params,
    }
}

export const unlockFinish = async (params: {
    email: string
    authKeyB64: string
    accountKeyB64: string
    accessToken: string
    refreshToken: string
}): Promise<void> => {
    const deviceId = await getOrCreateDeviceId()

    setAccessToken(params.accessToken)
    await session.unlockSession(
        base64ToBytes(params.accountKeyB64),
        params.email,
        deviceId,
    )
    await persistRefresh(params.refreshToken)
    await persistEmail(params.email)
}

export const lock = async () => {
    setAccessToken(null)
    await session.lockSession()
    await persistRefresh(null)
    await persistEmail(null)
}


const pushPending = async () => {
    const pending = await getAllPending()
    if (pending.length === 0) return

    const changes = pending.map((p) => ({
        id: p.id,
        encrypted_blob: p.encrypted_blob,
        base_version: p.base_version,
        deleted: p.deleted === 1,
    }))

    const result = await syncApi.push({ changes })

    for (const id of result.applied) {
        await removePending(id)
        const local = await getItem(id)
        if (local) {
            await putItem({ ...local, sync_state: 'synced' })
        }
    }

    for (const c of result.conflicts) {
        const local = await getItem(c.id)
        if (local) {
            await putItem({ ...local, sync_state: 'conflict', version: c.server_version })
        }
        await removePending(c.id)
    }
}

const pullChanges = async (): Promise<number> => {
    const since = (await getMeta<number>(LAST_SERVER_REVISION_KEY)) ?? 0
    const result = await syncApi.pull(since)

    for (const remote of result.items) {
        const local = await getItem(remote.id)
        const pendingList = await getAllPending()
        if (pendingList.some((p) => p.id === remote.id)) continue

        await putItem({
            id: remote.id,
            encrypted_blob: remote.encrypted_blob,
            version: remote.version,
            deleted: remote.deleted ? 1 : 0,
            sync_state: remote.deleted ? 'deleted' : 'synced',
            updated_at: local?.updated_at ?? Date.now(),
        })
    }

    await setMeta(LAST_SERVER_REVISION_KEY, result.new_revision)
    return result.items.length
}

export const sync = async () => {
    if (!session.isUnlocked()) throw new Error('vault is locked')
    await pushPending()
    await pullChanges()
}


export const listItems = async () => {
    if (!session.isUnlocked()) throw new Error('vault is locked')
    const all = await getAllItems()
    const decrypted = []
    for (const item of all) {
        try {
            const payload = await decryptPayload(item.id, item.encrypted_blob)
            decrypted.push({
                id: item.id,
                version: item.version,
                syncState: item.sync_state,
                payload,
            })
        } catch (err) {
            console.error('failed to decrypt', item.id, err)
        }
    }
    return decrypted.sort((a, b) => a.payload.title.localeCompare(b.payload.title))
}

export const createItem = async (payload: IItemPayload): Promise<string> => {
    if (!session.isUnlocked()) throw new Error('vault is locked')
    const id = crypto.randomUUID()
    const blob = await encryptPayload(id, payload)

    const item: DbItem = {
        id,
        encrypted_blob: blob,
        version: 0,
        deleted: 0,
        sync_state: 'pending',
        updated_at: Date.now(),
    }
    await putItem(item)
    await enqueue({ id, base_version: 0, encrypted_blob: blob, deleted: 0 })

    void sync().catch(console.error)
    return id
}

export const updateItem = async (id: string, payload: IItemPayload) => {
    if (!session.isUnlocked()) throw new Error('vault is locked')
    const existing = await getItem(id)
    if (!existing) throw new Error('item not found')

    const blob = await encryptPayload(id, payload)
    await putItem({
        ...existing,
        encrypted_blob: blob,
        sync_state: 'pending',
        updated_at: Date.now(),
    })
    await enqueue({
        id,
        base_version: existing.version,
        encrypted_blob: blob,
        deleted: 0,
    })

    void sync().catch(console.error)
}

export const deleteItem = async (id: string) => {
    if (!session.isUnlocked()) throw new Error('vault is locked')
    const existing = await getItem(id)
    if (!existing) return

    await markDeleted(id)
    await enqueue({
        id,
        base_version: existing.version,
        encrypted_blob: existing.encrypted_blob,
        deleted: 1,
    })

    void sync().catch(console.error)
}


const matchesHostname = (url: string, hostname: string): boolean => {
    try {
        const parsed = new URL(url)
        const h = parsed.hostname.replace(/^www\./, '')
        const target = hostname.replace(/^www\./, '')
        return target === h || target.endsWith('.' + h)
    } catch {
        return false
    }
}

export const getCredentialsForUrl = async (url: string) => {
    if (!session.isUnlocked()) throw new Error('vault is locked')
    const hostname = new URL(url).hostname
    const all = await getAllItems()
    const candidates = []

    for (const item of all) {
        if (item.deleted) continue
        try {
            const payload = await decryptPayload(item.id, item.encrypted_blob)
            if (payload.password && payload.url && matchesHostname(url, hostname)) {
                candidates.push({
                    id: item.id,
                    title: payload.title,
                    username: payload.username,
                    password: payload.password,
                })
            }
        } catch {
        }
    }
    return candidates
}


export const getStatus = async () => {
    if (!session.isUnlocked()) {
        const raw = await chrome.storage.local.get(EMAIL_KEY)
        return {
            unlocked: false,
            email: (raw[EMAIL_KEY] as string | undefined) ?? null,
            itemCount: 0,
            pendingCount: 0,
        }
    }

    const items = await getAllItems()
    const pending = await getAllPending()
    return {
        unlocked: true,
        email: session.getEmail(),
        itemCount: items.length,
        pendingCount: pending.length,
    }
}


export const bootstrap = async () => {
    await session.initSession()

    const refresh = await getStoredRefresh()
    if (!refresh) return

    try {
        const resp = await authApi.refresh({ refresh_token: refresh })
        setAccessToken(resp.access_token)
        await persistRefresh(resp.refresh_token)
    } catch {
        await persistRefresh(null)
    }
}