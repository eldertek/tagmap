<template>
  <div class="h-full bg-gray-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="sm:flex sm:items-center">
        <div class="sm:flex-auto">
          <h1 class="text-2xl font-semibold text-gray-900">{{ plansList.title }}</h1>
          <p class="mt-2 text-sm text-gray-700">
            {{ plansList.description }}
          </p>
        </div>
        <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            @click="openNewPlanModal"
            class="inline-flex items-center justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:w-auto"
          >
            Nouveau plan
          </button>
        </div>
      </div>
      <!-- Interface Admin -->
      <div v-if="authStore.isAdmin" class="mt-8">
        <!-- Sélection de l'entreprise -->
        <div class="mb-6">
          <label for="entreprise-filter" class="block text-sm font-medium text-gray-700">Filtrer par entreprise</label>
          <select
            id="entreprise-filter"
            v-model="selectedEntreprise"
            class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
          >
            <option :value="null">Toutes les entreprises</option>
            <option v-for="entreprise in entreprises" :key="entreprise.id" :value="entreprise.id">
              {{ formatUserDisplay(entreprise) }}
            </option>
          </select>
        </div>
        <!-- Sélection du salarie -->
        <div class="mb-6">
          <label for="salarie-filter" class="block text-sm font-medium text-gray-700">Filtrer par salarie</label>
          <select
            id="salarie-filter"
            v-model="selectedSalarie"
            class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
          >
            <option :value="null">{{ filteredSalaries.length ? 'Tous les salaries' : 'Aucun salarie disponible' }}</option>
            <option v-for="salarie in filteredSalaries" :key="salarie.id" :value="salarie.id">
              {{ formatUserDisplay(salarie) }}
            </option>
          </select>
        </div>
        <!-- Sélection de l'visiteur si un salarie est sélectionné -->
        <div v-if="selectedSalarie" class="mb-6">
          <label for="visiteur-filter" class="block text-sm font-medium text-gray-700">Filtrer par visiteur</label>
          <select
            id="visiteur-filter"
            v-model="selectedClient"
            class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
          >
            <option :value="null">{{ filteredClients.length ? 'Tous les visiteurs' : 'Aucun visiteur disponible' }}</option>
            <option v-for="client in filteredClients" :key="client.id" :value="client.id">
              {{ formatUserDisplay(client) }}
            </option>
          </select>
        </div>
      </div>
      <!-- Interface Salarie -->
      <div v-else-if="authStore.isSalarie" class="mt-8">
        <div class="mb-6">
          <label for="visiteur-filter" class="block text-sm font-medium text-gray-700">Filtrer par visiteur</label>
          <select
            id="visiteur-filter"
            v-model="selectedClient"
            class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
          >
            <option :value="null">Tous les visiteurs</option>
            <option v-for="client in clients" :key="client.id" :value="client.id">
              {{ formatUserDisplay(client) }}
            </option>
          </select>
        </div>
      </div>
      <!-- Liste des plans -->
      <div class="mt-8">
        <div class="overflow-hidden shadow-sm ring-1 ring-black ring-opacity-5 rounded-lg">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-300">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 lg:pl-8">
                    <button 
                      @click="toggleSort('nom')" 
                      class="group inline-flex items-center"
                    >
                      Nom
                      <span class="ml-2 flex-none rounded">
                        <svg 
                          class="h-5 w-5" 
                          :class="{
                            'text-gray-900': sortField === 'nom',
                            'text-gray-400': sortField !== 'nom',
                            'rotate-180': sortField === 'nom' && sortDirection === 'asc'
                          }"
                          viewBox="0 0 20 20" 
                          fill="currentColor"
                        >
                          <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                        </svg>
                      </span>
                    </button>
                  </th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Description
                  </th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Entreprise
                  </th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Salarie
                  </th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Visiteur
                  </th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    <button 
                      @click="toggleSort('date_modification')" 
                      class="group inline-flex items-center"
                    >
                      Dernière modification
                      <span class="ml-2 flex-none rounded">
                        <svg 
                          class="h-5 w-5" 
                          :class="{
                            'text-gray-900': sortField === 'date_modification',
                            'text-gray-400': sortField !== 'date_modification',
                            'rotate-180': sortField === 'date_modification' && sortDirection === 'asc'
                          }"
                          viewBox="0 0 20 20" 
                          fill="currentColor"
                        >
                          <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                        </svg>
                      </span>
                    </button>
                  </th>
                  <th scope="col" class="relative py-3.5 pl-3 pr-4 sm:pr-6 lg:pr-8">
                    <span class="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 bg-white">
                <tr v-if="filteredPlans.length === 0">
                  <td colspan="7" class="py-4 px-6 text-center text-gray-500">
                    Aucun plan disponible
                  </td>
                </tr>
                <tr v-for="plan in filteredPlans" :key="plan.id" class="hover:bg-gray-50">
                  <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 lg:pl-8">
                    {{ plan.nom }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {{ plan.description || '-' }}
                  </td>
                  <!-- Entreprise -->
                  <td class="px-3 py-4 text-sm text-gray-900">
                    <div v-if="plan.entreprise && typeof plan.entreprise === 'object'" class="flex items-center">
                      <div class="h-8 w-8 flex-shrink-0">
                        <div class="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                          <span class="text-primary-700 font-medium text-sm">
                            {{ getInitials(plan.entreprise) }}
                          </span>
                        </div>
                      </div>
                      <div class="ml-3">
                        <div class="font-medium">{{ formatUserName(plan.entreprise) }}</div>
                      </div>
                    </div>
                    <div v-else class="text-gray-500">
                      Non assigné
                    </div>
                  </td>
                  <!-- Salarie -->
                  <td class="px-3 py-4 text-sm text-gray-900">
                    <div v-if="plan.salarie && typeof plan.salarie === 'object'" class="flex items-center">
                      <div class="h-8 w-8 flex-shrink-0">
                        <div class="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                          <span class="text-primary-700 font-medium text-sm">
                            {{ getInitials(plan.salarie) }}
                          </span>
                        </div>
                      </div>
                      <div class="ml-3">
                        <div class="font-medium">{{ formatUserName(plan.salarie) }}</div>
                      </div>
                    </div>
                    <div v-else class="text-gray-500">
                      Non assigné
                    </div>
                  </td>
                  <!-- Visiteur -->
                  <td class="px-3 py-4 text-sm text-gray-900">
                    <div v-if="plan.visiteur && typeof plan.visiteur === 'object'" class="flex items-center">
                      <div class="h-8 w-8 flex-shrink-0">
                        <div class="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                          <span class="text-primary-700 font-medium text-sm">
                            {{ getInitials(plan.visiteur) }}
                          </span>
                        </div>
                      </div>
                      <div class="ml-3">
                        <div class="font-medium">{{ formatUserName(plan.visiteur) }}</div>
                      </div>
                    </div>
                    <div v-else class="text-gray-500">
                      Non assigné
                    </div>
                  </td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {{ formatDate(plan.date_modification) }}
                  </td>
                  <td class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 lg:pr-8">
                    <button
                      @click="editPlan(plan)"
                      class="text-primary-600 hover:text-primary-900 mr-4"
                    >
                      Ouvrir
                    </button>
                    <button
                      @click="openEditPlanModal(plan)"
                      class="text-primary-600 hover:text-primary-900 mr-4"
                    >
                      Modifier
                    </button>
                    <button
                      v-if="canDeletePlan(plan)"
                      @click="deletePlan(plan)"
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
      <!-- Modal nouveau plan -->
      <NewPlanModal
        v-model="showNewPlanModal"
        :salaries="salaries"
        :clients="clients"
        @created="onPlanCreated"
      />
      <!-- Modal Modification Plan -->
      <div v-if="showEditPlanModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000]">
        <div class="bg-white rounded-lg p-6 max-w-md w-full">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold text-gray-900">Modifier le plan</h2>
            <button
              @click="showEditPlanModal = false"
              class="text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <form @submit.prevent="updatePlan" class="space-y-4">
            <div>
              <label for="edit-nom" class="block text-sm font-medium text-gray-700">
                Nom
              </label>
              <input
                type="text"
                id="edit-nom"
                v-model="editPlanData.nom"
                :disabled="loading"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                required
              />
            </div>
            <div>
              <label for="edit-description" class="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="edit-description"
                v-model="editPlanData.description"
                :disabled="loading"
                rows="3"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              ></textarea>
            </div>
            <!-- Assignation entreprise/salarie/visiteur (admin et entreprise) -->
            <div v-if="authStore.isAdmin || authStore.user?.user_type === 'entreprise'" class="space-y-4">
              <!-- Section entreprise (admin uniquement) -->
              <div v-if="authStore.isAdmin">
                <label for="edit-entreprise" class="block text-sm font-medium text-gray-700">
                  Entreprise
                </label>
                <select
                  id="edit-entreprise"
                  v-model="editPlanData.entreprise"
                  :disabled="loading"
                  class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option :value="null">Sélectionner une entreprise</option>
                  <option v-for="entreprise in entreprises" :key="entreprise.id" :value="entreprise.id">
                    {{ formatUserDisplay(entreprise) }}
                  </option>
                </select>
              </div>
              <!-- Section salarie -->
              <div>
                <label for="edit-salarie" class="block text-sm font-medium text-gray-700">
                  Salarie
                </label>
                <select
                  id="edit-salarie"
                  v-model="editPlanData.salarie"
                  :disabled="(authStore.isAdmin && !editPlanData.entreprise) || loading"
                  class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option :value="null">Sélectionner un salarie</option>
                  <option v-for="salarie in filteredSalariesForEdit" :key="salarie.id" :value="salarie.id">
                    {{ formatUserDisplay(salarie) }}
                  </option>
                </select>
                <p v-if="authStore.isAdmin && !editPlanData.entreprise" class="mt-1 text-sm text-gray-500">
                  Veuillez d'abord sélectionner une entreprise
                </p>
              </div>
              <!-- Section visiteur -->
              <div>
                <label for="edit-visiteur" class="block text-sm font-medium text-gray-700">
                  Visiteur
                </label>
                <select
                  id="edit-visiteur"
                  v-model="editPlanData.visiteur"
                  :disabled="!editPlanData.salarie || loading"
                  class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option :value="null">Sélectionner un visiteur</option>
                  <option v-for="client in filteredClientsForEdit" :key="client.id" :value="client.id">
                    {{ formatUserDisplay(client) }}
                  </option>
                </select>
                <p v-if="!editPlanData.salarie" class="mt-1 text-sm text-gray-500">
                  Veuillez d'abord sélectionner un salarie
                </p>
              </div>
            </div>
            <div v-if="error" class="mt-4 bg-red-50 p-4 rounded-md">
              <div class="flex">
                <div class="flex-shrink-0">
                  <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div class="ml-3">
                  <p class="text-sm font-medium text-red-800">{{ error }}</p>
                </div>
              </div>
            </div>
            <div class="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3">
              <button
                type="button"
                class="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:mt-0 sm:text-sm"
                @click="showEditPlanModal = false"
              >
                Annuler
              </button>
              <button
                type="submit"
                :disabled="loading"
                class="inline-flex w-full justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:text-sm disabled:opacity-50"
              >
                <svg
                  v-if="loading"
                  class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  ></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                {{ loading ? 'Enregistrement...' : 'Enregistrer' }}
              </button>
            </div>
          </form>
        </div>
      </div>
      <!-- Modal de confirmation de suppression -->
      <ConfirmationModal
        v-if="showDeleteModal"
        title="Supprimer le plan"
        message="Êtes-vous sûr de vouloir supprimer ce plan ? Cette action est irréversible."
        @confirm="confirmDeletePlan"
        @cancel="cancelDeletePlan"
      />
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useIrrigationStore, type UserDetails } from '@/stores/irrigation'
import { useAuthStore, formatUserName } from '@/stores/auth'
import { fetchUsersByHierarchy } from '@/services/api'
import NewPlanModal from '@/components/NewPlanModal.vue'
import ConfirmationModal from '@/components/ConfirmationModal.vue'

