<template>
  <div class="settings-page max-w-xl mx-auto py-10 px-4 min-h-full">
    <h1 class="text-2xl font-bold mb-6">Paramètres de l'application</h1>
    
    <!-- Indicateur de chargement -->
    <div v-if="loading" class="mb-6">
      <div class="animate-pulse flex space-x-4">
        <div class="flex-1 space-y-4 py-1">
          <div class="h-4 bg-gray-200 rounded w-3/4"></div>
          <div class="space-y-2">
            <div class="h-4 bg-gray-200 rounded"></div>
            <div class="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Message d'erreur --> 
    <div v-if="error" class="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm text-red-700">
            {{ error }}
          </p>
        </div>
      </div>
    </div>
    
    <div class="bg-white shadow rounded-lg p-6">
      <form @submit.prevent="saveApiKey" class="space-y-4">
        <div>
          <label for="google-maps-api-key" class="block text-sm font-medium text-gray-700">Clé API Google Maps</label>
          <input
            id="google-maps-api-key"
            v-model="apiKey"
            type="password"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            placeholder="Entrez votre clé API Google Maps"
            autocomplete="off"
            :disabled="loading"
          />
        </div>
        <button
          type="submit"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="loading"
        >
          <svg v-if="loading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Sauvegarder
        </button>
        <p v-if="successMessage" class="text-green-600 mt-2">{{ successMessage }}</p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import settingsService from '@/services/settings'

const apiKey = ref('')
const successMessage = ref('')
const loading = ref(false)
const error = ref('')

onMounted(async () => {
  await fetchApiKey()
})

async function fetchApiKey() {
  loading.value = true
  error.value = ''
  
  try {
    const response = await settingsService.getGoogleMapsApiKey()
    if (response.data && response.data.key_status === 'configured') {
      apiKey.value = '••••••••••••••••••••••••••'
    } else {
      apiKey.value = ''
    }
  } catch (err) {
    console.error('Erreur lors de la récupération de la clé API:', err)
    error.value = 'Impossible de récupérer la clé API. Veuillez réessayer plus tard.'
  } finally {
    loading.value = false
  }
}

async function saveApiKey() {
  if (!apiKey.value) {
    error.value = 'La clé API est requise.'
    return
  }
  
  loading.value = true
  error.value = ''
  successMessage.value = ''
  
  try {
    await settingsService.setGoogleMapsApiKey(apiKey.value)
    successMessage.value = 'Clé API sauvegardée avec succès.'
    setTimeout(() => { successMessage.value = '' }, 3000)
  } catch (err) {
    console.error('Erreur lors de la sauvegarde de la clé API:', err)
    error.value = 'Impossible de sauvegarder la clé API. Veuillez réessayer plus tard.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.settings-page {
  min-height: 60vh;
}
</style> 