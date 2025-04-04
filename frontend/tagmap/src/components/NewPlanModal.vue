<template>
  <div v-if="modelValue" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[3001] overflow-y-auto">
    <div class="bg-white w-full h-full md:rounded-lg md:max-w-4xl md:h-auto md:max-h-[90vh] md:my-8 relative overflow-y-auto">
      <div class="flex justify-between items-center mb-4 sticky top-0 bg-white p-4 md:p-6 pb-4 border-b z-10">
        <h2 class="text-xl font-semibold text-gray-900">Créer un nouveau plan</h2>
        <button @click="closeModal" class="text-gray-400 hover:text-gray-500">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="p-4 md:p-6 pt-0 overflow-y-auto max-h-[calc(100vh-80px)] md:max-h-[calc(90vh-80px)]">
        <!-- Sélection de l'entreprise (admin uniquement) -->
        <div v-if="authStore.isAdmin" class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">Entreprise</label>
          <div v-if="isLoadingEntreprises" class="animate-pulse">
            <div class="h-10 bg-gray-200 rounded"></div>
          </div>
          <select
            v-else
            v-model="planData.entreprise"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option :value="null">Sélectionnez une entreprise</option>
            <option v-for="entreprise in entreprises" :key="entreprise.id" :value="entreprise.id">
              {{ formatUserName(entreprise) }}
            </option>
          </select>
        </div>
        <!-- Sélection du salarie -->
        <div v-if="authStore.user?.user_type === 'admin' || authStore.user?.user_type === 'entreprise'" class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">Salarie</label>
          <div v-if="isLoadingSalaries" class="animate-pulse">
            <div class="h-10 bg-gray-200 rounded"></div>
          </div>
          <select
            id="edit-salarie"
            v-else
            v-model="planData.salarie"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            :disabled="authStore.isAdmin && !planData.entreprise"
          >
            <option :value="null">{{ salaries.length ? 'Sélectionnez un salarie' : 'Aucun salarie disponible' }}</option>
            <option v-for="salarie in salaries" :key="salarie.id" :value="salarie.id">
              {{ formatUserName(salarie) }}
            </option>
          </select>
        </div>
        <!-- Sélection du visiteur -->
        <div v-if="authStore.user?.user_type !== 'visiteur'" class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">Visiteur</label>
          <div v-if="isLoadingVisiteurs" class="animate-pulse">
            <div class="h-10 bg-gray-200 rounded"></div>
          </div>
          <select
            id="edit-visiteur"
            v-else
            v-model="planData.visiteur"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            :disabled="!visiteurs.length || (authStore.user?.user_type !== 'salarie' && !planData.salarie)"
          >
            <option :value="null">{{ visiteurs.length ? 'Sélectionnez un visiteur' : 'Aucun visiteur disponible' }}</option>
            <option v-for="visiteur in visiteurs" :key="visiteur.id" :value="visiteur.id">
              {{ formatUserName(visiteur) }}
            </option>
          </select>
        </div>
        <!-- Nom du plan -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">Nom du plan</label>
          <input
            id="edit-nom"
            v-model="planData.nom"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Entrez le nom du plan"
          />
        </div>
        <!-- Description -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea
            id="edit-description"
            v-model="planData.description"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            rows="3"
            placeholder="Entrez une description (optionnel)"
          ></textarea>
        </div>
        <!-- Boutons d'action -->
        <div class="flex justify-end space-x-3">
          <button
            @click="closeModal"
            class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            Annuler
          </button>
          <button
            @click="createPlan"
            class="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            :disabled="!isFormValid || isCreating"
          >
            <span v-if="isCreating">Création en cours...</span>
            <span v-else>Créer</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useAuthStore, formatUserName } from '@/stores/auth';
import { useIrrigationStore } from '@/stores/irrigation';
import { userService } from '@/services/api';
import type { UserDetails } from '@/types/user';
import { useDrawingStore } from '@/stores/drawing';

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  salarie: any | null;
  company_name: string;
  user_type: string;
  entreprise?: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    company_name: string;
    role: string;
    display_name: string;
    logo: string | null;
  };
  logo: string | null;
  permissions: {
    can_manage_users: boolean;
    can_manage_plans: boolean;
    can_view_all_plans: boolean;
    can_manage_salaries: boolean;
  };
}

interface PlanData {
  entreprise: IdType;
  salarie: IdType;
  visiteur: number | null;
  nom: string;
  description: string;
}

type IdType = { id: number } | number | null;