interface LocalUser {
  id: number
  username: string
  first_name: string
  last_name: string
  email: string
  company_name?: string
  role: string
  salarie?: number | LocalUser | null
  entreprise?: LocalUser | null
}

interface Entreprise extends LocalUser {
  role: 'ENTREPRISE'
}

interface Salarie extends LocalUser {
  entreprise_id?: number
  role: 'SALARIE'
}

interface ClientWithSalarie extends LocalUser {
  salarie_id?: number
  salarie_ref?: number | LocalUser | null
}

interface LocalPlan {
  id: number
  nom: string
  description: string
  date_creation: string
  date_modification: string
  createur: { 
    id: number
    username: string
    first_name: string
    last_name: string
    email: string
    company_name?: string
    role: string
  }
  entreprise: UserDetails | null
  salarie: UserDetails | null
  visiteur: UserDetails | null
}
const router = useRouter()
const irrigationStore = useIrrigationStore()
const authStore = useAuthStore()
const plans = ref<LocalPlan[]>([])
const salaries = ref<Salarie[]>([])
const entreprises = ref<Entreprise[]>([])
const clients = ref<ClientWithSalarie[]>([])
const showNewPlanModal = ref(false)
const showEditPlanModal = ref(false)
const showDeleteModal = ref(false)
const planToDelete = ref<LocalPlan | null>(null)
const newPlan = ref({
  nom: '',
  description: '',
  client: null as number | null
})
const editPlanData = ref({
  id: 0,
  nom: '',
  description: '',
  entreprise: null as number | null,
  salarie: null as number | null,
  visiteur: null as number | null
})
const loading = ref(false)
const error = ref<string | null>(null)
// Ajout des refs pour la sélection
const selectedSalarie = ref<number | null>(null);
const selectedClient = ref<number | null>(null);
// Ajout des refs pour le tri
const sortField = ref<'nom' | 'date_creation' | 'date_modification'>('date_modification')
const sortDirection = ref<'asc' | 'desc'>('desc')
// Ajout de la ref pour la sélection de l'entreprise
const selectedEntreprise = ref<number | null>(null);
// Computed pour les clients filtrés selon le salarie sélectionné
const filteredClients = computed(() => {
  if (!selectedSalarie.value) return clients.value;
  return clients.value.filter(client => {
    if (typeof client.salarie === 'object' && client.salarie) {
      return client.salarie.id === selectedSalarie.value;
    }
    return client.salarie === selectedSalarie.value || 
           client.salarie_id === selectedSalarie.value;
  });
});
// Computed pour les plans filtrés
const filteredPlans = computed(() => {
  let filtered = plans.value;
if (authStore.isAdmin) {
    if (selectedEntreprise.value) {
      filtered = filtered.filter(plan => {
        if (typeof plan.entreprise === 'object') {
          return plan.entreprise?.id === selectedEntreprise.value;
        }
        return plan.entreprise === selectedEntreprise.value;
      });
    }
    
    if (selectedSalarie.value) {
      filtered = filtered.filter(plan => {
        if (typeof plan.salarie === 'object') {
          return plan.salarie?.id === selectedSalarie.value;
        }
        return plan.salarie === selectedSalarie.value;
      });
      
      if (selectedClient.value) {
        filtered = filtered.filter(plan => {
          if (typeof plan.visiteur === 'object') {
            return plan.visiteur?.id === selectedClient.value;
          }
          return plan.visiteur === selectedClient.value;
        });
      }
    }
  } else if (authStore.isSalarie) {
    filtered = filtered.filter(plan => {
      if (typeof plan.salarie === 'object') {
        return plan.salarie?.id === authStore.user?.id;
      }
      return plan.salarie === authStore.user?.id;
    });
    
    if (selectedClient.value) {
      filtered = filtered.filter(plan => {
        if (typeof plan.visiteur === 'object') {
          return plan.visiteur?.id === selectedClient.value;
        }
        return plan.visiteur === selectedClient.value;
      });
    }
  }
  
  // Appliquer le tri
  const sorted = [...filtered].sort((a, b) => {
    if (sortField.value === 'nom') {
      return sortDirection.value === 'asc' 
        ? a.nom.localeCompare(b.nom)
        : b.nom.localeCompare(a.nom);
    } else {
      const dateA = new Date(a[sortField.value]).getTime();
      const dateB = new Date(b[sortField.value]).getTime();
      return sortDirection.value === 'asc' ? dateA - dateB : dateB - dateA;
    }
  });
return sorted;
});
// Computed properties pour le filtrage des plans
const plansList = computed(() => {
  if (authStore.isAdmin) {
    return {
      title: "Tous les plans",
      description: "Liste complète des plans",
      plans: plans.value
    }
  } else if (authStore.isSalarie) {
    return {
      title: "Plans des visiteurs",
      description: "Plans où vous êtes assigné comme salarie",
      plans: plans.value.filter(plan => {
        if (typeof plan.salarie === 'object') {
          return plan.salarie?.id === authStore.user?.id;
        }
        return plan.salarie === authStore.user?.id;
      })
    }
  } else {
    // Visiteur
    return {
      title: "Mes plans",
      description: "Plans qui vous sont assignés ou que vous avez créés",
      plans: plans.value.filter(plan => {
        const isCreator = plan.createur.id === authStore.user?.id;
        let isVisiteur = false;
        
        if (typeof plan.visiteur === 'object') {
          isVisiteur = plan.visiteur?.id === authStore.user?.id;
        } else {
          isVisiteur = plan.visiteur === authStore.user?.id;
        }
        
        return isVisiteur || isCreator;
      })
    }
  }
})

