import './assets/main.css'
import './assets/styles/line-hover.css'
import './assets/styles/polygon-hover.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import App from './App.vue'
import router from './router'
import { registerSW } from 'virtual:pwa-register'
const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)
// Initialiser le store d'authentification
const authStore = useAuthStore(pinia)
if (window.INITIAL_STATE) {
  authStore.initialize(window.INITIAL_STATE)
}
app.mount('#app')

// Enregistrement du service worker pour la PWA
// L'objet updateSW sera utilisé par le composant PWAUpdateNotification
registerSW({
  immediate: true,
  onRegistered(r) {
    r && console.log('SW enregistré:', r)
  },
  onRegisterError(error) {
    console.error('Erreur d\'enregistrement du SW:', error)
  },
  onOfflineReady() {
    console.log('L\'application est prête à être utilisée hors ligne')
  }
})
