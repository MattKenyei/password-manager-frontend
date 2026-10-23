import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/main.scss'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')


/** testing **/
// if (import.meta.env.DEV) {
//     import('./crypto/selftest').then(({ runSelfTest }) => {
//         ; (window as any).__cryptoSelfTest = runSelfTest
//     })
// }