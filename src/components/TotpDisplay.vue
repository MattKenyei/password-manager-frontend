<template>
    <div class="space-y-2">
        <div class="flex items-center gap-3">
            <button type="button"
                class="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md text-center font-mono text-2xl tracking-widest text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                :title="'Copy TOTP code'" @click="copy">
                {{ formattedCode }}
            </button>
            <div class="text-center w-12">
                <div class="text-2xl font-bold"
                    :class="secondsLeft <= 5 ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'">
                    {{ secondsLeft }}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">sec</div>
            </div>
        </div>

        <div class="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div :class="[progressColor, 'h-full transition-all duration-200']" :style="{ width: progress + '%' }" />
        </div>

        <p v-if="config.issuer || config.account" class="text-xs text-gray-500 dark:text-gray-400">
            <span v-if="config.issuer">{{ config.issuer }}</span>
            <span v-if="config.issuer && config.account"> · </span>
            <span v-if="config.account">{{ config.account }}</span>
        </p>

        <p v-if="error" class="text-xs text-red-600 dark:text-red-400">{{ error }}</p>
    </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { generateTotp, secondsRemaining } from '@/utils/totp'
import { copySensitive } from '@/utils/clipboard'
import { useToastStore } from '@/stores/toast'
import type { ITotpConfig } from '@/db/types'

const props = defineProps<{ config: ITotpConfig }>()

const toast = useToastStore()

const code = ref('------')
const secondsLeft = ref(props.config.period)
const error = ref<string | null>(null)

let tickerId: ReturnType<typeof setInterval> | null = null
let currentCounter = -1

const update = async (): Promise<void> => {
    const now = Date.now()
    const counter = Math.floor(now / 1000 / props.config.period)
    const secs = secondsRemaining(props.config, now)

    if (counter !== currentCounter) {
        currentCounter = counter
        try {
            code.value = await generateTotp(props.config, now)
            error.value = null
        } catch (err) {
            error.value = (err as Error).message
            code.value = '------'
        }
    }
    secondsLeft.value = secs
}

const start = (): void => {
    stop()
    void update()
    tickerId = setInterval(() => void update(), 250)
}

const stop = (): void => {
    if (tickerId !== null) {
        clearInterval(tickerId)
        tickerId = null
    }
}

watch(() => props.config, start, { immediate: true, deep: true })
onBeforeUnmount(stop)

const progress = computed(() => (secondsLeft.value / props.config.period) * 100)

const progressColor = computed(() => {
    if (progress.value > 50) return 'bg-green-500'
    if (progress.value > 20) return 'bg-yellow-500'
    return 'bg-red-500'
})

const formattedCode = computed(() => {
    if (props.config.digits === 6) {
        return `${code.value.slice(0, 3)} ${code.value.slice(3)}`
    }
    if (props.config.digits === 8) {
        return `${code.value.slice(0, 4)} ${code.value.slice(4)}`
    }
    return code.value
})

const copy = async (): Promise<void> => {
    if (code.value.includes('-')) return
    try {
        await copySensitive(code.value)
        toast.success('TOTP copied', 'Valid for a few seconds')
    } catch (err) {
        toast.error('Copy failed', (err as Error).message)
    }
}
</script>
