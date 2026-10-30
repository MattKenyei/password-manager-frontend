<template>
  <RouterView />
  <ToastContainer />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import ToastContainer from '@/components/ToastContainer.vue'
import { getCurrentWindow } from '@tauri-apps/api/window'

const auth = useAuthStore()
const router = useRouter()

const appWindow = getCurrentWindow()

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousemove',
  'keydown',
  'click',
  'scroll',
  'touchstart',
]

const onActivity = (): void => {
  auth.touchActivity()
}

const onVisibilityChange = (): void => {
  if (document.visibilityState === 'hidden' && auth.settings.lockOnTabHide) {
    auth.lock()
    if (router.currentRoute.value.meta.requiresUnlock) {
      router.push({ name: 'unlock' })
    }
  }
}

let lockIntervalId: number | null = null
let unlistenFocus: (() => void) | null = null

onMounted(async () => {
  await auth.bootstrap()

  ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, onActivity, { passive: true }))
  document.addEventListener('visibilitychange', onVisibilityChange)

  lockIntervalId = window.setInterval(() => {
    if (auth.shouldAutoLock()) {
      auth.lock()
      if (router.currentRoute.value.meta.requiresUnlock) {
        router.push({ name: 'unlock', query: { reason: 'auto-lock' } })
      }
    }
  }, 30_000)

  unlistenFocus = await appWindow.onFocusChanged(({ payload: focused }) => {
    if (!focused && auth.isUnlocked) {
      auth.lock()
    }
  })
})

onBeforeUnmount(() => {
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