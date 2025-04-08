<template>
  <div v-if="showRefreshUI" class="pwa-update-notification">
    <div class="pwa-update-content">
      <p>Une nouvelle version est disponible</p>
      <div class="pwa-update-actions">
        <button @click="refreshApp" class="pwa-update-button">Mettre à jour</button>
        <button @click="closeNotification" class="pwa-close-button">Plus tard</button>
      </div>
    </div>
  </div>
  <div v-if="showOfflineReady" class="pwa-offline-notification">
    <div class="pwa-offline-content">
      <p>Application prête pour une utilisation hors ligne</p>
      <button @click="closeOfflineNotification" class="pwa-close-button">OK</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const showRefreshUI = ref(false)
const showOfflineReady = ref(false)
const updateSW = ref<(() => Promise<void>) | null>(null)

// Fonction pour mettre à jour l'application
const refreshApp = async () => {
  if (updateSW.value) {
    await updateSW.value()
    showRefreshUI.value = false
  }
}

// Fonction pour fermer la notification de mise à jour
const closeNotification = () => {
  showRefreshUI.value = false
}

// Fonction pour fermer la notification de disponibilité hors ligne
const closeOfflineNotification = () => {
  showOfflineReady.value = false
}

// Exposer les méthodes pour être utilisées par le composant parent
defineExpose({
  showRefreshUI,
  showOfflineReady,
  updateSW,
  refreshApp,
  closeNotification,
  closeOfflineNotification
})
</script>

<style scoped>
.pwa-update-notification,
.pwa-offline-notification {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #2b6451;
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  max-width: 90%;
  width: 400px;
  animation: slide-up 0.3s ease-out;
}

.pwa-update-content,
.pwa-offline-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.pwa-update-actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.pwa-update-button {
  background-color: white;
  color: #2b6451;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.pwa-update-button:hover {
  background-color: #f0f0f0;
}

.pwa-close-button {
  background-color: transparent;
  color: white;
  border: 1px solid white;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.pwa-close-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

@keyframes slide-up {
  from {
    transform: translate(-50%, 100px);
    opacity: 0;
  }
  to {
    transform: translate(-50%, 0);
    opacity: 1;
  }
}

/* Adaptation pour mobile */
@media (max-width: 480px) {
  .pwa-update-notification,
  .pwa-offline-notification {
    width: 90%;
    bottom: 10px;
  }
}
</style>