// Computed pour filtrer les salaries selon l'entreprise sélectionnée dans le dropdown
const filteredSalaries = computed(() => {
  if (!selectedEntreprise.value) return salaries.value;
  
  return salaries.value.filter(salarie => {
    if (typeof salarie.entreprise === 'object') {
      return salarie.entreprise?.id === selectedEntreprise.value;
    }
    return salarie.entreprise_id === selectedEntreprise.value;
  });
});

// Computed pour filtrer les salaries dans le modal d'édition
const filteredSalariesForEdit = computed(() => {
  if (!editPlanData.value.entreprise) return [];
  
  return salaries.value.filter(salarie => {
    if (typeof salarie.entreprise === 'object') {
      return salarie.entreprise?.id === editPlanData.value.entreprise;
    }
    return salarie.entreprise_id === editPlanData.value.entreprise;
  });
});

// Computed pour filtrer les clients selon le salarie sélectionné pour l'édition
const filteredClientsForEdit = computed(() => {
  if (!editPlanData.value.entreprise || !editPlanData.value.salarie) {
    return [];
  }
  
  return clients.value.filter(client => {
    if (typeof client.salarie === 'object' && client.salarie) {
      return client.salarie.id === editPlanData.value.salarie;
    }
    return client.salarie === editPlanData.value.salarie || 
           client.salarie_id === editPlanData.value.salarie;
  });
});

