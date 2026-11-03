<template>
    <div class="p-3 space-y-3">
        <div class="flex gap-2">
            <input v-model="search" type="search" placeholder="Search…"
                class="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700" />
            <button :disabled="busy" class="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded"
                title="Sync" @click="doSync">
                {{ busy ? '…' : '↻' }}
            </button>
            <button class="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700" title="New item"
                @click="emit('create')">
                +
            </button>
        </div>

        <div v-if="filtered.length === 0" class="text-center text-xs text-gray-500 py-6">
            {{ search ? 'No matches' : 'No items' }}
        </div>

        <ul class="space-y-1 max-h-80 overflow-y-auto">
            <li v-for="item in filtered" :key="item.id"
                class="p-2 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                @click="emit('open', item)">
                <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0 flex-1">
                        <div class="text-xs font-medium truncate flex items-center gap-1">
                            {{ item.payload.title }}
                            <span v-if="domainMatches.has(item.id)"
                                class="text-[10px] px-1 rounded bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                                match
                            </span>
                        </div>
                        <div class="text-[11px] text-gray-500 truncate">{{ item.payload.username }}</div>
                    </div>
                    <div class="text-gray-400 text-xs">›</div>
                </div>
            </li>
        </ul>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { send, type IDecryptedItem } from '../shared/messages'

const props = defineProps<{ items: IDecryptedItem[]; currentUrl: string }>()
const emit = defineEmits<{
    open: [item: IDecryptedItem]
    create: []
    changed: []
}>()

const search = ref('')
const busy = ref(false)

const filtered = computed(() => {
    const q = search.value.toLowerCase()
    if (!q) return props.items
    return props.items.filter(
        (it) =>
            it.payload.title.toLowerCase().includes(q) ||
            it.payload.username.toLowerCase().includes(q),
    )
})

const domainMatches = computed(() => {
    const visible = new Set<string>()
    try {
        const host = new URL(props.currentUrl).hostname.replace(/^www\./, '')
        for (const it of props.items) {
            if (!it.payload.url) continue
            try {
                const h = new URL(it.payload.url).hostname.replace(/^www\./, '')
                if (host === h || host.endsWith('.' + h)) visible.add(it.id)
            } catch { }
        }
    } catch { }
    return visible
})

const doSync = async () => {
    busy.value = true
    try {
        await send({ type: 'SYNC' })
        emit('changed')
    } finally {
        busy.value = false
    }
}
</script>
