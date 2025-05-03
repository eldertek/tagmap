<template>
  <div class="h-full bg-gray-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-extrabold text-gray-900">
          <span v-if="isAdmin">Gestion des utilisateurs</span>
          <span v-else-if="isEntreprise">Gestion des salaries et visiteurs</span>
          <span v-else-if="isSalarie">Gestion des visiteurs</span>
        </h1>
        <button
          @click="openCreateUserModal"
          class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <svg class="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
          </svg>
          <span v-if="isAdmin">Nouvel utilisateur</span>
          <span v-else-if="isEntreprise">Nouveau salarie/visiteur</span>
          <span v-else-if="isSalarie">Nouvel visiteur</span>
        </button>
      </div>
      <!-- Filtres -->
      <div class="bg-white shadow rounded-lg mb-6 p-4">
        <div class="space-y-4">
          <!-- Première ligne : Rôle, Entreprise, Salarie -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Filtre de rôle uniquement pour les admins et entreprises -->
            <div v-if="isAdmin || isEntreprise">
              <label for="role-filter" class="block text-sm font-medium text-gray-700">Rôle</label>
              <select
                id="role-filter"
                v-model="filters.role"
                class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              >
                <option value="">Tous les rôles</option>
                <option value="ADMIN" v-if="isAdmin">Administrateur</option>
                <option value="ENTREPRISE" v-if="isAdmin">Entreprise</option>
                <option value="SALARIE">Salarie</option>
                <option value="VISITEUR">Visiteur</option>
              </select>
            </div>
            <!-- Filtre d'entreprise uniquement pour les admins -->
            <div v-if="isAdmin">
              <label for="entreprise-filter" class="block text-sm font-medium text-gray-700">Entreprise</label>
              <select
                id="entreprise-filter"
                v-model="filters.entreprise"
                class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              >
                <option value="">Toutes les entreprises</option>
                <option v-for="entreprise in entreprises" :key="entreprise.id" :value="entreprise.id">
                  {{ formatUserName(entreprise) }}
                </option>
              </select>
            </div>
            <!-- Filtre de salarie uniquement pour les admins et entreprises -->
            <div v-if="isAdmin || isEntreprise">
              <label for="salarie-filter" class="block text-sm font-medium text-gray-700">Salarie</label>
              <select
                id="salarie-filter"
                v-model="filters.salarie"
                class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              >
                <option value="">Tous les salaries</option>
                <option v-for="salarie in availableSalaries" :key="salarie.id" :value="salarie.id">
                  {{ formatUserName(salarie) }}
                </option>
              </select>
            </div>
          </div>
          <!-- Deuxième ligne : Recherche -->
          <div class="w-full">
            <label for="search" class="block text-sm font-medium text-gray-700">Recherche</label>
            <input
              type="text"
              id="search"
              v-model="filters.search"
              placeholder="Rechercher par nom, email, entreprise..."
              class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>
        </div>
      </div>
      <!-- Liste des utilisateurs -->
      <div class="bg-white shadow rounded-lg">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rôle
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th v-if="isAdmin || isEntreprise" scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entreprise
                </th>
                <th v-if="isAdmin || isEntreprise" scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Salarie
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th scope="col" class="relative px-6 py-3">
                  <span class="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-if="loading" class="animate-pulse">
                <td colspan="7" class="py-4 px-6">
                  <div class="h-4 bg-gray-200 rounded w-3/4"></div>
                </td>
              </tr>
              <tr v-else-if="filteredUsers.length === 0">
                <td colspan="7" class="py-4 px-6 text-center text-gray-500">
                  Aucun utilisateur trouvé
                </td>
              </tr>
              <tr v-for="user in filteredUsers" :key="user.id">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="flex-shrink-0 h-10 w-10">
                      <div class="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <span class="text-primary-600 font-medium">
                          {{ getInitials(user.first_name, user.last_name) }}
                        </span>
                      </div>
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-medium text-gray-900">
                        {{ formatUserName(user) }}
                      </div>
                      <div class="text-sm text-gray-500">{{ user.username }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="getRoleBadgeClass()">
                    {{ getRoleLabel(user.role) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ user.email }}
                </td>
                <td v-if="isAdmin || isEntreprise" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <template v-if="user.role === 'ENTREPRISE'">
                    -
                  </template>
                  <template v-else-if="user.role === 'SALARIE'">
                    {{ user.entreprise ? formatUserName(user.entreprise) : 'Non assigné' }}
                  </template>
                  <template v-else-if="user.role === 'VISITEUR'">
                    {{ user.salarie?.entreprise ? formatUserName(user.salarie.entreprise) : 'Non assigné' }}
                  </template>
                  <template v-else>
                    -
                  </template>
                </td>
                <td v-if="isAdmin || isEntreprise" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <template v-if="user.role === 'ENTREPRISE' || user.role === 'ADMIN'">
                    -
                  </template>
                  <template v-else-if="user.role === 'SALARIE'">
                    -
                  </template>
                  <template v-else>
                    {{ user.salarie ? formatUserName(user.salarie) : 'Non assigné' }}
                  </template>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="getStatusBadgeClass(user.is_active)">
                    {{ user.is_active ? 'Actif' : 'Inactif' }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    @click="editUser(user)"
                    class="text-primary-600 hover:text-primary-900 mr-4"
                  >
                    Modifier
                  </button>
                  <button
                    v-if="canDeleteUser(user)"
                    @click="confirmDeleteUser(user)"
                    class="text-red-600 hover:text-red-900"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <!-- Modal de création/édition d'utilisateur -->
    <div v-if="showUserModal" class="fixed inset-0 z-[3001] overflow-y-auto">
      <UserFormModal
        :user="selectedUser"
        :salaries="salaries"
        :entreprises="entreprises"
        :is-admin="isAdmin"
        :is-entreprise="isEntreprise"
        :current-salarie="isSalarie ? authStore.user?.id?.toString() : undefined"
        :current-entreprise="isEntreprise ? authStore.user?.id?.toString() : undefined"
        :api-errors="apiErrors"
        @close="closeUserModal"
        @save="saveUser"
      />
    </div>
    <!-- Modal de confirmation de suppression -->
    <ConfirmationModal
      v-if="showDeleteModal"
      :title="'Supprimer l\'utilisateur'"
      :message="'Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.'"
      @confirm="deleteUser"
      @cancel="showDeleteModal = false"
    />
  </div>
</template>
<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useAuthStore, formatUserName, getInitials, getRoleBadgeClass, getRoleLabel, getStatusBadgeClass } from '@/stores/auth'
import { fetchUsersByHierarchy, formatApiErrors } from '@/services/api'
import { useNotificationStore } from '@/stores/notification'
import UserFormModal from '@/components/UserFormModal.vue'
import ConfirmationModal from '@/components/ConfirmationModal.vue'

const authStore = useAuthStore()
const notificationStore = useNotificationStore()

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  salarie_id?: number;
  company_name?: string;
  is_active: boolean;
  entreprise?: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    company_name?: string;
    role: string;
    display_name: string;
  };
  salarie?: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    company_name?: string;
    role: string;
    display_name: string;
    entreprise?: {
      id: number;
      username: string;
      first_name: string;
      last_name: string;
      company_name?: string;
      role: string;
      display_name: string;
    };
  };
}

