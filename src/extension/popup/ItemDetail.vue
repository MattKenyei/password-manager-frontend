<template>
    <div class="p-3 space-y-3">
        <div class="flex items-center justify-between">
            <button class="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1" @click="emit('back')">
                ← Back
            </button>
            <button
                class="text-xs px-2 py-0.5 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                @click="emit('edit')">
                Edit
            </button>
        </div>

        <div>
            <h2 class="text-sm font-bold truncate">{{ item.payload.title }}</h2>
            <a v-if="item.payload.url" :href="item.payload.url" target="_blank" rel="noopener noreferrer"
                class="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline truncate block">
                {{ item.payload.url }}
            </a>
        </div>

        <button v-if="matchesCurrentUrl"
            class="w-full py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700" @click="fillOnPage">
            Fill on this page
        </button>

        <div v-if="item.payload.totp" class="space-y-1">
            <label class="text-[10px] uppercase text-gray-500 tracking-wider">Two-factor code</label>
            <TotpCode :config="item.payload.totp" />
        </div>

        <div v-if="item.payload.username" class="space-y-1">
            <label class="text-[10px] uppercase text-gray-500 tracking-wider">Username</label>
            <div class="flex gap-1">
                <code class="flex-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-900 rounded truncate">
          {{ item.payload.username }}
        </code>
                <button class="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded"
                    @click="copyText(item.payload.username, 'user')">
                    {{ copyState === 'user' ? '✓' : 'Copy' }}
                </button>
            </div>
        </div>

        <div v-if="item.payload.password" class="space-y-1">
            <label class="text-[10px] uppercase text-gray-500 tracking-wider">Password</label>
            <div class="flex gap-1">
                <code class="flex-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-900 rounded font-mono truncate">
          {{ showPassword ? item.payload.password : '••••••••' }}
        </code>
                <button class="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded"
                    @click="showPassword = !showPassword">
                    {{ showPassword ? 'Hide' : 'Show' }}
                </button>
                <button class="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded"
                    @click="copyText(item.payload.password, 'pass')">
                    {{ copyState === 'pass' ? '✓' : 'Copy' }}
                </button>
            </div>
        </div>

        <div v-if="item.payload.notes" class="space-y-1">
            <label class="text-[10px] uppercase text-gray-500 tracking-wider">Notes</label>
            <p class="text-xs bg-gray-50 dark:bg-gray-900 rounded p-2 whitespace-pre-wrap max-h-30 overflow-y-auto">
                {{ item.payload.notes }}
            </p>
        </div>

        <div v-if="item.payload.tags.length" class="flex flex-wrap gap-1">
            <span v-for="tag in item.payload.tags" :key="tag"
                class="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700">
                {{ tag }}
            </span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { IDecryptedItem } from '../shared/messages'
import TotpCode from './TotpCode.vue'

const props = defineProps<{ item: IDecryptedItem; currentUrl: string }>()
const emit = defineEmits<{ back: []; edit: [] }>()

const showPassword = ref(false)
const copyState = ref<string | null>(null)

const matchesCurrentUrl = computed(() => {
    if (!props.item.payload.url) return false
    try {
        const host = new URL(props.currentUrl).hostname.replace(/^www\./, '')
        const h = new URL(props.item.payload.url).hostname.replace(/^www\./, '')
        return host === h || host.endsWith('.' + h)
    } catch {
        return false
    }
})

const flashCopy = (field: string) => {
    copyState.value = field
    setTimeout(() => {
        if (copyState.value === field) copyState.value = null
    }, 1500)
}

const copyText = async (text: string, field: string) => {
    if (!text) return
    await navigator.clipboard.writeText(text)
    flashCopy(field)
    setTimeout(async () => {
        try {
            const cur = await navigator.clipboard.readText()
            if (cur === text) await navigator.clipboard.writeText('')
        } catch { /* skip */ }
    }, 30_000)
}

const fillOnPage = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab.id) return
    try {
        await chrome.tabs.sendMessage(tab.id, {
            type: 'FILL_CREDENTIALS',
            username: props.item.payload.username,
            password: props.item.payload.password,
        })
        window.close()
    } catch (err) {
        console.error('fill failed', err)
    }
}
</script>
