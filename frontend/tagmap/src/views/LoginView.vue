<template>
  <!-- Fond en léger dégradé + structure scrollable -->
  <div class="min-h-screen overflow-auto relative bg-cover bg-center bg-no-repeat py-12 sm:px-6 lg:px-8" :style="{ backgroundImage: `url(${backgroundImage})` }">
    <!-- Conteneur principal avec scroll -->
    <div class="container mx-auto">
      <div class="sm:mx-auto sm:w-full sm:max-w-md">
        <!-- Titre et sous-titre centrés -->
        <h2 class="text-center text-3xl font-bold text-gray-800">
          TagMap
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          Solution innovante de cartographie et gestion de projets
        </p>
      </div>
      <!-- Carte de login avec ombre plus marquée et coins légèrement arrondis -->
      <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div class="bg-white py-8 px-6 shadow-lg rounded-md sm:px-10">
          <form class="space-y-6" @submit.prevent="handleSubmit">
            <div v-if="error" class="rounded-md bg-red-50 p-4">
              <div class="flex">
                <div class="flex-shrink-0">
                  <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clip-rule="evenodd" />
                  </svg>
                </div>
                <div class="ml-3">
                  <h3 class="text-sm font-medium text-red-800">
                    {{ error }}
                  </h3>
                </div>
              </div>
            </div>
            <div>
              <label for="username" class="block text-sm font-medium text-gray-700">
                Nom d'utilisateur
              </label>
              <div class="mt-1">
                <input id="username" v-model="form.username" name="username" type="text" required
                  autocomplete="username"
                  class="appearance-none block w-full h-11 px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  aria-label="Nom d'utilisateur" />
              </div>
            </div>
            <div>
              <label for="password" class="block text-sm font-medium text-gray-700">
                Mot de passe
              </label>
              <div class="mt-1 relative">
                <input id="password" v-model="form.password" :type="showPassword ? 'text' : 'password'" name="password"
                  required autocomplete="current-password"
                  class="appearance-none block w-full h-11 px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm pr-10"
                  aria-label="Mot de passe" />
                <button type="button" @click="showPassword = !showPassword"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center"
                  aria-label="Afficher/masquer le mot de passe">
                  <svg v-if="showPassword" class="h-5 w-5 text-gray-400 hover:text-gray-500"
                    xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <svg v-else class="h-5 w-5 text-gray-400 hover:text-gray-500" xmlns="http://www.w3.org/2000/svg"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                </button>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <input id="remember-me" v-model="form.rememberMe" name="remember-me" type="checkbox"
                  class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  aria-label="Se souvenir de moi" />
                <label for="remember-me" class="ml-2 block text-sm text-gray-900">
                  Se souvenir de moi
                </label>
              </div>
              <div class="text-sm">
                <router-link to="/forgot-password"
                  class="font-medium text-primary-600 hover:text-primary-500 transition-colors duration-200">
                  Mot de passe oublié ?
                </router-link>
              </div>
            </div>
            <div>
              <button type="submit" :disabled="loading"
                class="w-full h-11 flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Se connecter">
                <svg v-if="loading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                  </path>
                </svg>
                {{ loading ? 'Connexion en cours...' : 'Se connecter' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Section des cas d'usage -->
      <div class="mt-16 pt-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 class="text-center text-2xl font-bold text-gray-800 mb-8">Découvrez comment TagMap transforme vos projets
        </h2>

        <!-- Bouton de téléchargement de la plaquette -->
        <div class="flex justify-center mb-10">
          <a href="/assets/plaquette-tagmap.pdf" target="_blank"
            class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Télécharger notre plaquette
          </a>
        </div>

        <!-- Grille des cas d'usage -->
        <div class="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          <!-- Cas d'usage 1 : Cartographie de précision -->
          <div class="bg-white overflow-hidden shadow-lg rounded-lg transition-all duration-300 hover:shadow-xl">
            <div class="p-6">
              <div class="flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white mb-5 mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h3 class="text-lg font-medium text-gray-900 text-center">Cartographie de précision</h3>
              <p class="mt-3 text-base text-gray-600 text-center">
                Créez des plans détaillés avec des mesures précises de surfaces, distances et élévations pour optimiser
                vos projets d'irrigation et d'aménagement.
              </p>
            </div>
          </div>

          <!-- Cas d'usage 2 : Gestion collaborative -->
          <div class="bg-white overflow-hidden shadow-lg rounded-lg transition-all duration-300 hover:shadow-xl">
            <div class="p-6">
              <div class="flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white mb-5 mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 class="text-lg font-medium text-gray-900 text-center">Gestion collaborative</h3>
              <p class="mt-3 text-base text-gray-600 text-center">
                Partagez vos projets avec votre équipe et vos clients. Organisez vos notes géolocalisées et suivez
                l'avancement des tâches en temps réel.
              </p>
            </div>
          </div>
        </div>

        <!-- Témoignage client -->
        <div class="mt-16 mb-16 bg-white overflow-hidden shadow-lg rounded-lg max-w-4xl mx-auto">
          <div class="p-8">
            <div class="flex items-center mb-6">
              <div
                class="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xl">
                P</div>
              <div class="ml-4">
                <h4 class="text-lg font-medium text-gray-900">Pierre Durand</h4>
                <p class="text-sm text-gray-600">Directeur technique, Irrigation Pro</p>
              </div>
            </div>
            <blockquote class="italic text-gray-700">
              "TagMap a révolutionné notre façon de concevoir et de suivre nos projets d'irrigation. La précision des
              mesures et la facilité de collaboration entre nos équipes terrain et bureau ont considérablement amélioré
              notre efficacité."
            </blockquote>
          </div>
        </div>

        <!-- Espace en bas de page pour assurer le scroll -->
        <div class="h-16"></div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import backgroundImage from '@/assets/background.svg'

const router = useRouter()
const authStore = useAuthStore()
const loading = ref(false)
const error = ref<string | null>(null)
const showPassword = ref(false)
const form = reactive({
  username: '',
  password: '',
  rememberMe: false
})
onMounted(async () => {
  console.log('LoginView mounted')
  console.log('INITIAL_STATE:', window.INITIAL_STATE)

  try {
    // Vérifier si l'utilisateur est déjà authentifié
    if (window.INITIAL_STATE?.isAuthenticated) {
      console.log('User is authenticated, redirecting to home')
      router.push('/')
      return
    }

    // Si pas d'état initial, tenter une restauration de session
    const isAuthenticated = await authStore.restoreSession()
    if (isAuthenticated) {
      console.log('Session restored, redirecting to home')
      router.push('/')
    }
  } catch (err) {
    console.error('Error during initialization:', err)
    // En cas d'erreur, on reste sur la page de login
    error.value = null
  }
})
async function handleSubmit() {
  loading.value = true
  error.value = null
  try {
    if (!form.username || !form.password) {
      error.value = 'Veuillez remplir tous les champs'
      return
    }
    await authStore.login(form.username, form.password)
    if (authStore.user?.must_change_password) {
      router.push('/change-password')
    } else {
      router.push('/')
    }
  } catch (err: any) {
    console.error('Login error:', err)
    // Gestion améliorée des erreurs
    if (err?.response?.status === 500) {
      error.value = 'Le service est temporairement indisponible. Veuillez réessayer dans quelques instants.'
    } else if (err?.response?.status === 401 || err?.response?.status === 403) {
      error.value = 'Identifiants incorrects. Veuillez vérifier votre nom d\'utilisateur et mot de passe.'
    } else if (err?.response?.data?.detail) {
      error.value = err.response.data.detail
    } else if (err?.response?.data?.non_field_errors?.[0]) {
      error.value = err.response.data.non_field_errors[0]
    } else if (err?.message === 'Network Error') {
      error.value = 'Impossible de se connecter au serveur. Veuillez vérifier votre connexion internet.'
    } else {
      error.value = 'Une erreur est survenue lors de la connexion. Veuillez réessayer.'
    }
  } finally {
    loading.value = false
  }
}
</script>
