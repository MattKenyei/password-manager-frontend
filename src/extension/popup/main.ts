import { createApp } from 'vue'
import App from './App.vue'
import '@/styles/tailwind.css'
import '@/styles/main.scss'

document.documentElement.classList.add('dark')

createApp(App).mount('#app')