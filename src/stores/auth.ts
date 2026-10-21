import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
    // account_key only in memory
    // (Pinia devtools serialize state). Just flag yetgi
    const isUnlocked = ref(false)

    const isAuthenticated = computed(() => isUnlocked.value)

    return { isUnlocked, isAuthenticated }
})