onMounted(async () => {
  await loadPlans()
  if (authStore.isAdmin) {
    await loadAllEntreprises()
  } else if (authStore.isSalarie) {
    // Charger les visiteurs du salarie
    await loadVisiteurs(authStore.user?.id || 0)
  }
})

async function loadPlans() {
  try {
    const response = await irrigationStore.fetchPlansWithDetails()
    plans.value = response.data
  } catch (error) {
    console.error('Erreur lors du chargement des plans:', error)
  }
}

// Utilisation des fonctions centralisées pour charger les entreprises
async function loadAllEntreprises() {
  try {
entreprises.value = await authStore.fetchEnterprises() as unknown as Entreprise[];
} catch (error) {
    console.error('Erreur lors du chargement des entreprises:', error);
  }
}

// Utilisation des fonctions centralisées pour charger les salaries par entreprise
async function loadSalaries(entrepriseId?: number) {
  try {
// Utiliser fetchUsersByRole quand entrepriseId est undefined
    if (entrepriseId === undefined) {
      const result = await authStore.fetchUsersByRole({ role: 'SALARIE' });
      salaries.value = result as unknown as Salarie[];
    } else {
      salaries.value = await authStore.fetchEntrepriseSalaries(entrepriseId) as unknown as Salarie[];
    }
} catch (error) {
    console.error('Erreur lors du chargement des salaries:', error);
  }
}

