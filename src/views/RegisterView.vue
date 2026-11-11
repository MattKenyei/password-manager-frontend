<template>
    <div class="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div class="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
            <h1 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">
                Create account
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
                    <div class="flex items-center justify-between mb-1">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Master password
                        </label>
                        <button type="button" class="text-xs px-2 py-0.5 rounded-md font-medium
                     bg-indigo-50 text-indigo-700 hover:bg-indigo-100
                     dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900
                     transition-colors" @click="generateMasterPassword">
                            Generate
                        </button>
                    </div>

                    <div class="relative">
                        <input v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="new-password"
                            required
                            class="w-full px-3 py-2 pr-16 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        <button type="button" class="absolute right-2 top-1.5 px-2 py-1 rounded-md text-xs font-medium
                     bg-gray-200 text-gray-700 hover:bg-gray-300 hover:text-indigo-600
                     dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 dark:hover:text-white
                     transition-colors" @click="showPassword = !showPassword">
                            {{ showPassword ? 'Hide' : 'Show' }}
                        </button>
                    </div>

                    <PasswordStrengthBar :password="password" class="mt-2" />

                    <p v-if="passwordError" class="text-sm text-red-600 dark:text-red-400 mt-1">
                        {{ passwordError }}
                    </p>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Confirm password
                    </label>
                    <input v-model="passwordConfirm" :type="showPassword ? 'text' : 'password'"
                        autocomplete="new-password" required
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    <p v-if="passwordConfirm.length > 0 && !passwordsMatch"
                        class="text-sm text-red-600 dark:text-red-400 mt-1">
                        Passwords do not match
                    </p>
                </div>

                <div
                    class="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-md p-3">
                    <strong>Important:</strong> write down your master password or save it
                    somewhere safe. It never leaves your device, and if you lose it — your
                    vault cannot be recovered.
                </div>

                <button type="submit" :disabled="!canSubmit"
                    class="w-full py-2 bg-indigo-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700">
                    {{ auth.busy ? 'Creating...' : 'Create account' }}
                </button>

                <p class="text-sm text-center text-gray-600 dark:text-gray-400">
                    Already have an account?
                    <RouterLink to="/unlock" class="text-indigo-600 dark:text-indigo-400 hover:underline">
                        Unlock
                    </RouterLink>
                </p>
            </form>
        </div>
    </div>
    <RecoveryCodeModal v-if="recoveryCode" :code="recoveryCode" @confirmed="onRecoveryConfirmed" />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import PasswordStrengthBar from '@/components/PasswordStrengthBar.vue'
import { generatePassword, DEFAULT_GENERATOR_OPTIONS } from '@/utils/password-generator'
import { useToastStore } from '@/stores/toast'
import { humanizeApiError } from '@/api/client'
import RecoveryCodeModal from '@/components/RecoveryCodeModal.vue'

const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()

const email = ref('')
const password = ref('')
const passwordConfirm = ref('')
const showPassword = ref(false)

const recoveryCode = ref<string | null>(null)


const passwordError = computed(() => {
    if (password.value.length === 0) return null
    if (password.value.length < 12) return 'At least 12 characters'
    return null
})

const passwordsMatch = computed(
    () => password.value.length > 0 && password.value === passwordConfirm.value,
)

const canSubmit = computed(
    () =>
        email.value.length > 0 &&
        password.value.length >= 12 &&
        passwordsMatch.value &&
        !auth.busy,
)

const generateMasterPassword = () => {
    const pwd = generatePassword({
        ...DEFAULT_GENERATOR_OPTIONS,
        length: 32,
        avoidAmbiguous: true,
    })
    password.value = pwd
    passwordConfirm.value = pwd
    showPassword.value = true
}

const submit = async () => {
    if (!canSubmit.value) return
    try {
        const code = await auth.register(email.value, password.value)
        recoveryCode.value = code
    } catch (err) {
        toast.error('Registration failed', humanizeApiError(err))
    }
}

const onRecoveryConfirmed = () => {
    recoveryCode.value = null
    toast.success('Account created', 'Welcome to your vault')
    router.push({ name: 'vault' })
}
</script>