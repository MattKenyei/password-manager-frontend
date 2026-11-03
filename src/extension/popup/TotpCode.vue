<template>
    <div class="space-y-1">
        <div class="flex items-center gap-2">
            <button type="button"
                class="flex-1 px-2 py-1.5 text-sm bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded font-mono tracking-widest text-left hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                :title="'Copy TOTP'" @click="copyCode">
                {{ copied ? '✓ copied' : formatted }}
            </button>
            <div class="text-xs w-8 text-right font-medium"
                :class="secondsLeft <= 5 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'">
                {{ secondsLeft }}s
            </div>
        </div>
        <div class="h-1 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
            <div :class="[progressColor, 'h-full transition-all duration-200']" :style="{ width: progress + '%' }" />
        </div>
        <p v-if="error" class="text-[10px] text-red-600 dark:text-red-400">{{ error }}</p>
    </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { generateTotp, secondsRemaining } from '@/utils/totp'
import type { ITotpConfig } from '@/db/types'

const props = defineProps<{ config: ITotpConfig }>()

const code = ref('------')
const secondsLeft = ref(props.config.period)
const error = ref<string | null>(null)
const copied = ref(false)

let intervalId: number | null = null
let currentCounter = -1

const update = async () => {
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

const start = () => {
    stop()
    void update()
    intervalId = window.setInterval(() => void update(), 250)
}

const stop = () => {
    if (intervalId !== null) {
        clearInterval(intervalId)
        intervalId = null
    }
}

onMounted(start)
onBeforeUnmount(stop)
watch(() => props.config, start, { deep: true })

const progress = computed(() => (secondsLeft.value / props.config.period) * 100)

const progressColor = computed(() => {
    if (progress.value > 50) return 'bg-green-500'
    if (progress.value > 20) return 'bg-yellow-500'
    return 'bg-red-500'
})

const formatted = computed(() => {
    if (props.config.digits === 6) return `${code.value.slice(0, 3)} ${code.value.slice(3)}`
    if (props.config.digits === 8) return `${code.value.slice(0, 4)} ${code.value.slice(4)}`
    return code.value
})

const copyCode = async () => {
    if (code.value.includes('-')) return
    await navigator.clipboard.writeText(code.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
    setTimeout(async () => {
        try {
            const cur = await navigator.clipboard.readText()
            if (cur === code.value) await navigator.clipboard.writeText('')
        } catch { /* skip */ }
    }, 20_000)
}
</script>
