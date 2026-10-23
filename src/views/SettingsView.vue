<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { ISessionSettings } from '@/platform/session-settings'

const router = useRouter()
const auth = useAuthStore()

const settings = computed(() => auth.settings)
const dirty = ref(false)

const autoLockOptions = [
    { value: 0, label: 'Never (only on tab close)' },
    { value: 1, label: '1 minute' },
    { value: 5, label: '5 minutes' },
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 hour' },
] as const

const update = <K extends keyof ISessionSettings>(key: K, value: ISessionSettings[K]): void => {
    auth.updateSettings({ [key]: value } as Partial<ISessionSettings>)
    dirty.value = true
}

const reset = (): void => {
    auth.resetSettings()
    dirty.value = false
}

const logout = async (): Promise<void> => {
    await auth.logout()
    router.push({ name: 'unlock' })
}
</script>

<template>
    <div class="min-h-screen bg-gray-100">
        <header class="bg-white shadow">
            <div class="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
                <h1 class="text-xl font-bold text-gray-800">Settings</h1>
                <RouterLink to="/vault" class="text-sm text-indigo-600 hover:underline">
                    ← Back to vault
                </RouterLink>
            </div>
        </header>

        <main class="max-w-3xl mx-auto px-4 py-8 space-y-6">
            <section class="bg-white rounded-lg shadow p-6">
                <h2 class="text-lg font-semibold text-gray-800 mb-4">Session</h2>

                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">
                            Auto-lock after inactivity
                        </label>
                        <select :value="settings.autoLockMinutes"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md"
                            @change="update('autoLockMinutes', Number(($event.target as HTMLSelectElement).value))">
                            <option v-for="opt in autoLockOptions" :key="opt.value" :value="opt.value">
                                {{ opt.label }}
                            </option>
                        </select>
                        <p class="text-xs text-gray-500 mt-1">
                            The vault locks automatically after this period of inactivity.
                        </p>
                    </div>

                    <label class="flex items-center gap-2">
                        <input type="checkbox" :checked="settings.lockOnTabHide"
                            @change="update('lockOnTabHide', ($event.target as HTMLInputElement).checked)" />
                        <span class="text-sm text-gray-700">Lock when tab is hidden</span>
                    </label>

                    <label class="flex items-center gap-2">
                        <input type="checkbox" :checked="settings.rememberDevice"
                            @change="update('rememberDevice', ($event.target as HTMLInputElement).checked)" />
                        <span class="text-sm text-gray-700">
                            Remember this device (store refresh token locally)
                        </span>
                    </label>

                    <p class="text-xs text-gray-500">
                        Even with "remember device", you will still need to enter your master
                        password after closing the browser — the vault key is never stored on disk.
                    </p>
                </div>
            </section>

            <section class="bg-white rounded-lg shadow p-6">
                <h2 class="text-lg font-semibold text-gray-800 mb-4">Account</h2>
                <dl class="space-y-2 text-sm">
                    <div class="flex justify-between">
                        <dt class="text-gray-600">Email</dt>
                        <dd class="text-gray-800 font-medium">{{ auth.email }}</dd>
                    </div>
                </dl>
            </section>

            <section class="bg-white rounded-lg shadow p-6">
                <button class="w-full py-2 bg-red-600 text-white rounded-md hover:bg-red-700" @click="logout">
                    Log out
                </button>
            </section>
        </main>
    </div>
</template>