interface UserReference {
  id: number;
  first_name: string;
  last_name: string;
  company_name?: string;
  username: string;
  role: string;
  display_name?: string;
}

const users = ref<User[]>([])
const salaries = ref<UserReference[]>([])
const entreprises = ref<UserReference[]>([])
const showUserModal = ref(false)
const showDeleteModal = ref(false)
const selectedUser = ref<User | null>(null)
const userToDelete = ref<User | null>(null)
const loading = ref(true)
const apiErrors = ref<{field: string, message: string}[]>([])

const filters = reactive({
  role: '',
  search: '',
  salarie: '',
  entreprise: ''
})

const isAdmin = computed(() => authStore.isAdmin)
const isEntreprise = computed(() => authStore.isEntreprise)
const isSalarie = computed(() => authStore.isSalarie)

const availableSalaries = computed(() => {
  if (isAdmin.value) {
    return users.value.filter(user => user.role === 'SALARIE')
  } else if (isEntreprise.value) {
    // Pour une entreprise, uniquement ses propres salaries
    return users.value.filter(user =>
      user.role === 'SALARIE' &&
      user.entreprise?.id === authStore.user?.id
    )
  }
  return []
})

// Filtrage des utilisateurs adapté au rôle
const filteredUsers = computed(() => {
  let filtered = users.value

  // Si c'est une entreprise, ne montrer que ses salaries et les visiteurs associés
  if (isEntreprise.value) {
    filtered = filtered.filter(user => {
      if (user.role === 'SALARIE') {
        return user.entreprise?.id === authStore.user?.id
      } else if (user.role === 'VISITEUR') {
        return user.salarie?.entreprise?.id === authStore.user?.id
      }
      return false
    })
  }

  // Si c'est un salarie, ne montrer que ses visiteurs
  if (isSalarie.value) {
    filtered = filtered.filter(user =>
      user.role === 'VISITEUR' &&
      (user.salarie_id === authStore.user?.id ||
       (user.salarie && user.salarie.id === authStore.user?.id))
    )
  }

  // Pour les admins et entreprises, appliquer les filtres
  if (isAdmin.value || isEntreprise.value) {
    if (filters.role) {
      filtered = filtered.filter(user => user.role === filters.role)
    }

    if (filters.salarie) {
      filtered = filtered.filter(user => {
        const salarieId = user.salarie?.id || user.salarie_id;
        return salarieId?.toString() === filters.salarie.toString()
      })
    }

    if (filters.entreprise && isAdmin.value) {
      filtered = filtered.filter(user => {
        if (user.role === 'SALARIE') {
          return user.entreprise?.id?.toString() === filters.entreprise.toString()
        } else if (user.role === 'VISITEUR') {
          return user.salarie?.entreprise?.id?.toString() === filters.entreprise.toString()
        }
        return false
      })
    }
  }

  // Filtre de recherche commun
  if (filters.search) {
    const search = filters.search.toLowerCase()
    filtered = filtered.filter(user =>
      user.username?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search) ||
      user.first_name?.toLowerCase().includes(search) ||
      user.last_name?.toLowerCase().includes(search) ||
      (user.company_name && user.company_name.toLowerCase().includes(search))
    )
  }

  return filtered
})

