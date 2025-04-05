<template>
  <!-- Container principal avec background stylisé -->
  <div class="min-h-screen overflow-auto relative py-12 sm:px-6 lg:px-8">
    <!-- Background pattern avec flou -->
    <div class="fixed inset-0 z-0" 
         :style="{ 
           backgroundImage: `url(${backgroundImage})`,
           backgroundSize: '400px',
           backgroundRepeat: 'repeat',
           filter: 'blur(1px) opacity(0.15)'
         }">
    </div>
    <!-- Overlay gradient subtil -->
    <div class="fixed inset-0 z-0 bg-gradient-to-br from-white/40 via-transparent to-primary-900/10"></div>
    
    <!-- Contenu principal -->
    <div class="container mx-auto relative z-10">
      <!-- Section connexion -->
      <div class="sm:mx-auto sm:w-full sm:max-w-md">
        <div class="bg-white/95 backdrop-blur-sm py-8 px-6 shadow-xl rounded-xl sm:px-10 border border-white/20">
          <!-- En-tête avec titre et sous-titre -->
          <div class="text-center mb-8">
            <h2 class="text-3xl font-bold text-gray-900 mb-2">
              TagMap
            </h2>
            <p class="text-sm text-gray-600">
              Solution innovante de cartographie et gestion de projets
            </p>
          </div>

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

      <!-- Section Fonctionnalités Clés -->
      <div class="mt-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <!-- Carte Interactive -->
          <div class="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20">
            <div class="flex items-center mb-4">
              <span class="text-2xl mr-2">👀📌</span>
              <h3 class="text-lg font-semibold text-gray-900">Carte Interactive</h3>
            </div>
            <p class="text-gray-600">Imaginez... Une carte interactive où tout est sous contrôle ! Tout est centralisé, organisé et accessible en un clin d'œil !</p>
          </div>

          <!-- Travail d'équipe -->
          <div class="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20">
            <div class="flex items-center mb-4">
              <span class="text-2xl mr-2">👥💻🔄</span>
              <h3 class="text-lg font-semibold text-gray-900">Collaboration en Temps Réel</h3>
            </div>
            <p class="text-gray-600">Travail d'équipe simplifié : Collaborez en temps réel sur une interface ultra-intuitive. Vos équipes restent synchronisées et efficaces !</p>
          </div>

          <!-- Cerveau cartographique -->
          <div class="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20">
            <div class="flex items-center mb-4">
              <span class="text-2xl mr-2">🚜📸</span>
              <h3 class="text-lg font-semibold text-gray-900">Cerveau Cartographique</h3>
            </div>
            <p class="text-gray-600">Un cerveau cartographique : Dessinez, annotez, planifiez, suivez !</p>
          </div>

          <!-- Sécurité -->
          <div class="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20">
            <div class="flex items-center mb-4">
              <span class="text-2xl mr-2">🔐🔑</span>
              <h3 class="text-lg font-semibold text-gray-900">Accès Sécurisé</h3>
            </div>
            <p class="text-gray-600">Accès sécurisé et intelligent : Gérez les droits d'accès de vos salariés et prestataires en un clic.</p>
          </div>
        </div>

        <!-- Section Équipements Connectés -->
        <div class="mt-12 bg-white/90 backdrop-blur-sm p-8 rounded-xl shadow-lg border border-white/20">
          <div class="flex items-center mb-6">
            <span class="text-2xl mr-2">💡</span>
            <h3 class="text-xl font-bold text-gray-900">Équipements Connectés sans Abonnement</h3>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="flex items-center space-x-4">
              <div class="flex-shrink-0 text-2xl">📍</div>
              <div>
                <h4 class="font-semibold">Tracker GPS solaire</h4>
                <p class="text-gray-600">Géolocalisez et sécurisez votre matériel</p>
              </div>
            </div>
            <div class="flex items-center space-x-4">
              <div class="flex-shrink-0 text-2xl">🌤️</div>
              <div>
                <h4 class="font-semibold">Station météo</h4>
                <p class="text-gray-600">Optimisez vos décisions avec des données en temps réel</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Section Témoignages -->
        <div class="mt-12">
          <h3 class="text-2xl font-bold text-center text-gray-900 mb-8">Ils utilisent TagMap</h3>
          
          <!-- Filtres par secteur -->
          <div class="flex flex-wrap justify-center gap-2 mb-8">
            <button v-for="sector in sectors" 
                    :key="sector"
                    @click="selectedSector = sector"
                    :class="[
                      'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
                      selectedSector === sector 
                        ? 'bg-primary-600 text-white' 
                        : 'bg-white/80 text-gray-700 hover:bg-primary-50'
                    ]">
              {{ sector }}
            </button>
          </div>

          <!-- Grid des témoignages -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div v-for="testimonial in filteredTestimonials" 
                 :key="testimonial.type"
                 class="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20 transition-all duration-300 hover:shadow-xl">
              <div class="flex items-center mb-4">
                <span class="text-2xl mr-2">{{ testimonial.icon }}</span>
                <span class="text-xl font-semibold text-gray-900">{{ testimonial.type }}</span>
              </div>
              <p class="text-gray-600 text-sm">{{ testimonial.text }}</p>
            </div>
          </div>

          <!-- Navigation par pages si nécessaire -->
          <div v-if="totalPages > 1" class="flex justify-center mt-8 gap-2">
            <button v-for="page in totalPages" 
                    :key="page"
                    @click="currentPage = page"
                    :class="[
                      'w-8 h-8 rounded-full text-sm font-medium transition-all duration-200',
                      currentPage === page 
                        ? 'bg-primary-600 text-white' 
                        : 'bg-white/80 text-gray-700 hover:bg-primary-50'
                    ]">
              {{ page }}
            </button>
          </div>
        </div>
      </div>

      <!-- Espace en bas de page -->
      <div class="h-16"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import backgroundImage from '@/assets/background.svg'

