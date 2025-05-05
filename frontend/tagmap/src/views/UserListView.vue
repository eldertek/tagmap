<template>
  <div class="min-h-full bg-gray-50">
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
}

  return false;
}
</script>