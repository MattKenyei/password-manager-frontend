<template>
    <div class="p-3 space-y-3">
        <div class="flex items-center justify-between">
            <h2 class="text-sm font-bold">
                {{ isEdit ? 'Edit item' : 'New item' }}
            </h2>
            <button class="text-xs text-gray-600 dark:text-gray-400" @click="emit('cancel')">
                Cancel
            </button>
        </div>

        <p v-if="error" class="text-xs text-red-600 dark:text-red-400">{{ error }}</p>

        <div>
            <label class="block text-[10px] uppercase text-gray-500 tracking-wider mb-0.5">Title</label>
            <input v-model="form.title" required
                class="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700" />
        </div>

        <div>
            <label class="block text-[10px] uppercase text-gray-500 tracking-wider mb-0.5">Username</label>
            <input v-model="form.username" autocomplete="off"
                class="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700" />
        </div>

        <div>
            <label class="block text-[10px] uppercase text-gray-500 tracking-wider mb-0.5">Password</label>
            <div class="relative">
                <input v-model="form.password" :type="showPassword ? 'text' : 'password'" autocomplete="off"
                    class="w-full px-2 py-1 pr-12 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 font-mono" />
                <button type="button"
                    class="absolute right-1 top-1 text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-600"
                    @click="showPassword = !showPassword">
                    {{ showPassword ? 'Hide' : 'Show' }}
                </button>
            </div>
        </div>

        <div>
            <label class="block text-[10px] uppercase text-gray-500 tracking-wider mb-0.5">URL</label>
            <input v-model="form.url" type="url"
                class="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700" />
        </div>

        <div>
            <label class="block text-[10px] uppercase text-gray-500 tracking-wider mb-0.5">Notes</label>
            <textarea v-model="form.notes" rows="2"
                class="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700" />
        </div>

        <div>
            <label class="block text-[10px] uppercase text-gray-500 tracking-wider mb-0.5">Tags</label>
            <input v-model="tagsInput" placeholder="comma, separated"
                class="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700" />
        </div>

        <div>
            <div class="flex items-center justify-between mb-0.5">
                <label class="text-[10px] uppercase text-gray-500 tracking-wider">TOTP</label>
                <button v-if="!form.totp && !showTotpInput" type="button"
                    class="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                    @click="showTotpInput = true">
                    + Add
                </button>
                <button v-if="form.totp" type="button" class="text-[10px] text-red-600 dark:text-red-400"
                    @click="clearTotp">
                    Remove
                </button>
            </div>

            <div v-if="form.totp" class="text-[10px] text-green-600 dark:text-green-400">
                ✓ TOTP configured
            </div>

            <div v-else-if="showTotpInput" class="space-y-1">
                <textarea v-model="totpInput" rows="2" placeholder="otpauth://... or Base32 secret"
                    class="w-full px-2 py-1 text-[10px] border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 font-mono"
                    @input="totpError = null" />
                <div class="flex gap-1">
                    <button type="button" class="px-2 py-0.5 text-[10px] bg-indigo-600 text-white rounded"
                        @click="parseTotp">
                        Save
                    </button>
                    <button type="button"
                        class="px-2 py-0.5 text-[10px] border border-gray-300 dark:border-gray-600 rounded"
                        @click="showTotpInput = false; totpInput = ''; totpError = null">
                        Cancel
                    </button>
                </div>
                <p v-if="totpError" class="text-[10px] text-red-600">{{ totpError }}</p>
            </div>
        </div>

        <div class="flex gap-1 pt-1">
            <button :disabled="busy"
                class="flex-1 py-1.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                @click="save">
                {{ busy ? 'Saving…' : 'Save' }}
            </button>
            <button v-if="isEdit" :disabled="busy" class="px-2 py-1.5 text-xs rounded border" :class="confirmingDelete
                ? 'bg-red-600 text-white border-red-600'
                : 'border-red-300 text-red-600 dark:border-red-700 dark:text-red-400'
                " @click="remove">
                {{ confirmingDelete ? 'Confirm' : 'Delete' }}
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { send, type IDecryptedItem } from '../shared/messages'
import { emptyPayload } from '@/crypto/item'
import { parseOtpauthUri, isValidBase32Secret, DEFAULT_TOTP } from '@/utils/totp'
import type { IItemPayload, ITotpConfig } from '@/db/types'

const props = defineProps<{
    mode: 'create' | 'edit'
    item: IDecryptedItem | null
}>()

const emit = defineEmits<{
    saved: []
    deleted: []
    cancel: []
}>()

const form = ref<IItemPayload>(
    props.item
        ? { ...props.item.payload, tags: [...props.item.payload.tags] }
        : emptyPayload(),
)

const tagsInput = ref(form.value.tags.join(', '))
const busy = ref(false)
const error = ref<string | null>(null)
const showPassword = ref(false)
const confirmingDelete = ref(false)
const showTotpInput = ref(false)
const totpInput = ref('')
const totpError = ref<string | null>(null)

const isEdit = computed(() => props.mode === 'edit')

const parseTotp = () => {
    totpError.value = null
    const raw = totpInput.value.trim()
    if (!raw) {
        form.value.totp = null
        showTotpInput.value = false
        return
    }

    if (raw.startsWith('otpauth://')) {
        const parsed = parseOtpauthUri(raw)
        if (!parsed) {
            totpError.value = 'Invalid otpauth:// URI'
            return
        }
        form.value.totp = parsed
        showTotpInput.value = false
        totpInput.value = ''
        return
    }

    if (isValidBase32Secret(raw)) {
        form.value.totp = {
            secret: raw.toUpperCase().replace(/\s+/g, ''),
            ...DEFAULT_TOTP,
        } as ITotpConfig
        showTotpInput.value = false
        totpInput.value = ''
        return
    }

    totpError.value = 'Paste an otpauth:// URI or a Base32 secret'
}

const clearTotp = () => {
    form.value.totp = null
    showTotpInput.value = false
    totpInput.value = ''
    totpError.value = null
}

const save = async () => {
    if (!form.value.title.trim()) {
        error.value = 'Title is required'
        return
    }
    busy.value = true
    error.value = null
    try {
        form.value.tags = tagsInput.value
            .split(',')
            .map((t: string) => t.trim())
            .filter(Boolean)

        if (isEdit.value && props.item) {
            const resp = await send({
                type: 'UPDATE_ITEM',
                id: props.item.id,
                payload: form.value,
            })
            if (!resp.ok) throw new Error(resp.error)
        } else {
            const resp = await send({
                type: 'CREATE_ITEM',
                payload: form.value,
            })
            if (!resp.ok) throw new Error(resp.error)
        }
        emit('saved')
    } catch (err) {
        error.value = (err as Error).message
    } finally {
        busy.value = false
    }
}

const remove = async () => {
    if (!isEdit.value || !props.item) return
    if (!confirmingDelete.value) {
        confirmingDelete.value = true
        return
    }
    busy.value = true
    try {
        const resp = await send({ type: 'DELETE_ITEM', id: props.item.id })
        if (!resp.ok) throw new Error(resp.error)
        emit('deleted')
    } catch (err) {
        error.value = (err as Error).message
        busy.value = false
    }
}
</script>