// Utilisation des fonctions centralisées pour charger les visiteurs par salarie
async function loadVisiteurs(salarieId: number) {
  try {
const result = await fetchUsersByHierarchy({
      role: 'VISITEUR',
      salarieId
    });
    clients.value = result.map((visiteur: any) => ({
      ...visiteur,
      salarie_id: salarieId
    }));
} catch (error) {
    console.error('Erreur lors du chargement des visiteurs:', error);
  }
}

function openNewPlanModal() {
  showNewPlanModal.value = true
  newPlan.value = {
    nom: '',
    description: '',
    client: null
  }
}

async function editPlan(plan: LocalPlan) {
  try {
irrigationStore.setCurrentPlan(plan);
localStorage.setItem('lastPlanId', plan.id.toString());
await router.push('/');
} catch (error) {
    console.error('[PlansView][editPlan] ERREUR:', error);
    if (error instanceof Error) {
      console.error('[PlansView][editPlan] Stack trace:', error.stack);
    }
    alert('Une erreur est survenue lors du chargement du plan');
  }
}

async function deletePlan(plan: LocalPlan) {
  if (!plan?.id) return
  planToDelete.value = plan
  showDeleteModal.value = true
}

async function confirmDeletePlan() {
  if (!planToDelete.value?.id) return
  try {
    await irrigationStore.deletePlan(planToDelete.value.id)
    await loadPlans()
    // Si le plan supprimé était le plan courant, le nettoyer
    if (irrigationStore.currentPlan?.id === planToDelete.value.id) {
      irrigationStore.clearCurrentPlan()
    }
  } catch (error) {
    console.error('Erreur lors de la suppression du plan:', error)
    alert('Une erreur est survenue lors de la suppression du plan')
  } finally {
    showDeleteModal.value = false
    planToDelete.value = null
  }
}

