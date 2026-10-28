import { defineStore } from "pinia"
import { ref } from "vue"

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface IToast {
    id: number
    type: ToastType
    message: string
    description?: string
    duration: number
}

let nextId = 1

export const useToastStore = defineStore('toast', () => {
    const toasts = ref<IToast[]>([])

    const dismiss = (id: number) => {
        toasts.value = toasts.value.filter(t => t.id !== id)
    }

    const show = (type: ToastType, message: string, description?: string, duration = 4000): number => {
        const id = nextId++
        toasts.value.push({ id, type, message, description, duration })
        if (duration > 0)
            setTimeout(() => dismiss(id), duration)

        return id
    }

    const success = (message: string, description?: string): number => show('success', message, description)
    const error = (message: string, description?: string): number => show('error', message, description, 6000)
    const info = (message: string, description?: string): number => show('info', message, description)
    const warning = (message: string, description?: string): number => show('warning', message, description, 5000)

    return {
        toasts,
        show,
        dismiss,
        success,
        error,
        info,
        warning
    }
})