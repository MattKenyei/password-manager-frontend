<template>
    <div class="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div class="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
            <h1 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">
                Unlock vault
            </h1>

            <form class="space-y-4" @submit.prevent="submit">
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email
                    </label>
                    <input v-model="email" type="email" autocomplete="username" required
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Master password
                    </label>
                    <div class="relative">
                        <input v-model="password" :type="showPassword ? 'text' : 'password'"
                            autocomplete="current-password" required autofocus
                            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        <button type="button" class="absolute right-2 top-2 text-xs text-gray-500 dark:text-gray-400"
                            @click="showPassword = !showPassword">
                            {{ showPassword ? 'Hide' : 'Show' }}
                        </button>
                    </div>
                </div>

                <button type="submit" :disabled="!canSubmit"
                    class="w-full py-2 bg-indigo-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700">
                    {{ auth.busy ? 'Unlocking...' : 'Unlock' }}
                </button>

                <!-- Кнопка биометрии — внутри карточки, под формой -->
                <button v-if="auth.biometricAvailable && auth.biometricEnabled" type="button"
                    class="w-full py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center gap-2"
                    @click="tryBiometric">
                    <span>🔒</span> Unlock with fingerprint
                </button>

                <p class="text-sm text-center text-gray-600 dark:text-gray-400">
                    No account?
                    <RouterLink to="/register" class="text-indigo-600 dark:text-indigo-400 hover:underline">
                        Create one
                    </RouterLink>
                </p>
            </form>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const toast = useToastStore()

const email = ref(auth.email ?? '')
const password = ref('')
const showPassword = ref(false)

const canSubmit = computed(
    () => email.value.length > 0 && password.value.length > 0 && !auth.busy,
)


const promptEnableBiometric = async () => {
    if (!auth.biometricAvailable || auth.biometricEnabled) return

    const shouldEnable = window.confirm(
        "Enable fingerprint unlock? You'll still need your master password occasionally.",
    )
    if (!shouldEnable) return

    try {
        await auth.enableBiometricUnlock()
        toast.success('Fingerprint unlock enabled')
    } catch (err) {
        console.warn('[biometric] enable failed:', err)
    }
}

const submit = async () => {
    if (!canSubmit.value) return
    try {
        await auth.login(email.value, password.value)
        toast.success('Vault unlocked')

        await promptEnableBiometric()

        const redirect = (route.query.redirect as string) || '/vault'
        router.push(redirect)
    } catch (err) {
        toast.error('Unlock failed', (err as Error).message || 'Invalid email or password')
    }
}

const tryBiometric = async () => {
    try {
        await auth.unlockWithBiometric()
        toast.success('Unlocked')
        router.push('/vault')
    } catch (err) {
        const message = (err as Error).message
        if (!message.includes('authentication failed')) {
            toast.error('Biometric unlock failed', message)
        }
    }
}

onMounted(async () => {
    await auth.initBiometric()
})

</script>