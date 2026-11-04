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


                <p v-if="loading" class="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
                <p v-else-if="!form.title && props.itemId && !loading" class="text-sm text-red-600 dark:text-red-400">
                    Failed to load item
                </p>

                <form v-else class="space-y-3" @submit.prevent="submit">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Title
                        </label>
                        <input v-model="form.title" required data-testid="item-title"
                            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Username
                        </label>
                        <div class="relative">
                            <input v-model="form.username" autocomplete="off"
                                class="w-full px-3 py-2 pr-20 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                            <button type="button" class="absolute right-2 top-1.5 px-2 py-1 rounded-md text-xs font-medium
         bg-gray-200 text-gray-700 
         hover:bg-gray-300 hover:text-indigo-600
         dark:bg-gray-600 dark:text-gray-200 
         dark:hover:bg-gray-500 dark:hover:text-white
         transition-colors" @click="copy('username')">
                                {{ copiedField === 'username' ? '✓' : 'Copy' }}
                            </button>
                        </div>
                    </div>

                    <div>
                        <div class="flex items-center justify-between mb-1">
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Password
                            </label>
                            <button type="button" class="text-xs px-2 py-0.5 rounded-md font-medium
         bg-indigo-50 text-indigo-700 hover:bg-indigo-100
         dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900
         transition-colors" @click="showGenerator = !showGenerator">
                                {{ showGenerator ? 'Close generator' : 'Generate' }}
                            </button>
                        </div>

                        <div class="relative">
                            <input v-model="form.password" :type="showPassword ? 'text' : 'password'" autocomplete="off"
                                class="w-full px-3 py-2 pr-28 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono" />
                            <div class="absolute right-2 top-1.5 flex gap-2 text-xs">
                                <button type="button" class="px-2 py-1 rounded-md
           bg-gray-200 text-gray-700 hover:bg-gray-300 hover:text-indigo-600
           dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 dark:hover:text-white
           transition-colors" @click="showPassword = !showPassword">
                                    {{ showPassword ? 'Hide' : 'Show' }}
                                </button>
                                <button type="button" class="px-2 py-1 rounded-md
           bg-gray-200 text-gray-700 hover:bg-gray-300 hover:text-indigo-600
           dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 dark:hover:text-white
           transition-colors" @click="copy('password')">
                                    {{ copiedField === 'password' ? '✓' : 'Copy' }}
                                </button>
                            </div>
                        </div>

                        <PasswordStrengthBar :password="form.password" class="mt-2" />

                        <div v-if="showGenerator"
                            class="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700">
                            <PasswordGenerator @generated="onGenerated" />
                        </div>
                    </div>

                    <div>
                        <div class="flex items-center justify-between mb-1">
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Two-factor code (TOTP)
                            </label>
                            <button v-if="!form.totp" type="button" class="text-xs px-2 py-0.5 rounded-md font-medium
             bg-indigo-50 text-indigo-700 hover:bg-indigo-100
             dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900
             transition-colors" @click="showTotpInput = !showTotpInput">
                                {{ showTotpInput ? 'Cancel' : 'Add' }}
                            </button>
                            <button v-else type="button" class="text-xs text-red-600 dark:text-red-400 hover:underline"
                                @click="clearTotp">
                                Remove
                            </button>
                        </div>

                        <TotpDisplay v-if="form.totp" :config="form.totp" />

                        <div v-else-if="showTotpInput" class="space-y-2">
                            <textarea v-model="totpInput" rows="2"
                                placeholder="otpauth://totp/... или Base32 secret (JBSWY3DPEHPK3PXP)"
                                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-xs font-mono"
                                @input="totpError = null" />
                            <button type="button"
                                class="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
                                @click="parseTotpInput">
                                Save TOTP
                            </button>
                            <p v-if="totpError" class="text-xs text-red-600 dark:text-red-400">{{ totpError }}</p>
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            URL
                        </label>
                        <div class="relative">
                            <input v-model="form.url" type="url"
                                class="w-full px-3 py-2 pr-20 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                            <button type="button" class="absolute right-2 top-1.5 px-1.5 py-0.5 rounded text-xs font-medium
         text-gray-500 dark:text-gray-400
         hover:bg-gray-200 dark:hover:bg-gray-600
         hover:text-indigo-600 dark:hover:text-indigo-400
         transition-colors" @click="copy('url')">
                                {{ copiedField === 'url' ? '✓' : 'Copy' }}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Notes
                        </label>
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
                        <button type="submit" data-testid="item-save"
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
import { copySensitive } from '@/utils/clipboard'
import PasswordGenerator from '@/components/PasswordGenerator.vue'
import type { IItemPayload } from '@/db/types'
import PasswordStrengthBar from './PasswordStrengthBar.vue'
import { useToastStore } from '@/stores/toast.ts'
import { DEFAULT_TOTP, isValidBase32Secret, parseOtpauthUri } from '@/utils/totp.ts'
import TotpDisplay from './TotpDisplay.vue'

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

const toast = useToastStore()
const totpInput = ref('')
const totpError = ref<string | null>(null)
const showTotpInput = ref(false)

const form = ref<IItemPayload>(emptyPayload())
const showPassword = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)
const confirmingDelete = ref(false)
const showGenerator = ref(false)

const copiedField = ref<'username' | 'password' | 'url' | null>(null)
let copiedTimeout: ReturnType<typeof setTimeout> | null = null

const isEditing = computed(() => props.itemId !== null)

const flashCopied = (field: 'username' | 'password' | 'url') => {
    copiedField.value = field
    if (copiedTimeout) clearTimeout(copiedTimeout)
    copiedTimeout = setTimeout(() => {
        copiedField.value = null
    }, 1500)
}

const copy = async (field: 'username' | 'password' | 'url') => {
    const value = form.value[field]
    if (!value) return
    try {
        await copySensitive(value)
        flashCopied(field)
        toast.success('Copied', 'Cleared from clipboard in 30s')
    } catch (error) {
        toast.error('Copy failed', (error as Error).message)
    }
}

watch(
    () => [props.open, props.itemId] as const,
    async ([open, itemId]) => {
        if (!open) return
        error.value = null
        confirmingDelete.value = false
        showPassword.value = false
        showGenerator.value = false
        copiedField.value = null

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

        totpInput.value = ''
        totpError.value = null
        showTotpInput.value = false
    },
    { immediate: true },
)

const submit = () => {
    emit('save', { ...form.value, tags: [...form.value.tags] })
}

const onDelete = () => {
    if (!props.itemId) return
    if (!confirmingDelete.value) {
        confirmingDelete.value = true
        return
    }
    emit('delete', props.itemId)
}

const onGenerated = (password: string) => {
    form.value.password = password
    showGenerator.value = false
    showPassword.value = true
}

const parseTotpInput = () => {
    totpError.value = null
    const raw = totpInput.value.trim()
    if (!raw) {
        form.value.totp = null
        return
    }

    if (raw.startsWith('otpauth://')) {
        const parsed = parseOtpauthUri(raw)
        if (!parsed) {
            totpError.value = 'Invalid otpauth:// URI'
            return
        }
        form.value.totp = parsed
        return
    }

    if (isValidBase32Secret(raw)) {
        form.value.totp = {
            secret: raw.toUpperCase().replace(/\s+/g, ''),
            ...DEFAULT_TOTP,
        }
        return
    }

    totpError.value = 'Paste an otpauth:// URI or a Base32 secret'
}

const clearTotp = () => {
    form.value.totp = null
    totpInput.value = ''
    totpError.value = null
}
</script>
