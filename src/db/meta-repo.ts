import { db } from "."

export const getMeta = async <T>(key: string): Promise<T | null> => {
    const row = await db.meta.get(key)
    return row ? (row.value as T) : null
}

export const setMeta = async <T>(key: string, value: T): Promise<void> => {
    await db.meta.put({ key, value })
}

export const deleteMeta = async (key: string): Promise<void> => {
    await db.meta.delete(key)
}

export const LAST_SERVER_REVISION_KEY = 'last_server_revision'