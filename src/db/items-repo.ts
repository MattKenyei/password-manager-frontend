import { db } from ".";
import type { DbItem, SyncState } from "./types";

export const getItem = async (id: string): Promise<DbItem | undefined> => db.items.get(id)

export const getAllItems = async (): Promise<DbItem[]> => {
    const all = await db.items.where('deleted').equals(0).toArray()
    return all.sort((a, b) => b.updated_at - a.updated_at)
}

export const putItem = async (item: DbItem) => await db.items.put(item)

export const markDeleted = async (id: string): Promise<void> => {
    const existing = await db.items.get(id)
    if (!existing) return
    await db.items.put({
        ...existing,
        deleted: 1,
        sync_state: 'deleted',
        updated_at: Date.now(),
    })
}

export const updateSyncState = async (id: string, state: SyncState, version?: number) => {
    const existing = await db.items.get(id)
    if (!existing) return
    await db.items.put({
        ...existing,
        sync_state: state,
        version: version ?? existing.version
    })
}

export const setServerVesion = async (id: string, version: number) => {
    const existing = await db.items.get(id)
    if (!existing) return
    await db.items.put({ ...existing, version, sync_state: 'synced' })
}

export const clearAllItems = async () => {
    await db.items.clear()
    await db.pending_changes.clear()
    await db.meta.clear()
}