// Chargement initial des données
onMounted(async () => {
  await fetchUsers()
  await fetchDependencies()
})

// Récupération des utilisateurs en utilisant la fonction centralisée
async function fetchUsers() {
  loading.value = true
  try {
    if (isAdmin.value) {
      users.value = await authStore.fetchUsers()
    } else if (isEntreprise.value) {
      // Pour une entreprise, récupérer ses salaries et tous les visiteurs liés
      const [salariesResult, visiteursResult] = await Promise.all([
        fetchUsersByHierarchy({
          role: 'SALARIE',
          entrepriseId: authStore.user?.id
        }),
        fetchUsersByHierarchy({
          role: 'VISITEUR',
          entrepriseId: authStore.user?.id
        })
      ])
      users.value = [...salariesResult, ...visiteursResult]
    } else if (isSalarie.value) {
      // Pour un salarie, récupérer seulement ses visiteurs
      users.value = await fetchUsersByHierarchy({
        role: 'VISITEUR',
        salarieId: authStore.user?.id,
        includeDetails: true
      })
      console.log('Visiteurs récupérés:', users.value)
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error)
    notificationStore.error('Erreur lors de la récupération des utilisateurs')
  } finally {
    loading.value = false
  }
}

// Récupération des données dépendantes
async function fetchDependencies() {
  try {
    if (isAdmin.value) {
      await Promise.all([
        fetchAllSalaries(),
        fetchAllEntreprises()
      ])
    } else if (isEntreprise.value) {
      await fetchEntrepriseSalaries()
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des dépendances:', error)
  }
}

// Récupération des salaries selon le rôle
async function fetchAllSalaries() {
  try {
    if (isAdmin.value) {
      salaries.value = await authStore.fetchUsersByRole({ role: 'SALARIE' })
    } else if (isEntreprise.value) {
      salaries.value = await authStore.fetchEntrepriseSalaries(authStore.user?.id!)
    } else if (isSalarie.value) {
      // Si c'est un salarie, ajouter soi-même à la liste pour pouvoir s'auto-associer des visiteurs
      if (authStore.user) {
        salaries.value = [{
          id: authStore.user.id,
          first_name: authStore.user.first_name,
          last_name: authStore.user.last_name,
          username: authStore.user.username,
          role: 'SALARIE',
          company_name: authStore.user.company_name
        }]
      }
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des salaries:', error)
  }
}

// Récupération spécifique des salaries d'une entreprise
async function fetchEntrepriseSalaries() {
  if (!isEntreprise.value || !authStore.user?.id) return

  try {
    salaries.value = await authStore.fetchEntrepriseSalaries(authStore.user?.id)
  } catch (error) {
    console.error('Erreur lors de la récupération des salaries de l\'entreprise:', error)
  }
}

// Récupération des entreprises
async function fetchAllEntreprises() {
  try {
    entreprises.value = await authStore.fetchEnterprises()
  } catch (error) {
    console.error('Erreur lors de la récupération des entreprises:', error)
  }
}

// Gestion des modals
function openCreateUserModal() {
  selectedUser.value = null
  showUserModal.value = true
}

function editUser(user: User) {
  selectedUser.value = { ...user }
  showUserModal.value = true
}

function closeUserModal() {
  showUserModal.value = false
  selectedUser.value = null
  apiErrors.value = []
}

// Création ou mise à jour d'un utilisateur
async function saveUser(userData: any) {
  // Réinitialiser les erreurs d'API
  apiErrors.value = []

  const isUpdate = Boolean(userData.id)
  try {
    // Mise à jour de la logique pour gérer correctement les relations
    const payload = { ...userData }

    // Logique différente selon le rôle actuel
    if (isAdmin.value) {
      // Admin peut créer tous types d'utilisateurs
      if (payload.entreprise && typeof payload.entreprise === 'object') {
        payload.entreprise_id = payload.entreprise.id
      } else if (typeof payload.entreprise === 'number') {
        payload.entreprise_id = payload.entreprise
      }

      if (payload.salarie && typeof payload.salarie === 'object') {
        payload.salarie_id = payload.salarie.id
      } else if (typeof payload.salarie === 'number') {
        payload.salarie_id = payload.salarie
      }
    } else if (isEntreprise.value) {
      // Entreprise peut créer des salaries ou visiteurs
      payload.entreprise_id = authStore.user?.id
      if (payload.role === 'VISITEUR') {
        if (payload.salarie && typeof payload.salarie === 'object') {
          payload.salarie_id = payload.salarie.id
        } else if (typeof payload.salarie === 'number') {
          payload.salarie_id = payload.salarie
        }
      }
    } else if (isSalarie.value) {
      // Si un salarie crée un utilisateur, c'est forcément un visiteur
      payload.role = 'VISITEUR'
      payload.salarie_id = authStore.user?.id
    }

    // Gérer les relations
    if (payload.role === 'SALARIE') {
      // S'assurer que l'entreprise est correctement définie
      if (payload.entreprise?.id) {
        payload.entreprise_id = payload.entreprise.id
        delete payload.entreprise
      } else if (typeof payload.entreprise === 'number') {
        payload.entreprise_id = payload.entreprise
        delete payload.entreprise
      }
      delete payload.salarie
    } else if (payload.role === 'VISITEUR') {
      // S'assurer que le salarie est correctement défini
      if (payload.salarie?.id) {
        payload.salarie_id = payload.salarie.id
        delete payload.salarie
      } else if (typeof payload.salarie === 'number') {
        payload.salarie_id = payload.salarie
        delete payload.salarie
      }
      delete payload.entreprise
      delete payload.entreprise_id
    }

    if (isUpdate) {
      await authStore.updateUser(userData.id, payload)
      notificationStore.success('Utilisateur modifié avec succès')
    } else {
      await authStore.createUser(payload)
      notificationStore.success('Utilisateur créé avec succès')
    }

    // Recharger les données après une modification
    await Promise.all([
      fetchUsers(),
      fetchDependencies()
    ])

    closeUserModal()
  } catch (error: any) {
    console.error('Error saving user:', error.response?.data || error)

    // Formater et stocker les erreurs d'API pour le modal
    apiErrors.value = formatApiErrors(error)

    // Afficher également une notification d'erreur
    notificationStore.error('Erreur lors de la sauvegarde de l\'utilisateur')

    // Générer un message d'erreur pour l'exception
    const errorData = error.response?.data || {}
    let errorMessage = ''
    if (typeof errorData === 'object') {
      errorMessage = Object.entries(errorData)
        .map(([field, messages]: [string, any]) => {
          if (Array.isArray(messages)) {
            return `${field}: ${messages[0]}`
          }
          return `${field}: ${messages}`
        })
        .filter(message => message)
        .join('\n')
    }
    if (!errorMessage) {
      errorMessage = 'Une erreur est survenue lors de la sauvegarde'
    }
    throw new Error(errorMessage)
  }
}

// Suppression d'utilisateur
function confirmDeleteUser(user: User) {
  userToDelete.value = user
  showDeleteModal.value = true
}

async function deleteUser() {
  if (!userToDelete.value) return
  try {
    await authStore.deleteUser(userToDelete.value.id)
    notificationStore.success('Utilisateur supprimé avec succès')

    // Recharger les données après une suppression
    await Promise.all([
      fetchUsers(),
      fetchDependencies()
    ])

    showDeleteModal.value = false
    userToDelete.value = null
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'utilisateur:', error)
    notificationStore.error('Erreur lors de la suppression de l\'utilisateur')
    throw error
  }
}

// Vérification des permissions
function canDeleteUser(user: User): boolean {
  // Un admin peut tout supprimer
  if (isAdmin.value) return true;

  // Une entreprise peut supprimer ses salaries et leurs visiteurs
  if (isEntreprise.value) {
    if (user.role === 'SALARIE') {
      return user.entreprise?.id === authStore.user?.id;
    }
    if (user.role === 'VISITEUR') {
      return user.salarie?.entreprise?.id === authStore.user?.id;
    }
    return false;
  }

  // Un salarie peut supprimer ses visiteurs
  if (isSalarie.value) {
    return user.role === 'VISITEUR' &&
           (user.salarie_id === authStore.user?.id ||
            user.salarie?.id === authStore.user?.id);
  }

  return false;
}
</script>