<template>
  <div v-if="showInstallPrompt" class="pwa-install-prompt" :class="{ 'fullscreen': isFullscreen }">
    <div class="prompt-content">
      <div class="prompt-header">
        <div class="app-info">
          <img src="/img/icons/android-chrome-192x192.png" alt="TagMap Logo" class="app-logo" />
          <div class="app-details">
            <h2>Installer TagMap</h2>
            <p>Solution innovante de cartographie et gestion de projets</p>
          </div>
        </div>
        <button @click="closePrompt" class="close-button" aria-label="Fermer">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="prompt-body">
        <div v-if="isIOS" class="install-instructions ios">
          <h3>Pour installer l'application sur votre iPhone :</h3>
          <div class="instruction-step">
            <div class="step-number">1</div>
            <div class="step-content">
              <p>Appuyez sur <strong>Partager</strong> <span class="ios-share-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                  <polyline points="16 6 12 2 8 6"></polyline>
                  <line x1="12" y1="2" x2="12" y2="15"></line>
                </svg>
              </span></p>
            </div>
          </div>
          <div class="instruction-step">
            <div class="step-number">2</div>
            <div class="step-content">
              <p>Faites défiler et appuyez sur <strong>Sur l'écran d'accueil</strong></p>
            </div>
          </div>
          <div class="instruction-step">
            <div class="step-number">3</div>
            <div class="step-content">
              <p>Appuyez sur <strong>Ajouter</strong> en haut à droite</p>
            </div>
          </div>
        </div>

        <div v-else-if="isAndroid" class="install-instructions android">
          <h3>Pour installer l'application sur votre appareil :</h3>
          <div class="instruction-step">
            <div class="step-number">1</div>
            <div class="step-content">
              <p>Appuyez sur le bouton ci-dessous</p>
            </div>
          </div>
          <button @click="installPWA" class="install-button">
            Installer l'application
          </button>
        </div>

        <div v-else-if="isDesktop" class="install-instructions desktop">
          <h3>Pour installer l'application sur votre ordinateur :</h3>
          <div class="instruction-step">
            <div class="step-number">1</div>
            <div class="step-content">
              <p>Cliquez sur le bouton ci-dessous pour installer l'application</p>
            </div>
          </div>
          <button @click="installPWA" class="install-button">
            Installer l'application
          </button>
        </div>

        <div v-else class="install-instructions desktop">
          <h3>Pour installer l'application sur votre ordinateur :</h3>
          <div class="instruction-step">
            <div class="step-number">1</div>
            <div class="step-content">
              <p>Cliquez sur l'icône d'installation dans la barre d'adresse</p>
            </div>
          </div>
          <div class="instruction-step">
            <div class="step-number">2</div>
            <div class="step-content">
              <p>Cliquez sur "Installer"</p>
            </div>
          </div>
        </div>
      </div>

      <div class="prompt-footer">
        <div class="benefits">
          <div class="benefit-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            <span>Sécurisé</span>
          </div>
          <div class="benefit-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span>Rapide</span>
          </div>
          <div class="benefit-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
            <span>Hors ligne</span>
          </div>
        </div>
        <button @click="closePrompt" class="remind-later">Me le rappeler plus tard</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

// État du popup
const showInstallPrompt = ref(false)
const isFullscreen = ref(false)
const deferredPrompt = ref<any>(null)
const installButton = ref<HTMLButtonElement | null>(null)

// Détection de la plateforme
const isIOS = ref(false)
const isAndroid = ref(false)
const isDesktop = ref(false)

// Vérifier si l'application est déjà installée
const isAppInstalled = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches || 
         (window.navigator as any).standalone === true
}

// Vérifier si l'utilisateur a déjà fermé le popup récemment
const hasRecentlyClosedPrompt = (): boolean => {
  const lastPromptTime = localStorage.getItem('pwaPromptLastClosed')
  if (!lastPromptTime) return false
  
  // Ne pas montrer le popup pendant 3 jours après sa fermeture
  const threeDay = 3 * 24 * 60 * 60 * 1000
  return Date.now() - parseInt(lastPromptTime) < threeDay
}

