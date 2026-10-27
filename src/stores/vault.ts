import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import * as itemsRepo from '@/db/items-repo'
import * as pendingRepo from '@/db/pending-repo'
import * as metaRepo from '@/db/meta-repo'
import { clearAllItems } from '@/db/items-repo'
import type { DbItem, IItemPayload, SyncState } from '@/db/types'
import { encryptPayload, decryptPayload } from '@/crypto/item'
import { getAccountKey } from '@/crypto/session'
import { triggerSync, onSyncStatus, getSyncStatus, type SyncStatus } from '@/services/sync'

interface DecryptedItem {
    id: string
    version: number
    deleted: number
    syncState: SyncState
    updatedAt: number
    payload: IItemPayload
}

export const useVaultStore = defineStore('vault', () => {
    const items = ref<DecryptedItem[]>([])
    const loading = ref(false)
    const syncStatus = ref<SyncStatus>(getSyncStatus())
    const searchQuery = ref('')

    const unsubscribeSyncStatus = onSyncStatus((s) => {
        syncStatus.value = s
        if (s === 'idle') {
            queueMicrotask(() => void loadFromDb())
        }
    })

    const filtered = computed(() => {
        const q = searchQuery.value.trim().toLowerCase()
        if (!q) return items.value
        return items.value.filter(
            (it) =>
                it.payload.title.toLowerCase().includes(q) ||
                it.payload.username.toLowerCase().includes(q) ||
                it.payload.url.toLowerCase().includes(q) ||
                it.payload.tags.some((t) => t.toLowerCase().includes(q)),
        )
    })

    const pendingCount = ref(0)

    const refreshPendingCount = async (): Promise<void> => {
        const pending = await pendingRepo.getAllPending()
        pendingCount.value = pending.length
    }

    const decryptOne = async (item: DbItem): Promise<DecryptedItem | null> => {
        try {
            const payload = await decryptPayload(getAccountKey(), item.id, item.encrypted_blob)
            return {
                id: item.id,
                version: item.version,
                deleted: item.deleted,
                syncState: item.sync_state,
                updatedAt: item.updated_at,
                payload,
            }
        } catch (err) {
            console.error('[vault] failed to decrypt item', item.id, err)
            return null
        }
    }

    const loadFromDb = async (): Promise<void> => {
        loading.value = true
        try {
            const all = await itemsRepo.getAllItems()
            const decrypted: DecryptedItem[] = []
            for (const item of all) {
                const d = await decryptOne(item)
                if (d) decrypted.push(d)
            }
            items.value = decrypted
            await refreshPendingCount()
        } finally {
            loading.value = false
        }
    }

    const upsertLocal = async (
        id: string,
        payload: IItemPayload,
        baseVersion: number,
    ): Promise<void> => {
        const accountKey = getAccountKey()
        const blob = await encryptPayload(accountKey, id, payload)
        const existing = await itemsRepo.getItem(id)
        const version = existing?.version ?? baseVersion

        const item: DbItem = {
            id,
            encrypted_blob: blob,
            version,
            deleted: 0,
            sync_state: 'pending',
            updated_at: Date.now(),
        }
        await itemsRepo.putItem(item)

        await pendingRepo.enqueue({
            id,
            base_version: version,
            encrypted_blob: blob,
            deleted: 0,
        })

        const idx = items.value.findIndex((it) => it.id === id)
        const decrypted: DecryptedItem = {
            id,
            version,
            deleted: 0,
            syncState: 'pending',
            updatedAt: item.updated_at,
            payload,
        }
        if (idx >= 0) items.value[idx] = decrypted
        else items.value.unshift(decrypted)

        await refreshPendingCount()
        void triggerSync()
    }

    const createItem = async (payload: IItemPayload): Promise<string> => {
        const id = crypto.randomUUID()
        await upsertLocal(id, payload, 0)
        return id
    }

    const updateItem = async (id: string, payload: IItemPayload): Promise<void> => {
        const existing = await itemsRepo.getItem(id)
        if (!existing) throw new Error('item not found')
        await upsertLocal(id, payload, existing.version)
    }

    const deleteItem = async (id: string): Promise<void> => {
        const existing = await itemsRepo.getItem(id)
        if (!existing) return

        await itemsRepo.markDeleted(id)

        await pendingRepo.enqueue({
            id,
            base_version: existing.version,
            encrypted_blob: existing.encrypted_blob,
            deleted: 1,
        })

        items.value = items.value.filter((it) => it.id !== id)
        await refreshPendingCount()
        void triggerSync()
    }

    const sync = async (): Promise<void> => {
        await triggerSync()
        await loadFromDb()
    }

    const reset = async (): Promise<void> => {
        await clearAllItems()
        items.value = []
        pendingCount.value = 0
        await metaRepo.deleteMeta(metaRepo.LAST_SERVER_REVISION_KEY)
    }

    return {
        items,
        filtered,
        loading,
        syncStatus,
        searchQuery,
        pendingCount,
        loadFromDb,
        createItem,
        updateItem,
        deleteItem,
        sync,
        reset,
        unsubscribeSyncStatus,
    }
})