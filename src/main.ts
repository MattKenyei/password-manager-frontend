import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useThemeStore } from '@/stores/theme'
import './styles/tailwind.css'
import './styles/main.scss'

const app = createApp(App)
app.use(createPinia())
app.use(router)
useThemeStore()
app.mount('#app')