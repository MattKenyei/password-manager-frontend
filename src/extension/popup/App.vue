<template>
    <div class="min-h-100 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <header
            class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
            <h1 class="text-sm font-bold">Password Manager</h1>
            <button v-if="status?.unlocked" class="text-xs text-red-600 dark:text-red-400" @click="onLocked">
                Lock
            </button>
        </header>

        <div v-if="loading" class="p-6 text-center text-sm text-gray-500">Loading…</div>

        <UnlockForm v-else-if="!status?.unlocked" :default-email="status?.email ?? ''" @unlocked="onUnlocked" />

        <VaultList v-else-if="view === 'list'" :items="items" :current-url="currentTabUrl" @open="openDetail"
            @create="openCreate" @changed="refreshItems" />

        <ItemDetail v-else-if="view === 'detail' && selectedItem" :item="selectedItem" :current-url="currentTabUrl"
            @back="backToList" @edit="openEdit" />

        <ItemEditor v-else-if="view === 'edit' && selectedItem" mode="edit" :item="selectedItem" @saved="onSaved"
            @deleted="onDeleted" @cancel="view = 'detail'" />

        <ItemEditor v-else-if="view === 'create'" mode="create" :item="null" @saved="onSaved" @deleted="onDeleted"
            @cancel="backToList" />
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { send, type IStatusData, type IDecryptedItem } from '../shared/messages'
import UnlockForm from './UnlockForm.vue'
import VaultList from './VaultList.vue'
import ItemDetail from './ItemDetail.vue'
import ItemEditor from './ItemEditor.vue'

type View = 'list' | 'detail' | 'edit' | 'create'

const status = ref<IStatusData | null>(null)
const items = ref<IDecryptedItem[]>([])
const loading = ref(true)
const currentTabUrl = ref<string>('')

const view = ref<View>('list')
const selectedItem = ref<IDecryptedItem | null>(null)

const refreshStatus = async () => {
    const resp = await send<IStatusData>({ type: 'STATUS' })
    if (resp.ok) status.value = resp.data
}

const refreshItems = async () => {
    const resp = await send<IDecryptedItem[]>({ type: 'LIST_ITEMS' })
    if (resp.ok) {
        items.value = resp.data
        if (selectedItem.value) {
            selectedItem.value =
                resp.data.find((i) => i.id === selectedItem.value!.id) ?? null
        }
    }
}

const onUnlocked = async () => {
    await refreshStatus()
    await refreshItems()
    view.value = 'list'
}

const onLocked = async () => {
    await refreshStatus()
    items.value = []
    selectedItem.value = null
    view.value = 'list'
}

const openDetail = (item: IDecryptedItem) => {
    selectedItem.value = item
    view.value = 'detail'
}

const openEdit = () => {
    view.value = 'edit'
}

const openCreate = () => {
    selectedItem.value = null
    view.value = 'create'
}

const backToList = async () => {
    view.value = 'list'
    selectedItem.value = null
    await refreshItems()
}

const onSaved = async () => {
    await refreshItems()
    view.value = 'list'
    selectedItem.value = null
}

const onDeleted = async () => {
    await refreshItems()
    view.value = 'list'
    selectedItem.value = null
}

onMounted(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    currentTabUrl.value = tab?.url ?? ''

    await refreshStatus()
    if (status.value?.unlocked) {
        await refreshItems()
    }
    loading.value = false
})
</script>