const router = useRouter()
const authStore = useAuthStore()
const loading = ref(false)
const error = ref<string | null>(null)
const showPassword = ref(false)
const selectedSector = ref('Tous')
const currentPage = ref(1)
const itemsPerPage = 6

const form = reactive({
  username: '',
  password: '',
  rememberMe: false
})

const testimonials = [
  {
    type: 'Liniculteur',
    sector: 'Agriculture',
    icon: '🌾',
    text: 'En tant qu\'entreprise, j\'ai mis en place un sous-compte « agriculteur » permettant la géolocalisation des parcelles. Cela offre à nos salariés et prestataires une visibilité complète sur l\'ensemble des parcelles et facilite leur accès. De plus, ils peuvent y ajouter des notes et des photos si nécessaire. Grâce aux trackers, nous renforçons également la sécurité de nos machines contre le vol.'
  },
  {
    type: 'Agro industriel',
    sector: 'Industrie',
    icon: '🏭',
    text: 'La gestion des comptes et sous-comptes est un atout majeur pour limiter, filtrer et contrôler l\'accès de nos salariés aux différentes tâches.'
  },
  {
    type: 'Agence de voyage',
    sector: 'Tourisme',
    icon: '✈️',
    text: 'L\'outil nous permet de créer gratuitement et sans limite des sous-comptes clients, d\'établir des itinéraires personnalisés avec des points d\'intérêt.'
  },
  {
    type: 'Industriel agroalimentaire',
    sector: 'Industrie',
    icon: '🌱',
    text: 'Nous disposons d\'un compte entreprise avec des sous-comptes dédiés à chaque culture. Nos techniciens et agriculteurs partenaires peuvent ainsi ajouter des annotations et photo sur les parcelles. Grâce aux stations météo connectées, nous optimisons la gestion des tours d\'irrigation par secteur géographique en fonction des précipitations.'
  },
  {
    type: 'Conseil municipal',
    sector: 'Collectivité',
    icon: '🏛️',
    text: 'Cette solution nous permet de gagner en efficacité dans la gestion des tâches à réaliser, en les géolocalisant et en offrant à nos employés communaux la possibilité d\'ajouter des commentaires et des photos sur chaque tâche géoréférencée.'
  },
  {
    type: 'Location de matériel',
    sector: 'Services',
    icon: '🚜',
    text: 'Cette solution nous permet de géolocaliser notre flotte grâce à des trackers sans abonnement, avec uniquement un abonnement à la plateforme.'
  },
  {
    type: 'Agriculteur',
    sector: 'Agriculture',
    icon: '👨‍🌾',
    text: 'J\'ai équipé tous mes canons d\'enrouleurs de trackers et de caméras pour dissuader le vol de batteries.'
  },
  {
    type: 'Semencier',
    sector: 'Agriculture',
    icon: '🌱',
    text: 'Nous assurons la géolocalisation de l\'ensemble de nos parcelles en France.'
  },
  {
    type: 'Concessionnaire irrigation',
    sector: 'Services',
    icon: '💧',
    text: 'Nous avons géolocalisé tous les forages de nos clients et ajouté en commentaire la procédure d\'entrée, facilitant ainsi le travail de nos techniciens et agriculteurs lors des interventions.'
  },
  {
    type: 'Entreprise paysagiste',
    sector: 'Services',
    icon: '🌳',
    text: 'Nous géolocalisons tous nos chantiers et ajoutons une photo du chantier terminé en commentaire, servant de preuve en cas de litige.'
  }
]

const sectors = computed(() => {
  const uniqueSectors = ['Tous', ...new Set(testimonials.map(t => t.sector))]
  return uniqueSectors
})

const filteredTestimonials = computed(() => {
  let filtered = selectedSector.value === 'Tous' 
    ? testimonials 
    : testimonials.filter(t => t.sector === selectedSector.value)
  
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filtered.slice(start, end)
})

const totalPages = computed(() => {
  const filtered = selectedSector.value === 'Tous' 
    ? testimonials 
    : testimonials.filter(t => t.sector === selectedSector.value)
  return Math.ceil(filtered.length / itemsPerPage)
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

<style scoped>
.backdrop-blur-sm {
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
</style>
