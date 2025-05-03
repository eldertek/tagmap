<template>
  <div class="fixed inset-0 z-[3001] overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen w-full p-0">
      <div class="fixed inset-0 transition-opacity" aria-hidden="true">
        <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
      </div>
      <div
        class="relative bg-white w-full h-full max-h-full overflow-y-auto md:rounded-lg md:max-w-4xl md:h-auto md:max-h-[90vh] md:my-8 shadow-xl transform transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-headline"
      >
        <div>
          <div class="p-4 md:p-6">
            <div class="flex justify-between items-center mb-4 border-b pb-4">
              <h3 class="text-xl font-semibold text-gray-900" id="modal-headline">
                {{ user ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur' }}
              </h3>
              <button
                type="button"
                @click="$emit('close')"
                class="text-gray-400 hover:text-gray-500"
              >
                <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div class="mt-4">
              <!-- Message d'erreur global -->
              <div v-if="globalError" class="mb-4 rounded-md bg-red-50 p-4">
                <div class="flex">
                  <div class="flex-shrink-0">
                    <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                    </svg>
                  </div>
                  <div class="ml-3">
                    <h3 class="text-sm font-medium text-red-800">{{ globalError }}</h3>
                  </div>
                </div>
              </div>

              <form @submit.prevent="saveUser" class="space-y-6">
                <!-- Champ de type d'utilisateur (uniquement pour les admins) -->
                <div v-if="isAdmin">
                  <label for="role" class="block text-sm font-medium text-gray-700">Type d'utilisateur</label>
                  <select
                    id="role"
                    v-model="form.role"
                    class="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    required
                  >
                    <option value="ADMIN">Administrateur</option>
                    <option value="ENTREPRISE">Entreprise</option>
                    <option value="SALARIE">Salarie</option>
                    <option value="VISITEUR">Visiteur</option>
                  </select>
                </div>

                <!-- Sélection d'entreprise (uniquement pour les salaries créés par un admin) -->
                <div v-if="isAdmin && form.role === 'SALARIE'">
                  <label for="entreprise" class="block text-sm font-medium text-gray-700">Entreprise</label>
                  <select
                    id="entreprise"
                    v-model="form.entreprise"
                    class="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  >
                    <option :value="null">-- Sélectionner une entreprise --</option>
                    <option v-for="entreprise in entreprises" :key="entreprise.id" :value="entreprise.id">
                      {{ entreprise.first_name }} {{ entreprise.last_name }} ({{ entreprise.company_name || 'Entreprise' }})
                    </option>
                  </select>
                </div>

                <!-- Champ de type d'utilisateur (pour les entreprises) -->
                <div v-if="isEntreprise && !form.id">
                  <label for="role" class="block text-sm font-medium text-gray-700">Type d'utilisateur</label>
                  <select
                    id="role"
                    v-model="form.role"
                    class="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    required
                  >
                    <option value="SALARIE">Salarie</option>
                    <option value="VISITEUR">Visiteur</option>
                  </select>
                </div>

                <!-- Sélection de salarie pour les visiteurs (sauf si le créateur est un salarie) -->
                <div v-if="(isAdmin || isEntreprise) && form.role === 'VISITEUR' && !currentSalarie">
                  <label for="salarie" class="block text-sm font-medium text-gray-700">Salarie</label>
                  <select
                    id="salarie"
                    v-model="form.salarie"
                    class="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    required
                  >
                    <option :value="null">-- Sélectionner un salarie --</option>
                    <option v-for="salarie in salaries" :key="salarie.id" :value="salarie.id">
                      {{ salarie.first_name }} {{ salarie.last_name }} ({{ salarie.company_name || 'Salarie' }})
                    </option>
                  </select>
                </div>
                
                <!-- Information pour les salariés créant des visiteurs -->
                <div v-if="currentSalarie && !isAdmin && !isEntreprise" class="bg-blue-50 p-3 rounded-md mb-4">
                  <div class="flex">
                    <div class="flex-shrink-0">
                      <svg class="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                      </svg>
                    </div>
                    <div class="ml-3">
                      <p class="text-sm text-blue-700">
                        Vous êtes en train de créer un visiteur qui sera automatiquement associé à votre compte.
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Champs pour les informations générales de l'utilisateur -->
                <div class="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                  <div>
                    <label for="first_name" class="block text-sm font-medium text-gray-700">Prénom</label>
                    <input
                      type="text"
                      id="first_name"
                      v-model="form.first_name"
                      class="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label for="last_name" class="block text-sm font-medium text-gray-700">Nom</label>
                    <input
                      type="text"
                      id="last_name"
                      v-model="form.last_name"
                      class="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                <div>
                  <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    id="email"
                    v-model="form.email"
                    required
                    class="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                  <div v-if="emailError" class="mt-2 text-sm text-red-600">{{ emailError }}</div>
                </div>

                <div>
                  <label for="username" class="block text-sm font-medium text-gray-700">Nom d'utilisateur</label>
                  <input
                    type="text"
                    id="username"
                    v-model="form.username"
                    required
                    class="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                  <div v-if="usernameError" class="mt-2 text-sm text-red-600">{{ usernameError }}</div>
                </div>

                <div>
                  <label for="company_name" class="block text-sm font-medium text-gray-700">Entreprise</label>
                  <input
                    type="text"
                    id="company_name"
                    v-model="form.company_name"
                    class="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>

                <!-- Quota de stockage (pour les entreprises et les salaries) -->
                <div v-if="form.role === 'ENTREPRISE' || form.role === 'SALARIE'">
                  <label for="storage_quota" class="block text-sm font-medium text-gray-700">Quota de stockage (MB)</label>
                  <div class="flex items-center">
                    <input
                      type="number"
                      id="storage_quota"
                      v-model="form.storage_quota"
                      min="1"
                      class="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                    <span class="ml-2 text-sm text-gray-500">MB</span>
                  </div>
                  <p class="mt-1 text-sm text-gray-500">Espace de stockage maximum pour les photos des notes</p>
                </div>

                <!-- Configuration API (uniquement pour les entreprises) -->
                <div v-if="form.role === 'ENTREPRISE'" class="border-t pt-4 mt-4">
                  <h3 class="text-lg font-medium text-gray-900 mb-4">Configuration API</h3>

                  <!-- Clé API Ecowitt -->
                  <div class="mb-4">
                    <label for="ecowitt_api_key" class="block text-sm font-medium text-gray-700">Clé API Ecowitt</label>
                    <input
                      type="text"
                      id="ecowitt_api_key"
                      v-model="form.ecowitt_api_key"
                      class="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      placeholder="Entrez la clé API Ecowitt"
                    />
                    <p class="mt-1 text-sm text-gray-500">Clé API pour accéder aux services météo Ecowitt</p>
                  </div>

                  <!-- Clé d'application Ecowitt -->
                  <div class="mb-4">
                    <label for="ecowitt_application_key" class="block text-sm font-medium text-gray-700">Clé d'application Ecowitt</label>
                    <input
                      type="text"
                      id="ecowitt_application_key"
                      v-model="form.ecowitt_application_key"
                      class="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      placeholder="Entrez la clé d'application Ecowitt"
                    />
                    <p class="mt-1 text-sm text-gray-500">Clé d'application pour accéder aux services météo Ecowitt</p>
                  </div>
                </div>

                <div v-if="!form.id">
                      <label for="password" class="block text-sm font-medium text-gray-700">Mot de passe</label>
                      <input
                        type="password"
                        id="password"
                        v-model="form.password"
                        required
                        autocomplete="new-password"
                    class="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>

                <div v-if="!form.id">
                      <label for="password_confirm" class="block text-sm font-medium text-gray-700">Confirmer le mot de passe</label>
                      <input
                        type="password"
                        id="password_confirm"
                    v-model="passwordConfirm"
                        required
                        autocomplete="new-password"
                    class="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                  <div v-if="passwordError" class="mt-2 text-sm text-red-600">{{ passwordError }}</div>
                </div>

                <div class="flex justify-end space-x-3">
                  <button
                    type="button"
                    @click="$emit('close')"
                    class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    :disabled="loading"
                    class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <span v-if="loading" class="mr-2">
                      <!-- Spinner -->
                      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </span>
                    {{ form.id ? 'Enregistrer' : 'Créer' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, reactive, type PropType, watchEffect, onMounted } from 'vue'

// Types
interface User {
  id?: number
  first_name?: string
  last_name?: string
  username: string
  email: string
  password?: string
  company_name?: string
  role?: string
  salarie?: number | UserReference | null
  salarie_id?: number | null
  entreprise?: number | UserReference | null
  entreprise_id?: number | null
  is_active?: boolean
  storage_quota?: number
  storage_used?: number
  ecowitt_api_key?: string
  ecowitt_application_key?: string
}

interface UserReference {
  id: number
  first_name: string
  last_name: string
  username: string
  company_name?: string
  role: string
}

// Props du composant
const props = defineProps({
  user: {
    type: Object as PropType<Partial<User> | null>,
    default: () => ({})
  },
  salaries: {
    type: Array as PropType<UserReference[]>,
    default: () => []
  },
  entreprises: {
    type: Array as PropType<UserReference[]>,
    default: () => []
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  isEntreprise: {
    type: Boolean,
    default: false
  },
  currentSalarie: {
    type: String,
    default: undefined
  },
  currentEntreprise: {
    type: String,
    default: undefined
  },
  // Ajout d'une prop pour recevoir les erreurs API du parent
  apiErrors: {
    type: Array as PropType<{field: string, message: string}[]>,
    default: () => []
  },
  // Ajout d'une prop pour forcer le rafraîchissement des données
  refreshKey: {
    type: Number,
    default: 0
  }
})

// Emits
const emit = defineEmits(['close', 'save', 'refresh'])

// État du composant
const loading = ref(false)
const emailError = ref('')
const usernameError = ref('')
const passwordError = ref('')
const globalError = ref('')
const passwordConfirm = ref('')

// Formulaire
const form = reactive({
  id: undefined as number | undefined,
  first_name: '',
  last_name: '',
  username: '',
  email: '',
  password: '',
  company_name: '',
  role: props.isEntreprise ? 'SALARIE' : (props.isAdmin ? 'ADMIN' : 'VISITEUR'),
  salarie: null as number | null,
  entreprise: null as number | null,
  is_active: true,
  storage_quota: 50, // 50 MB par défaut
  storage_used: 0,
  ecowitt_api_key: '',
  ecowitt_application_key: ''
})

// Initialiser le formulaire avec les valeurs de l'utilisateur existant
onMounted(() => {
  if (props.user?.id) {
    form.id = props.user.id
    form.first_name = props.user.first_name || ''
    form.last_name = props.user.last_name || ''
    form.username = props.user.username || ''
    form.email = props.user.email || ''
    form.company_name = props.user.company_name || ''
    form.role = props.user.role || 'VISITEUR'
    form.is_active = props.user.is_active ?? true
    form.ecowitt_api_key = props.user.ecowitt_api_key || ''
    form.ecowitt_application_key = props.user.ecowitt_application_key || ''
    form.storage_quota = props.user.storage_quota || 50
    form.storage_used = props.user.storage_used || 0

    // Gérer les relations
    if (props.user.salarie) {
      if (typeof props.user.salarie === 'object') {
    form.salarie = props.user.salarie.id
      } else {
        form.salarie = props.user.salarie
      }
    } else if (props.user.salarie_id) {
      form.salarie = props.user.salarie_id
    } else if (props.currentSalarie) {
      form.salarie = parseInt(props.currentSalarie)
    }

    if (props.user.entreprise) {
      if (typeof props.user.entreprise === 'object') {
    form.entreprise = props.user.entreprise.id
      } else {
        form.entreprise = props.user.entreprise
      }
    } else if (props.user.entreprise_id) {
      form.entreprise = props.user.entreprise_id
    } else if (props.currentEntreprise) {
      form.entreprise = parseInt(props.currentEntreprise)
    }
  } else {
    // Pour un nouvel utilisateur, définir des valeurs par défaut
    if (props.currentSalarie) {
      form.salarie = parseInt(props.currentSalarie)
    }
    if (props.currentEntreprise) {
      form.entreprise = parseInt(props.currentEntreprise)
    }
    // Si l'utilisateur est une entreprise, le rôle par défaut est salarie
    if (props.isEntreprise) {
      form.role = 'SALARIE'
    }
    // Si l'utilisateur est un salarie, le rôle par défaut est visiteur
    else if (!props.isAdmin) {
      form.role = 'VISITEUR'
    }
  }
})

// Surveiller les changements de rôle pour réinitialiser les relations
watchEffect(() => {
  if (form.role === 'ADMIN' || form.role === 'ENTREPRISE') {
    form.salarie = null
    form.entreprise = null
  } else if (form.role === 'SALARIE') {
    form.salarie = null
    // Si l'utilisateur est une entreprise, définir automatiquement l'entreprise
    if (props.isEntreprise && props.currentEntreprise) {
      form.entreprise = parseInt(props.currentEntreprise)
    }
  }
})

// Observer les changements dans les erreurs API et les afficher
watchEffect(() => {
  // Réinitialiser les erreurs locales
  emailError.value = ''
  usernameError.value = ''
  passwordError.value = ''
  globalError.value = ''

  // Traiter les erreurs API reçues du parent
  if (props.apiErrors && props.apiErrors.length > 0) {
    props.apiErrors.forEach(err => {
      switch (err.field) {
        case 'email':
          emailError.value = err.message;
          break;
        case 'username':
          usernameError.value = err.message;
          break;
        case 'password':
          passwordError.value = err.message;
          break;
        case 'non_field_error':
        default:
          globalError.value = err.message;
          break;
      }
    });
  }
})

// Valider et envoyer le formulaire
async function saveUser() {
  // Réinitialiser les erreurs
  emailError.value = ''
  usernameError.value = ''
  passwordError.value = ''
  globalError.value = ''

  // Valider le formulaire
  let isValid = true

  // Valider les mots de passe pour un nouvel utilisateur
  if (!form.id) {
    if (form.password !== passwordConfirm.value) {
      passwordError.value = 'Les mots de passe ne correspondent pas'
      isValid = false
    } else if (form.password.length < 8) {
      passwordError.value = 'Le mot de passe doit contenir au moins 8 caractères'
      isValid = false
    }
  }

  if (!isValid) return

  loading.value = true

  try {
    // Préparer les données à envoyer
    const userData: Record<string, any> = { ...form }

    // Si c'est une mise à jour, ne pas envoyer le mot de passe
    if (form.id) {
      delete userData.password
    }

    // Si le rôle est défini par le contexte, s'assurer qu'il est correct
    if (props.isEntreprise && ['SALARIE', 'VISITEUR'].includes(form.role)) {
      userData.entreprise_id = props.currentEntreprise ? parseInt(props.currentEntreprise) : undefined
    }

    // Transformer salarie en salarie_id
    if (userData.salarie) {
      userData.salarie_id = userData.salarie
      delete userData.salarie
    }

    if (props.currentSalarie && form.role === 'VISITEUR') {
      userData.salarie_id = parseInt(props.currentSalarie)
    }

    await emit('save', userData)
    // Émettre un événement de rafraîchissement après la sauvegarde
    emit('refresh')

  } catch (error: any) {
    console.error('Erreur locale:', error);
  } finally {
    loading.value = false
  }
}
</script>