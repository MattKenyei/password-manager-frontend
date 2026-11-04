<template>
    <div class="min-h-screen bg-gray-100 dark:bg-gray-900">
        <header class="bg-white dark:bg-gray-800 shadow">
            <div class="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
                <h1 class="text-xl font-bold text-gray-800 dark:text-gray-100">Vault</h1>

                <div class="flex items-center gap-3">
                    <span class="text-xs px-2 py-1 rounded" :class="{
                        'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300':
                            vault.syncStatus === 'idle' && isOnline && vault.pendingCount === 0,
                        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300':
                            vault.pendingCount > 0 || vault.syncStatus === 'syncing',
                        'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300': !isOnline,
                        'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300':
                            vault.syncStatus === 'error',
                    }">
                        {{ statusLabel() }}
                    </span>

                    <button
                        class="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        :disabled="vault.syncStatus === 'syncing' || !isOnline" @click="onSyncClick">
                        Sync
                    </button>

                    <RouterLink to="/settings" data-testid="nav-settings"
                        class="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                        Settings
                    </RouterLink>
                </div>
            </div>
        </header>

        <main class="max-w-5xl mx-auto px-4 py-6">
            <div class="mb-4 flex items-center gap-2">
                <input v-model="vault.searchQuery" type="search" placeholder="Search by title, username, url, tag…"
                    class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                <button class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700" data-testid="new-item"
                    @click="openCreate">
                    + New
                </button>
            </div>

            <div v-if="vault.loading" class="text-center py-12 text-gray-500 dark:text-gray-400">
                Loading…
            </div>

            <div v-else-if="vault.filtered.length === 0" class="text-center py-12 text-gray-500 dark:text-gray-400">
                {{ vault.searchQuery ? 'No matches' : 'Vault is empty. Create your first item.' }}
            </div>

            <ul v-else class="space-y-2">
                <li v-for="item in vault.filtered" :key="item.id"
                    class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 cursor-pointer hover:bg-gray-500 dark:hover:bg-gray-750 flex items-center justify-between"
                    @click="openEdit(item.id)">
                    <div class="min-w-0 flex-1">
                        <div class="font-medium text-gray-800 dark:text-gray-100 truncate">
                            {{ item.payload.title || 'Untitled' }}
                        </div>
                        <div class="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {{ item.payload.username }}
                            <span v-if="item.payload.url"> · {{ item.payload.url }}</span>
                        </div>
                    </div>
                    <span v-if="item.syncState === 'pending'"
                        class="ml-2 text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                        pending
                    </span>
                    <span v-else-if="item.syncState === 'conflict'"
                        class="ml-2 text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                        conflict
                    </span>
                </li>
            </ul>
        </main>

        <ItemEditor :open="editorOpen" :item-id="editingId" @close="closeEditor" @save="onSave" @delete="onDelete" />
    </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useVaultStore } from '@/stores/vault'
import { useOnline } from '@/composables/useOnline'
import { triggerSync } from '@/services/sync'
import ItemEditor from '@/components/ItemEditor.vue'
import type { IItemPayload } from '@/db/types'
import { useToastStore } from '@/stores/toast'

const vault = useVaultStore()
const { isOnline } = useOnline()
const toast = useToastStore()

const editorOpen = ref(false)
const editingId = ref<string | null>(null)

const openCreate = () => {
    editingId.value = null
    editorOpen.value = true
}

const openEdit = (id: string) => {
    editingId.value = id
    editorOpen.value = true
}

const closeEditor = () => {
    editorOpen.value = false
    editingId.value = null
}

const onSave = async (payload: IItemPayload) => {
    try {
        if (editingId.value) {
            await vault.updateItem(editingId.value, payload)
            toast.success('Item updated')
        } else {
            await vault.createItem(payload)
            toast.success('Item created')
        }
        closeEditor()
    } catch (err) {
        toast.error('Save failed', (err as Error).message)
    }
}

const onDelete = async (id: string) => {
    try {
        await vault.deleteItem(id)
        toast.success('Item deleted')
        closeEditor()
    } catch (err) {
        toast.error('Delete failed', (err as Error).message)
    }
}

const onSyncClick = async () => {
    await vault.sync()
    if (vault.syncStatus === 'error') {
        toast.error('Sync failed', 'Check your connection and try again')
    } else {
        toast.success('Synced')
    }
}
const onFocus = () => {
    if (document.visibilityState === 'visible' && isOnline.value) {
        void triggerSync()
    }
}

const onOnline = () => {
    void triggerSync()
}

let periodicId: number | null = null

onMounted(async () => {
    await vault.loadFromDb()

    document.addEventListener('visibilitychange', onFocus)
    window.addEventListener('online', onOnline)
    periodicId = window.setInterval(() => {
        if (isOnline.value && vault.pendingCount > 0) {
            void triggerSync()
        }
    }, 60_000)

    void triggerSync()
})

onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', onFocus)
    window.removeEventListener('online', onOnline)
    if (periodicId !== null) clearInterval(periodicId)
    vault.unsubscribeSyncStatus()
})

const statusLabel = (): string => {
    if (!isOnline.value) return 'Offline'
    switch (vault.syncStatus) {
        case 'syncing':
            return 'Syncing…'
        case 'error':
            return 'Sync failed'
        default:
            return vault.pendingCount > 0 ? `${vault.pendingCount} pending` : 'Synced'
    }
}
</script>