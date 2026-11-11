<template>
    <div data-testid="recovery-code-modal" class="fixed inset-0 z-200 flex items-center justify-center bg-black/80 p-4">
        <div
            class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-auto">
            <h2 class="text-xl font-bold text-red-600 dark:text-red-400">
                ⚠ Save your recovery code
            </h2>
            <p class="text-sm text-gray-700 dark:text-gray-300">
                This is the <strong>only</strong> way to recover your vault if you forget your
                master password. We cannot recover it for you.
            </p>
            <pre data-testid="recovery-code-value"
                class="bg-gray-100 dark:bg-gray-900 p-4 rounded font-mono text-center text-base tracking-wider break-all whitespace-pre-wrap">{{ code }}</pre>
            <div class="flex gap-2">
                <button type="button" class="flex-1 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    @click="copy">
                    {{ copied ? '✓ Copied' : 'Copy' }}
                </button>
                <button type="button"
                    class="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    @click="download">
                    Download .txt
                </button>
            </div>
            <label class="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input v-model="confirmed" data-testid="recovery-confirm-checkbox" type="checkbox" class="mt-1" />
                <span>I have saved my recovery code somewhere safe. I understand that losing it means permanently losing
                    access to my vault.</span>
            </label>
            <button type="button" data-testid="recovery-continue" :disabled="!confirmed"
                class="w-full py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                @click="emit('confirmed')">
                Continue to vault
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{ code: string }>()
const emit = defineEmits<{ confirmed: [] }>()

const confirmed = ref(false)
const copied = ref(false)

const copy = async () => {
    await navigator.clipboard.writeText(props.code)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
}

const download = () => {
    const text = `Password Manager — Recovery Code\n\n${props.code}\n\nKeep this safe. If you forget your master password,\nthis is the ONLY way to recover your vault.\nWe cannot recover it for you.\n`
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'password-manager-recovery-code.txt'
    a.click()
    URL.revokeObjectURL(url)
}
</script>