// Helper function to safely extract ID
function extractId(value: IdType): number | null {
  if (!value) return null;
  return typeof value === 'object' ? value.id : value;
}

// Helper function to validate ID is not null
function validateId(id: number | null): number {
  if (id === null) throw new Error('Invalid ID');
  return id;
}

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'created', planId: number): void;
  (e: 'salarieSelected', salarie: UserDetails): void;
  (e: 'visiteurSelected', visiteur: UserDetails): void;
}>();

const authStore = useAuthStore();
const irrigationStore = useIrrigationStore();
const drawingStore = useDrawingStore();
const isCreating = ref(false);
const error = ref<string | null>(null);
const salaries = ref<any[]>([]);
const visiteurs = ref<any[]>([]);
const entreprises = ref<any[]>([]);
const selectedSalarie = ref<any | null>(null);
const selectedVisiteur = ref<any | null>(null);
const isLoadingSalaries = ref(false);
const isLoadingVisiteurs = ref(false);
const isLoadingEntreprises = ref(false);

const planData = ref<PlanData>({
  nom: '',
  description: '',
  entreprise: null,
  salarie: null,
  visiteur: null
});

// Computed pour vérifier si le formulaire est valide
const isFormValid = computed(() => {
  if (authStore.user?.user_type === 'admin') {
    return planData.value.nom.trim() && planData.value.entreprise && planData.value.salarie && planData.value.visiteur;
  } else if (authStore.user?.user_type === 'entreprise') {
    return planData.value.nom.trim() && planData.value.salarie && planData.value.visiteur;
  } else if (authStore.user?.user_type === 'salarie') {
    return planData.value.nom.trim() && planData.value.visiteur;
  }
  return planData.value.nom.trim();
});

// Watcher pour charger les salaries quand une entreprise est sélectionnée
watch(() => planData.value.entreprise, async (newEntrepriseId) => {
  if (!props.modelValue) return;

  planData.value.salarie = null;
  planData.value.visiteur = null;
  visiteurs.value = [];

  const entrepriseId = extractId(newEntrepriseId);
  console.log('[NewPlanModal] Entreprise sélectionnée:', entrepriseId);
  if (entrepriseId) {
    await loadSalaries(entrepriseId);
  } else {
    salaries.value = [];
  }
});

// Watcher pour charger les visiteurs quand un salarie est sélectionné
watch(() => planData.value.salarie, async (newSalarieId) => {
  if (!props.modelValue) return;

  planData.value.visiteur = null;

  const salarieId = extractId(newSalarieId);
  if (salarieId) {
    await loadVisiteurs(salarieId);
  } else {
    visiteurs.value = [];
  }
});

// Watcher pour réinitialiser les données quand le modal s'ouvre ou se ferme
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    // Si le modal s'ouvre, charger les données nécessaires
    if (authStore.user?.user_type === 'admin') {
      loadEntreprises();
    } else if (authStore.user?.user_type === 'entreprise') {
      loadSalaries(authStore.user.id);
    } else if (authStore.user?.user_type === 'salarie') {
      loadVisiteurs(authStore.user.id);
    }
  } else {
    // Si le modal se ferme, nettoyer toutes les données
    planData.value = {
      nom: '',
      description: '',
      entreprise: null,
      salarie: null,
      visiteur: null
    };
    selectedSalarie.value = null;
    selectedVisiteur.value = null;
    visiteurs.value = [];
    salaries.value = [];
    entreprises.value = [];
    error.value = null;
  }
});

// Fonction pour charger les salaries
async function loadSalaries(entrepriseId?: number) {
  isLoadingSalaries.value = true;
  try {
    console.log('[NewPlanModal] Chargement des salaries pour entreprise:', entrepriseId);
    const response = await userService.getUsers({
      role: 'SALARIE',
      entreprise: entrepriseId
    });
    console.log('[NewPlanModal] Réponse salaries:', response.data);
    salaries.value = response.data;
  } catch (error) {
    console.error('[NewPlanModal] Error loading salaries:', error);
    salaries.value = [];
  } finally {
    isLoadingSalaries.value = false;
  }
}

// Fonction pour charger les visiteurs d'un salarie
async function loadVisiteurs(salarieId: number) {
  isLoadingVisiteurs.value = true;
  try {
    const response = await userService.getUsers({
      role: 'VISITEUR',
      salarie: salarieId
    });
    visiteurs.value = response.data;
  } catch (error) {
    console.error('[NewPlanModal] Error loading visiteurs:', error);
    visiteurs.value = [];
  } finally {
    isLoadingVisiteurs.value = false;
  }
}

