<template>
    <div class="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div class="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
            <h1 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">
                Recover vault
            </h1>

            <form v-if="step === 'email'" class="space-y-4" @submit.prevent="startRecovery">
                <p class="text-sm text-gray-600 dark:text-gray-400">
                    Enter the email associated with your account. Then we'll ask for your recovery code.
                </p>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                    <input v-model="email" type="email" required
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                </div>
                <p v-if="errorMsg" class="text-sm text-red-600 dark:text-red-400">{{ errorMsg }}</p>
                <button type="submit" data-testid="recover-continue" :disabled="busy || !email"
                    class="w-full py-2 bg-indigo-600 text-white rounded-md disabled:opacity-50">
                    {{ busy ? '...' : 'Continue' }}
                </button>
                <p class="text-sm text-center text-gray-600 dark:text-gray-400">
                    <RouterLink to="/unlock" class="text-indigo-600 dark:text-indigo-400 hover:underline">
                        Back to unlock
                    </RouterLink>
                </p>
            </form>

            <form v-else-if="step === 'code'" class="space-y-4" @submit.prevent="finishRecovery">
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Recovery code
                    </label>
                    <textarea v-model="recoveryInput" data-testid="recover-code-input" rows="3" required
                        placeholder="JBSW Y3DP EHPK 3PXP ..."
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono text-sm" />
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        New master password (min 12 chars)
                    </label>
                    <input v-model="newPassword" type="password" data-testid="recover-new-password" required
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Confirm new password
                    </label>
                    <input v-model="newPasswordConfirm" type="password" data-testid="recover-new-password-confirm"
                        required
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                </div>
                <p v-if="errorMsg" class="text-sm text-red-600 dark:text-red-400">{{ errorMsg }}</p>
                <button type="submit" data-testid="recover-submit" :disabled="busy || !passwordsMatch || !recoveryInput"
                    class="w-full py-2 bg-indigo-600 text-white rounded-md disabled:opacity-50">
                    {{ busy ? 'Recovering...' : 'Recover vault' }}
                </button>
            </form>

            <div v-else class="space-y-4">
                <p class="text-sm text-gray-700 dark:text-gray-300">
                    ✅ Vault recovered. A new recovery code has been generated — save it before continuing.
                </p>
            </div>
        </div>

        <RecoveryCodeModal v-if="newRecoveryCode" :code="newRecoveryCode" @confirmed="onNewCodeConfirmed" />
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import * as authApi from '@/api/auth'
import { humanizeApiError } from '@/api/client'
import { base32ToRecoveryCode, deriveRecoveryKey, generateRecoveryCode, recoveryCodeToBase32 } from '@/crypto/recovery'
import { decrypt, encrypt } from '@/crypto/cipher'
import { deriveKey, DEFAULT_KDF_PARAMS } from '@/crypto/argon2'
import { base64ToBytes, bytesToBase64 } from '@/crypto/base64'
import { useToastStore } from '@/stores/toast'
import RecoveryCodeModal from '@/components/RecoveryCodeModal.vue'

const router = useRouter()
const toast = useToastStore()

const email = ref('')
const recoveryInput = ref('')
const newPassword = ref('')
const newPasswordConfirm = ref('')
const step = ref<'email' | 'code' | 'success'>('email')
const wrappedBlob = ref<Uint8Array | null>(null)
const busy = ref(false)
const errorMsg = ref<string | null>(null)
const newRecoveryCode = ref<string | null>(null)

const passwordsMatch = computed(
    () => newPassword.value.length >= 12 && newPassword.value === newPasswordConfirm.value,
)

const startRecovery = async () => {
    errorMsg.value = null
    busy.value = true
    try {
        const resp = await authApi.recoverStart({ email: email.value })
        wrappedBlob.value = base64ToBytes(resp.wrapped_recovery_blob)
        step.value = 'code'
    } catch (err) {
        errorMsg.value = humanizeApiError(err)
    } finally {
        busy.value = false
    }
}

const finishRecovery = async () => {
    errorMsg.value = null
    busy.value = true
    try {
        const code = base32ToRecoveryCode(recoveryInput.value)
        const recoveryKey = await deriveRecoveryKey(code)
        let accountKey: Uint8Array
        try {
            accountKey = await decrypt(recoveryKey, wrappedBlob.value!)
        } catch {
            throw new Error('Invalid recovery code')
        } finally {
            recoveryKey.fill(0)
        }

        const encSalt = crypto.getRandomValues(new Uint8Array(16))
        const authSalt = crypto.getRandomValues(new Uint8Array(16))
        const passwordBytes = new TextEncoder().encode(newPassword.value)

        const masterKey = await deriveKey(passwordBytes, encSalt, DEFAULT_KDF_PARAMS)
        const authKey = await deriveKey(passwordBytes, authSalt, DEFAULT_KDF_PARAMS)

        const wrappedMaster = await encrypt(masterKey, accountKey)
        masterKey.fill(0)

        const newCode = generateRecoveryCode()
        const newRecKey = await deriveRecoveryKey(newCode)
        const wrappedRecovery = await encrypt(newRecKey, accountKey)
        newRecKey.fill(0)

        await authApi.recoverFinish({
            email: email.value,
            new_auth_key: bytesToBase64(authKey),
            new_auth_salt: bytesToBase64(authSalt),
            new_enc_salt: bytesToBase64(encSalt),
            new_kdf_params: bytesToBase64(
                new TextEncoder().encode(
                    JSON.stringify({
                        algo: 'argon2id',
                        memoryKiB: DEFAULT_KDF_PARAMS.memoryKiB,
                        iterations: DEFAULT_KDF_PARAMS.iterations,
                        parallelism: DEFAULT_KDF_PARAMS.parallelism,
                    }),
                ),
            ),
            new_wrapped_keys: [
                { kind: 'master', wrapped_blob: bytesToBase64(wrappedMaster) },
                { kind: 'recovery', wrapped_blob: bytesToBase64(wrappedRecovery) },
            ],
        })

        authKey.fill(0)
        accountKey.fill(0)

        newRecoveryCode.value = recoveryCodeToBase32(newCode)
        step.value = 'success'
    } catch (err) {
        errorMsg.value = humanizeApiError(err)
    } finally {
        busy.value = false
    }
}

const onNewCodeConfirmed = () => {
    newRecoveryCode.value = null
    toast.success('Vault recovered', 'Sign in with your new password')
    router.push('/unlock')
}
</script>
