import { isExtension } from "@/platform/env";
import { createMemoryHistory, createRouter, createWebHistory } from "vue-router";

const history = isExtension() ? createMemoryHistory() : createWebHistory()
const router = createRouter({
    history,
    routes: [
        {
            path: '/',
            redirect: '/vault',
        },
        {
            path: '/unlock',
            name: 'unlock',
            component: () => import('@/views/UnlockView.vue'),
        },
        {
            path: '/register',
            name: 'register',
            component: () => import('@/views/RegisterView.vue'),
        },
        {
            path: '/vault',
            name: 'vault',
            component: () => import('@/views/VaultView.vue'),
            meta: { requiresUnlock: true },
        },
        {
            path: '/settings',
            name: 'settings',
            component: () => import('@/views/SettingsView.vue'),
            meta: { requiresUnlock: true },
        },
        {
            path: '/recover',
            name: 'recover',
            component: () => import('@/views/RecoverView.vue'),
        }
    ],
})

router.beforeEach(async (to) => {
    const { useAuthStore } = await import('@/stores/auth')
    const auth = useAuthStore()

    if (to.meta.requiresUnlock && !auth.isUnlocked) {
        return { name: 'unlock', query: { redirect: to.fullPath } }
    }

    if (to.name === 'unlock' && auth.isUnlocked) {
        return { name: 'vault' }
    }

    return true
})

export default router