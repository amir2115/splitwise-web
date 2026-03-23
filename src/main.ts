import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from '@/app/App.vue'
import { router } from '@/app/router'
import { registerPwa } from '@/shared/pwa/register'
import '@/shared/theme/tokens.css'
import '@/shared/theme/app.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.mount('#app')

registerPwa()
