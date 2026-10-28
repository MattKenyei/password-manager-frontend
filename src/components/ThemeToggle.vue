<template>
    <div class="inline-flex rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden">
        <button v-for="opt in options" :key="opt.value" type="button"
            class="px-3 py-1.5 text-sm transition-colors flex items-center gap-1.5" :class="theme.mode === opt.value
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                " :aria-pressed="theme.mode === opt.value" :title="`Switch to ${opt.label.toLowerCase()} theme`"
            @click="theme.setMode(opt.value)">
            <span aria-hidden="true">{{ opt.icon }}</span>
            <span>{{ opt.label }}</span>
        </button>
    </div>
</template>

<script setup lang="ts">
import { useThemeStore } from '@/stores/theme'
import type { ThemeMode } from '@/stores/theme'

const theme = useThemeStore()

const options: { value: ThemeMode; label: string; icon: string }[] = [
    { value: 'light', label: 'Light', icon: '☀' },
    { value: 'dark', label: 'Dark', icon: '☾' },
    { value: 'system', label: 'System', icon: '⚙' },
]
</script>