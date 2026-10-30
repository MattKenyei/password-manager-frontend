import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useThemeStore } from '@/stores/theme'
import './styles/tailwind.css'
import './styles/main.scss'
import { useAuthStore } from './stores/auth.ts'

const app = createApp(App)
app.use(createPinia())
app.use(router)

const auth = useAuthStore()
await auth.bootstrap()
useThemeStore()
app.mount('#app')