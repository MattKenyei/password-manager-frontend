import * as syncApi from '@/api/sync'
import type { Change as ApiChange, Conflict as ApiConflict } from '@/api/types'
import { getAccountKey } from '@/crypto/session'
import { encryptPayload, decryptPayload } from '@/crypto/item'
import * as itemsRepo from '@/db/items-repo'
import * as pendingRepo from '@/db/pending-repo'
import * as metaRepo from '@/db/meta-repo'
import type { DbItem, IItemPayload } from '@/db/types'
import { db } from '@/db'

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error'

let syncing = false
let syncScheduled = false
const statusListeners = new Set<(s: SyncStatus) => void>()
let currentStatus: SyncStatus = 'idle'

const notifyStatus = (s: SyncStatus): void => {
    if (s === currentStatus) return
    currentStatus = s
    statusListeners.forEach((l) => l(s))
}

export const onSyncStatus = (cb: (s: SyncStatus) => void): (() => void) => {
    statusListeners.add(cb)
    cb(currentStatus)
    return () => statusListeners.delete(cb)
}

export const getSyncStatus = (): SyncStatus => currentStatus

export const triggerSync = async (): Promise<void> => {
    if (syncing) {
        syncScheduled = true
        return
    }
    syncing = true
    notifyStatus('syncing')

    try {
        await pushPending()
        await pullChanges()
        notifyStatus('idle')
    } catch (err) {
        if (!navigator.onLine) {
            notifyStatus('offline')
        } else {
            console.error('[sync] error', err)
            notifyStatus('error')
        }
    } finally {
        syncing = false
        if (syncScheduled) {
            syncScheduled = false
            void triggerSync()
        }
    }
}


const pushPending = async (): Promise<void> => {
    const pending = await pendingRepo.getAllPending()
    if (pending.length === 0) return

    const BATCH = 100
    for (let i = 0; i < pending.length; i += BATCH) {
        const batch = pending.slice(i, i + BATCH)
        const changes: ApiChange[] = batch.map((p) => ({
            id: p.id,
            encrypted_blob: p.encrypted_blob,
            base_version: p.base_version,
            deleted: p.deleted === 1,
        }))

        const result = await syncApi.push({ changes })

        for (const change of batch) {
            if (result.applied.includes(change.id)) {
                await pendingRepo.removePending(change.id)
                const newVersion = change.base_version + 1
                await itemsRepo.setServerVesion(change.id, newVersion)
            }
        }

        for (const conflict of result.conflicts) {
            await resolveConflict(conflict)
            await pendingRepo.removePending(conflict.id)
        }
    }
}

const resolveConflict = async (conflict: ApiConflict): Promise<void> => {
    console.warn('[sync] conflict', conflict.id, 'server_version', conflict.server_version)

    const localItem = await itemsRepo.getItem(conflict.id)
    if (!localItem) return

    const accountKey = getAccountKey()

    let payload: IItemPayload
    try {
        payload = await decryptPayload(accountKey, conflict.id, localItem.encrypted_blob)
    } catch (err) {
        console.error('[sync] failed to decrypt local conflict copy', err)
        return
    }
    payload.title = `${payload.title || 'Untitled'} (conflict)`

    const newId = crypto.randomUUID()
    const newBlob = await encryptPayload(accountKey, newId, payload)

    const newItem: DbItem = {
        id: newId,
        encrypted_blob: newBlob,
        version: 0,
        deleted: 0,
        sync_state: 'pending',
        updated_at: Date.now(),
    }
    await itemsRepo.putItem(newItem)

    await pendingRepo.enqueue({
        id: newId,
        base_version: 0,
        encrypted_blob: newBlob,
        deleted: 0,
    })

    await itemsRepo.updateSyncState(conflict.id, 'conflict')
}

const pullChanges = async (): Promise<void> => {
    const since = (await metaRepo.getMeta<number>(metaRepo.LAST_SERVER_REVISION_KEY)) ?? 0
    const result = await syncApi.pull(since)

    for (const remote of result.items) {
        const local = await itemsRepo.getItem(remote.id)

        const pending = await pendingExists(remote.id)
        if (pending) continue

        const updated: DbItem = {
            id: remote.id,
            encrypted_blob: remote.encrypted_blob,
            version: remote.version,
            deleted: remote.deleted ? 1 : 0,
            sync_state: remote.deleted ? 'deleted' : 'synced',
            updated_at: local?.updated_at ?? Date.now(),
        }
        await itemsRepo.putItem(updated)
    }

    await metaRepo.setMeta(metaRepo.LAST_SERVER_REVISION_KEY, result.new_revision)
}

const pendingExists = async (id: string): Promise<boolean> => {
    return (await db.pending_changes.get(id)) !== undefined
}