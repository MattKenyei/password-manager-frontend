import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'pm.theme'

const getSystemDark = (): boolean =>
    window.matchMedia('(prefers-color-scheme: dark)').matches

const isMode = (v: string | null): v is ThemeMode =>
    v === 'light' || v === 'dark' || v === 'system'

const loadMode = (): ThemeMode => {
    const raw = localStorage.getItem(STORAGE_KEY)
    return isMode(raw) ? raw : 'system'
}

const applyTheme = (mode: ThemeMode): void => {
    const isDark = mode === 'dark' || (mode === 'system' && getSystemDark())
    document.documentElement.classList.toggle('dark', isDark)
}

export const useThemeStore = defineStore('theme', () => {
    const mode = ref<ThemeMode>(loadMode())

    const isDark = computed(() => {
        if (mode.value === 'system') return getSystemDark()
        return mode.value === 'dark'
    })

    const setMode = (next: ThemeMode): void => {
        mode.value = next
        localStorage.setItem(STORAGE_KEY, next)
        applyTheme(next)
    }

    const toggle = (): void => {
        setMode(isDark.value ? 'light' : 'dark')
    }

    window
        .matchMedia('(prefers-color-scheme: dark)')
        .addEventListener('change', () => {
            if (mode.value === 'system') applyTheme('system')
        })

    window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY && isMode(e.newValue) && e.newValue !== mode.value) {
            mode.value = e.newValue
            applyTheme(e.newValue)
        }
    })

    return { mode, isDark, setMode, toggle }
})