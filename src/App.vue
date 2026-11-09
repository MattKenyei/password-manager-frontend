<template>
  <RouterView />
  <ToastContainer />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import ToastContainer from '@/components/ToastContainer.vue'
import { isTauri } from '@/platform/env'
import { onAppStateChange } from './platform/app-lifecycle'

const auth = useAuthStore()
const router = useRouter()

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousemove',
  'keydown',
  'click',
  'scroll',
  'touchstart',
]

const onActivity = () => {
  auth.touchActivity()
}

const onVisibilityChange = () => {
  if (document.visibilityState === 'hidden' && auth.settings.lockOnTabHide) {
    auth.lock()
    if (router.currentRoute.value.meta.requiresUnlock) {
      router.push({ name: 'unlock' })
    }
  }
}


const cleanup = onAppStateChange((isActive) => {
  if (!isActive && auth.isUnlocked) {
    auth.lock()
  }
})

let lockIntervalId: number | null = null
let unlistenFocus: (() => void) | null = null

onMounted(async () => {
  await auth.bootstrap()

  ACTIVITY_EVENTS.forEach((evt) =>
    window.addEventListener(evt, onActivity, { passive: true }),
  )
  document.addEventListener('visibilitychange', onVisibilityChange)

  lockIntervalId = window.setInterval(() => {
    if (auth.shouldAutoLock()) {
      auth.lock()
      if (router.currentRoute.value.meta.requiresUnlock) {
        router.push({ name: 'unlock', query: { reason: 'auto-lock' } })
      }
    }
  }, 30_000)
  if (isTauri()) {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    const appWindow = getCurrentWindow()
    unlistenFocus = await appWindow.onFocusChanged(({ payload: focused }) => {
      if (!focused && auth.isUnlocked) {
        auth.lock()
        if (router.currentRoute.value.meta.requiresUnlock) {
          router.push({ name: 'unlock', query: { reason: 'blur' } })
        }
      }
    })
  }
})

onBeforeUnmount(() => {
  cleanup()
  ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, onActivity))
  document.removeEventListener('visibilitychange', onVisibilityChange)

  if (lockIntervalId !== null) {
    window.clearInterval(lockIntervalId)
  }

  if (unlistenFocus) {
    unlistenFocus()
  }
})
</script>