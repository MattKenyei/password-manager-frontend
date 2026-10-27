import { db } from ".";
import type { DbPendingChange } from "./types";

export const enqueue = async (change: {
    id: string
    base_version: number
    encrypted_blob: string
    deleted: 0 | 1
}): Promise<void> => {
    await db.pending_changes.put({ ...change, queued_at: Date.now() })
}

export const getAllPending = async (): Promise<DbPendingChange[]> => db.pending_changes.orderBy('queued_at').toArray()

export const removePending = async (id: string) => await db.pending_changes.delete(id)

export const clearPending = async () => await db.pending_changes.clear()