function cancelDeletePlan() {
  showDeleteModal.value = false
  planToDelete.value = null
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getInitials(user: UserDetails | LocalUser | null): string {
  if (!user) return '';
  const firstName = user.first_name || '';
  const lastName = user.last_name || '';
  return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
}

async function openEditPlanModal(plan: LocalPlan) {
  loading.value = true;
  error.value = null;
  
  try {
    // S'assurer que les données sont chargées
    if (authStore.isAdmin && (!entreprises.value.length)) {
      await loadAllEntreprises();
    }
    
    const entrepriseId = typeof plan.entreprise === 'object' && plan.entreprise ? plan.entreprise.id : plan.entreprise;
    const salarieId = typeof plan.salarie === 'object' && plan.salarie ? plan.salarie.id : plan.salarie;
    const visiteurId = typeof plan.visiteur === 'object' && plan.visiteur ? plan.visiteur.id : plan.visiteur;
    
    editPlanData.value = {
      id: plan.id,
      nom: plan.nom,
      description: plan.description,
      entreprise: entrepriseId || null,
      salarie: salarieId || null,
      visiteur: visiteurId || null
    };
    
    // Charger les salaries de l'entreprise si nécessaire
    if (entrepriseId) {
      await loadSalaries(entrepriseId);
    }
    
    // Charger les visiteurs du salarie si nécessaire
    if (salarieId) {
      await loadVisiteurs(salarieId);
    }
    
    showEditPlanModal.value = true;
  } catch (err) {
    console.error('Erreur lors de l\'ouverture du modal:', err);
    error.value = 'Erreur lors du chargement des données';
  } finally {
    loading.value = false;
  }
}

// Fonction de validation avant la mise à jour
async function updatePlan() {
  error.value = null
  loading.value = true
  try {
    if (!editPlanData.value.nom.trim()) {
      throw new Error('Le nom du plan est requis')
    }
    // Validation de la logique hiérarchique
    if (editPlanData.value.visiteur && !editPlanData.value.salarie) {
      throw new Error('Un salarie doit être sélectionné pour assigner un visiteur')
    }
    if (editPlanData.value.salarie && !editPlanData.value.entreprise) {
      throw new Error('Une entreprise doit être sélectionnée pour assigner un salarie')
    }
const response = await irrigationStore.updatePlanDetails(editPlanData.value.id, {
      nom: editPlanData.value.nom.trim(),
      description: editPlanData.value.description.trim(),
      entreprise_id: editPlanData.value.entreprise,
      salarie_id: editPlanData.value.salarie,
      visiteur_id: editPlanData.value.visiteur
    });
if (response) {
      showEditPlanModal.value = false
      await loadPlans()
    }
  } catch (err: any) {
    console.error('Erreur lors de la mise à jour du plan:', err)
    if (err.response?.data?.detail) {
      error.value = err.response.data.detail
    } else if (err.response?.data?.non_field_errors) {
      error.value = err.response.data.non_field_errors[0]
    } else if (err.response?.data) {
      // Gestion des erreurs de validation par champ
      const errors = Object.entries(err.response.data)
        .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages[0] : messages}`)
      error.value = errors.join('\n')
    } else {
      error.value = err.message || 'Une erreur est survenue lors de la mise à jour du plan'
    }
  } finally {
    loading.value = false
  }
}

// Watchers pour gérer les dépendances et le rechargement des données
watch(() => selectedEntreprise.value, async (newEntrepriseId) => {
  selectedSalarie.value = null;
  selectedClient.value = null;
  
  if (newEntrepriseId) {
    await loadSalaries(newEntrepriseId);
  } else {
    // Si aucune entreprise n'est sélectionnée, charger tous les salaries
    await loadSalaries();
  }
});

watch(() => selectedSalarie.value, async (newSalarieId) => {
  selectedClient.value = null;
  
  if (newSalarieId) {
    await loadVisiteurs(newSalarieId);
  }
});

watch(() => editPlanData.value.entreprise, async (newEntrepriseId) => {
  if (newEntrepriseId === null) {
    editPlanData.value.salarie = null;
    editPlanData.value.visiteur = null;
  } else {
    // Charger les salaries pour cette entreprise
    await loadSalaries(newEntrepriseId);
  }
});

watch(() => editPlanData.value.salarie, async (newSalarieId) => {
  editPlanData.value.visiteur = null;
  
  if (newSalarieId) {
    // Charger les visiteurs pour ce salarie
    await loadVisiteurs(newSalarieId);
  }
});

// Fonction pour déterminer si l'utilisateur peut supprimer un plan
function canDeletePlan(plan: LocalPlan): boolean {
  const user = authStore.user
  if (!user) return false
  
  if (user.user_type === 'admin') return true
  
  if (user.user_type === 'entreprise') {
    if (typeof plan.entreprise === 'object') {
      return plan.entreprise?.id === user.id;
    }
    return plan.entreprise === user.id;
  }
  
  if (user.user_type === 'salarie') {
    if (typeof plan.salarie === 'object') {
      return plan.salarie?.id === user.id;
    }
    return plan.salarie === user.id;
  }
  
  const isCreator = plan.createur.id === user.id;
  let isVisiteur = false;
  
  if (typeof plan.visiteur === 'object') {
    isVisiteur = plan.visiteur?.id === user.id;
  } else {
    isVisiteur = plan.visiteur === user.id;
  }
  
  return isVisiteur || isCreator;
}

// Ajouter la fonction de callback
async function onPlanCreated(planId: number) {
  await loadPlans();
  // Sauvegarder l'ID du nouveau plan dans localStorage
  localStorage.setItem('lastPlanId', planId.toString());
// Rediriger vers l'éditeur avec le nouveau plan
  router.push('/');
}

// Fonction pour gérer le tri
function toggleSort(field: 'nom' | 'date_creation' | 'date_modification') {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortField.value = field;
    sortDirection.value = 'desc';
  }
}

// Fonction pour formater l'affichage des utilisateurs
function formatUserDisplay(user: any): string {
  if (!user) return '';
  return formatUserName(user);
}
</script> 