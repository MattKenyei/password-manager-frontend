<template>
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="emit('close')">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-auto">
            <div class="p-6">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100">
                        {{ isEditing ? 'Edit item' : 'New item' }}
                    </h2>
                    <button class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        @click="emit('close')">
                        ✕
                    </button>
                </div>

                <p v-if="error" class="text-sm text-red-600 dark:text-red-400 mb-3">{{ error }}</p>
                <p v-if="loading" class="text-sm text-gray-500 dark:text-gray-400">Loading…</p>

                <form v-else class="space-y-3" @submit.prevent="submit">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                        <input v-model="form.title" required
                            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                        <input v-model="form.username" autocomplete="off"
                            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                        <div class="relative">
                            <input v-model="form.password" :type="showPassword ? 'text' : 'password'" autocomplete="off"
                                class="w-full px-3 py-2 pr-16 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono" />
                            <button type="button"
                                class="absolute right-2 top-2 text-xs text-gray-500 dark:text-gray-400"
                                @click="showPassword = !showPassword">
                                {{ showPassword ? 'Hide' : 'Show' }}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL</label>
                        <input v-model="form.url" type="url"
                            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                        <textarea v-model="form.notes" rows="3"
                            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Tags (comma-separated)
                        </label>
                        <input :value="form.tags.join(', ')"
                            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            @input="
                                form.tags = ($event.target as HTMLInputElement).value
                                    .split(',')
                                    .map((t) => t.trim())
                                    .filter(Boolean)
                                " />
                    </div>

                    <div class="flex gap-2 pt-2">
                        <button type="submit"
                            class="flex-1 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                            Save
                        </button>
                        <button v-if="isEditing" type="button" class="px-4 py-2 rounded-md border" :class="confirmingDelete
                                ? 'bg-red-600 text-white border-red-600'
                                : 'border-red-300 text-red-600 dark:border-red-700 dark:text-red-400'
                            " @click="onDelete">
                            {{ confirmingDelete ? 'Confirm delete' : 'Delete' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getAccountKey } from '@/crypto/session'
import { decryptPayload, emptyPayload } from '@/crypto/item'
import { getItem } from '@/db/items-repo'
import type { IItemPayload } from '@/db/types'

interface Props {
    open: boolean
    itemId: string | null
}
const props = defineProps<Props>()

const emit = defineEmits<{
    close: []
    save: [payload: IItemPayload]
    delete: [id: string]
}>()

const form = ref<IItemPayload>(emptyPayload())
const showPassword = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)
const confirmingDelete = ref(false)

const isEditing = computed(() => props.itemId !== null)

watch(
    () => [props.open, props.itemId] as const,
    async ([open, itemId]) => {
        if (!open) return
        error.value = null
        confirmingDelete.value = false
        showPassword.value = false

        if (!itemId) {
            form.value = emptyPayload()
            return
        }

        loading.value = true
        try {
            const row = await getItem(itemId)
            if (!row) {
                error.value = 'Item not found'
                return
            }
            form.value = await decryptPayload(getAccountKey(), itemId, row.encrypted_blob)
        } catch (err) {
            error.value = (err as Error).message
        } finally {
            loading.value = false
        }
    },
    { immediate: true },
)

const submit = (): void => {
    emit('save', { ...form.value, tags: [...form.value.tags] })
}

const onDelete = (): void => {
    if (!props.itemId) return
    if (!confirmingDelete.value) {
        confirmingDelete.value = true
        return
    }
    emit('delete', props.itemId)
}
</script>