// Détecter la plateforme et afficher le popup si nécessaire
const initializePrompt = () => {
  // Détecter iOS
  isIOS.value = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
  
  // Détecter Android
  isAndroid.value = /Android/.test(navigator.userAgent)
  
  // Détecter Desktop
  isDesktop.value = !isIOS.value && !isAndroid.value
  
  // Écouter l'événement beforeinstallprompt
  window.addEventListener('beforeinstallprompt', (e) => {
    // Empêcher Chrome 76 et versions antérieures d'afficher automatiquement le prompt
    e.preventDefault()
    // Stocker l'événement pour pouvoir le déclencher plus tard
    deferredPrompt.value = e
    // Afficher le popup d'installation
    showInstallPrompt.value = true
    isFullscreen.value = true
  })

  // Écouter l'événement appinstalled
  window.addEventListener('appinstalled', (evt) => {
    showInstallPrompt.value = false
  })
  
  // Vérifier si l'application est déjà installée
  if (isAppInstalled()) {
    return
  }
  
  // Vérifier si l'utilisateur a récemment fermé le popup
  if (hasRecentlyClosedPrompt()) {
    return
  }
  
  // Afficher le popup après un délai
  setTimeout(() => {
    showInstallPrompt.value = true
    isFullscreen.value = true
  }, 3000)
}

// Nettoyer les écouteurs d'événements
const cleanup = () => {
  window.removeEventListener('beforeinstallprompt', () => {})
  window.removeEventListener('appinstalled', () => {})
}

onMounted(() => {
  initializePrompt()
})

onBeforeUnmount(() => {
  cleanup()
})

// Installer la PWA
const installPWA = async () => {
  if (!deferredPrompt.value) {
    return
  }
  
  try {
    // Afficher le prompt d'installation natif
    deferredPrompt.value.prompt()
    
    // Attendre que l'utilisateur réponde au prompt
    const choiceResult = await deferredPrompt.value.userChoice
    
    // Réinitialiser la variable deferredPrompt
    deferredPrompt.value = null
    
    // Fermer notre popup personnalisé
    if (choiceResult.outcome === 'accepted') {
      showInstallPrompt.value = false
    } 
  } catch (error) {
    console.error('Erreur lors de l\'installation:', error)
  }
}

// Fermer le popup
const closePrompt = () => {
  showInstallPrompt.value = false
  // Enregistrer le moment où l'utilisateur a fermé le popup
  localStorage.setItem('pwaPromptLastClosed', Date.now().toString())
}
</script>

<style scoped>
.pwa-install-prompt {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: white;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.prompt-content {
  max-width: 500px;
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
  background-color: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.prompt-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.app-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.app-logo {
  width: 60px;
  height: 60px;
  border-radius: 12px;
}

.app-details h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 5px 0;
  color: #2b6451;
}

.app-details p {
  font-size: 0.9rem;
  color: #666;
  margin: 0;
}

.close-button {
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  padding: 5px;
}

.close-button:hover {
  color: #666;
}

.prompt-body {
  padding: 10px 0;
}

.install-instructions {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.install-instructions h3 {
  font-size: 1.1rem;
  font-weight: 500;
  margin: 0 0 10px 0;
  color: #333;
}

.instruction-step {
  display: flex;
  align-items: flex-start;
  gap: 15px;
}

.step-number {
  background-color: #2b6451;
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
}

.step-content {
  flex: 1;
}

.step-content p {
  margin: 0;
  line-height: 1.5;
}

.ios-share-icon {
  display: inline-flex;
  vertical-align: middle;
  color: #007aff;
}

.install-button {
  background-color: #2b6451;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  width: 100%;
  margin-top: 10px;
  transition: all 0.2s;
}

.install-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.install-button:not(:disabled):hover {
  background-color: #1e4a3c;
  transform: translateY(-1px);
}

.prompt-footer {
  border-top: 1px solid #eee;
  padding-top: 15px;
}

.benefits {
  display: flex;
  justify-content: space-around;
  margin-bottom: 15px;
}

.benefit-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  color: #666;
}

.benefit-item svg {
  color: #2b6451;
}

.remind-later {
  background: none;
  border: none;
  color: #666;
  text-decoration: underline;
  cursor: pointer;
  width: 100%;
  padding: 10px;
  font-size: 0.9rem;
}

/* Adaptations pour mobile */
@media (max-width: 480px) {
  .pwa-install-prompt {
    padding: 15px;
  }
  
  .app-logo {
    width: 50px;
    height: 50px;
  }
  
  .app-details h2 {
    font-size: 1.3rem;
  }
  
  .app-details p {
    font-size: 0.8rem;
  }
}
</style>
