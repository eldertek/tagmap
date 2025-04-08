import './assets/main.css'
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
export const updateSW = registerSW({
  onNeedRefresh() {
    // La notification sera gérée par le composant PWAUpdateNotification
    console.log('Une mise à jour est disponible !')
    // L'événement sera capturé par App.vue
    window.dispatchEvent(new CustomEvent('pwa-update-available'))
  },
  onOfflineReady() {
    // La notification sera gérée par le composant PWAUpdateNotification
    console.log('L\'application est prête à être utilisée hors ligne')
    // L'événement sera capturé par App.vue
    window.dispatchEvent(new CustomEvent('pwa-offline-ready'))
  }
})
