<template>
    <div class="fixed top-4 right-4 z-100 flex flex-col gap-2 pointer-events-none" aria-live="polite"
        aria-atomic="true">
        <TransitionGroup enter-active-class="transition duration-200 ease-out"
            enter-from-class="transform translate-x-full opacity-0" enter-to-class="transform translate-x-0 opacity-100"
            leave-active-class="transition duration-150 ease-in" leave-from-class="transform translate-x-0 opacity-100"
            leave-to-class="transform translate-x-full opacity-0" move-class="transition duration-200">
            <div v-for="toast in toastStore.toasts" :key="toast.id"
                class="pointer-events-auto flex items-start gap-3 w-80 rounded-lg border shadow-lg p-4"
                :class="[COLORS[toast.type].bg, COLORS[toast.type].border]" role="alert">
                <div class="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold"
                    :class="COLORS[toast.type].icon" aria-hidden="true">
                    {{ ICONS[toast.type] }}
                </div>

                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium" :class="COLORS[toast.type].text">
                        {{ toast.message }}
                    </p>
                    <p v-if="toast.description" class="text-xs mt-1 opacity-80" :class="COLORS[toast.type].text">
                        {{ toast.description }}
                    </p>
                </div>

                <button type="button"
                    class="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    aria-label="Close notification" @click="toastStore.dismiss(toast.id)">
                    ✕
                </button>
            </div>
        </TransitionGroup>
    </div>
</template>

<script setup lang="ts">
import { useToastStore, type ToastType } from '@/stores/toast';

const toastStore = useToastStore()

const ICONS: Record<ToastType, string> = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠',
}

const COLORS: Record<ToastType, { bg: string; text: string; border: string; icon: string }> = {
    success: {
        bg: 'bg-green-50 dark:bg-green-950/40',
        text: 'text-green-800 dark:text-green-200',
        border: 'border-green-200 dark:border-green-900/60',
        icon: 'bg-green-500 text-white',
    },
    error: {
        bg: 'bg-red-50 dark:bg-red-950/40',
        text: 'text-red-800 dark:text-red-200',
        border: 'border-red-200 dark:border-red-900/60',
        icon: 'bg-red-500 text-white',
    },
    info: {
        bg: 'bg-blue-50 dark:bg-blue-950/40',
        text: 'text-blue-800 dark:text-blue-200',
        border: 'border-blue-200 dark:border-blue-900/60',
        icon: 'bg-blue-500 text-white',
    },
    warning: {
        bg: 'bg-amber-50 dark:bg-amber-950/40',
        text: 'text-amber-800 dark:text-amber-200',
        border: 'border-amber-200 dark:border-amber-900/60',
        icon: 'bg-amber-500 text-white',
    },
}
</script>