<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const passwordConfirm = ref('')
const showPassword = ref(false)

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

const submit = async (): Promise<void> => {
    if (!canSubmit.value) return
    try {
        await auth.register(email.value, password.value)
        router.push({ name: 'vault' })
    } catch {
    }
}
</script>

<template>
    <div class="flex items-center justify-center min-h-screen bg-gray-100">
        <div class="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
            <h1 class="text-2xl font-bold text-gray-800 mb-6">Create account</h1>

            <form class="space-y-4" @submit.prevent="submit">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input v-model="email" type="email" autocomplete="username" required
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                        Master password
                    </label>
                    <div class="relative">
                        <input v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="new-password"
                            required
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        <button type="button" class="absolute right-2 top-2 text-xs text-gray-500"
                            @click="showPassword = !showPassword">
                            {{ showPassword ? 'Hide' : 'Show' }}
                        </button>
                    </div>
                    <p v-if="passwordError" class="text-sm text-red-600 mt-1">
                        {{ passwordError }}
                    </p>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                        Confirm password
                    </label>
                    <input v-model="passwordConfirm" :type="showPassword ? 'text' : 'password'"
                        autocomplete="new-password" required
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    <p v-if="passwordConfirm.length > 0 && !passwordsMatch" class="text-sm text-red-600 mt-1">
                        Passwords do not match
                    </p>
                </div>

                <p class="text-xs text-gray-500">
                    Your master password never leaves this device. If you lose it — your
                    vault cannot be recovered.
                </p>

                <p v-if="auth.lastError" class="text-sm text-red-600">{{ auth.lastError }}</p>

                <button type="submit" :disabled="!canSubmit"
                    class="w-full py-2 bg-indigo-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700">
                    {{ auth.busy ? 'Creating...' : 'Create account' }}
                </button>

                <p class="text-sm text-center text-gray-600">
                    Already have an account?
                    <RouterLink to="/unlock" class="text-indigo-600 hover:underline">
                        Unlock
                    </RouterLink>
                </p>
            </form>
        </div>
    </div>
</template>