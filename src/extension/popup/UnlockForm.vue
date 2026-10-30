<template>
    <form class="p-4 space-y-3" @submit.prevent="submit">
        <div>
            <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">Email</label>
            <input v-model="email" type="email" required
                class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700" />
        </div>
        <div>
            <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">Master password</label>
            <input v-model="password" type="password" required autofocus
                class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700" />
        </div>
        <p v-if="error" class="text-xs text-red-600">{{ error }}</p>
        <button type="submit" :disabled="!canSubmit"
            class="w-full py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">
            {{ busy ? 'Unlocking…' : 'Unlock' }}
        </button>
    </form>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { send, type IUnlockStartData } from '../shared/messages'
import { base64ToBytes, bytesToBase64 } from '@/crypto/base64'
import { deriveKeySync } from '@/crypto/argon2-sync'
import { decrypt, encrypt } from '@/crypto/cipher'
import * as authApi from '@/api/auth'
import { getDeviceID } from '@/platform/device'

const props = defineProps<{ defaultEmail: string }>()
const emit = defineEmits<{ unlocked: [] }>()

const email = ref(props.defaultEmail)
const password = ref('')
const busy = ref(false)
const error = ref<string | null>(null)

const canSubmit = computed(
    () => email.value.length > 0 && password.value.length > 0 && !busy.value,
)

const submit = async () => {
    if (!canSubmit.value) return
    busy.value = true
    error.value = null
    try {
        const startResp = await send<IUnlockStartData>({
            type: 'UNLOCK_START',
            email: email.value,
        })
        if (!startResp.ok) throw new Error(startResp.error)

        const { authSalt, encSalt } = startResp.data

        const encSaltBytes = base64ToBytes(encSalt)
        const authSaltBytes = base64ToBytes(authSalt)
        const passwordBytes = new TextEncoder().encode(password.value)

        const [masterKey, authKey] = await Promise.all([
            deriveKeySync(passwordBytes, encSaltBytes),
            deriveKeySync(passwordBytes, authSaltBytes),
        ])

        try {
            const deviceId = getDeviceID()
            const loginResp = await authApi.loginFinish({
                email: email.value,
                auth_key: bytesToBase64(authKey),
                device_id: deviceId,
                device_name: 'Browser Extension',
                device_platform: 'extension',
            })

            const wrapped = base64ToBytes(loginResp.wrapped_account_key)
            const accountKey = await decrypt(masterKey, wrapped)

            const finishResp = await send({
                type: 'UNLOCK_FINISH',
                email: email.value,
                authKey: bytesToBase64(authKey),
                accountKey: bytesToBase64(accountKey),
                accessToken: loginResp.access_token,
                refreshToken: loginResp.refresh_token,
            })
            if (!finishResp.ok) throw new Error(finishResp.error)

            accountKey.fill(0)
            emit('unlocked')
        } finally {
            masterKey.fill(0)
            authKey.fill(0)
        }
    } catch (err) {
        error.value = (err as Error).message
    } finally {
        busy.value = false
    }
}
</script>