// Fonction pour sélectionner un salarie
async function selectSalarie(salarie: UserDetails) {
  // N'exécuter que si le modal est visible
  if (!props.modelValue) return;

  selectedSalarie.value = salarie;
  planData.value.salarie = salarie.id;
  await loadVisiteurs(salarie.id);
  emit('salarieSelected', salarie);
}

// Fonction pour sélectionner un visiteur
function selectVisiteur(visiteur: UserDetails) {
  // N'exécuter que si le modal est visible
  if (!props.modelValue) return;

  selectedVisiteur.value = visiteur;
  planData.value.visiteur = visiteur.id;
  emit('visiteurSelected', visiteur);
}

// Fonction pour fermer le modal
function closeModal() {
  emit('update:modelValue', false);

  // Réinitialiser les données
  planData.value = {
    nom: '',
    description: '',
    entreprise: null,
    salarie: null,
    visiteur: null
  };
  selectedSalarie.value = null;
  selectedVisiteur.value = null;
  visiteurs.value = [];
  error.value = null;
}

// Fonction pour charger les entreprises
async function loadEntreprises() {
  isLoadingEntreprises.value = true;
  try {
    const response = await authStore.fetchEnterprises();
    entreprises.value = response;
  } catch (error) {
    console.error('[NewPlanModal] Error loading entreprises:', error);
    entreprises.value = [];
  } finally {
    isLoadingEntreprises.value = false;
  }
}

// Fonction pour créer un plan
async function createPlan() {
  error.value = null;
  isCreating.value = true;

  try {
    const data: any = {
      nom: planData.value.nom.trim(),
      description: planData.value.description.trim()
    };

    const user = authStore.user as User;
    if (!user) throw new Error('User not found');

    // Gestion des IDs selon le type d'utilisateur
    if (user.user_type === 'admin') {
      if (!planData.value.entreprise || !planData.value.salarie || !planData.value.visiteur) {
        throw new Error('Missing required fields');
      }
      data.entreprise = validateId(extractId(planData.value.entreprise));
      data.salarie = validateId(extractId(planData.value.salarie));
      data.visiteur = planData.value.visiteur;
    } else if (user.user_type === 'entreprise') {
      if (!planData.value.salarie || !planData.value.visiteur) {
        throw new Error('Missing required fields');
      }
      data.entreprise = user.id;
      data.salarie = validateId(extractId(planData.value.salarie));
      data.visiteur = planData.value.visiteur;
    } else if (user.user_type === 'salarie') {
      if (!user.entreprise || !planData.value.visiteur) {
        throw new Error('Missing required fields');
      }
      data.entreprise = user.entreprise.id;
      data.salarie = user.id;
      data.visiteur = planData.value.visiteur;
    } else if (user.user_type === 'visiteur') {
      if (!user.entreprise || !user.salarie) {
        throw new Error('Missing required fields');
      }
      data.entreprise = user.entreprise.id;
      data.salarie = user.salarie.id;
      data.visiteur = user.id;
    }

    console.log('Données du plan à créer:', data);

    // S'assurer que l'état est propre avant de créer un nouveau plan
    irrigationStore.clearCurrentPlan();
    drawingStore.setCurrentPlan(null);

    const newPlan = await irrigationStore.createPlan(data);
    emit('created', newPlan.id);
    closeModal();
  } catch (err: any) {
    console.error('[NewPlanModal] Error creating plan:', err);
    console.error('Response data:', err.response?.data);

    let errorMessage = 'Une erreur est survenue lors de la création du plan';

    if (err.response?.data) {
      if (typeof err.response.data === 'object') {
        errorMessage = Object.entries(err.response.data)
          .map(([field, messages]) => {
            if (Array.isArray(messages)) {
              return `${field}: ${messages.join(', ')}`;
            }
            return `${field}: ${messages}`;
          })
          .join('\n');
      } else if (typeof err.response.data === 'string') {
        errorMessage = err.response.data;
      }
    }

    error.value = errorMessage;
  } finally {
    isCreating.value = false;
  }
}

// Exposer les méthodes et données nécessaires
defineExpose({
  salaries,
  visiteurs,
  selectedSalarie,
  selectedVisiteur,
  loadSalaries,
  loadVisiteurs,
  selectSalarie,
  selectVisiteur
});
</script>