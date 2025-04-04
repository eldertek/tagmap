<template>
  <div class="map-filter-panel bg-white shadow-lg rounded-lg border border-gray-200 overflow-hidden" @click="deselectCurrentShape">
    <!-- En-tête avec titre et bouton de réduction -->
    <div class="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
      <h3 class="text-sm font-medium text-gray-700 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        Filtres
      </h3>
      <button @click="toggleCollapsed" class="text-gray-400 hover:text-gray-500 focus:outline-none">
        <svg v-if="collapsed" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>

    <!-- Contenu du panneau (visible uniquement si non réduit) -->
    <div v-if="!collapsed" class="p-3 space-y-4">
      <!-- Section des niveaux d'accès -->
      <div class="space-y-2">
        <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Niveau d'accès</h4>
        <div class="space-y-1">
          <label v-if="isAdmin || isEntreprise" class="flex items-center">
            <input type="checkbox" v-model="filters.accessLevels.company" @change="deselectCurrentShape" class="rounded text-primary-600 focus:ring-primary-500 h-4 w-4">
            <span class="ml-2 text-sm text-gray-700">Entreprise uniquement</span>
          </label>
          <label v-if="isAdmin || isEntreprise || isSalarie" class="flex items-center">
            <input type="checkbox" v-model="filters.accessLevels.employee" @change="deselectCurrentShape" class="rounded text-primary-600 focus:ring-primary-500 h-4 w-4">
            <span class="ml-2 text-sm text-gray-700">Salariés</span>
          </label>
          <label class="flex items-center">
            <input type="checkbox" v-model="filters.accessLevels.visitor" @change="deselectCurrentShape" class="rounded text-primary-600 focus:ring-primary-500 h-4 w-4">
            <span class="ml-2 text-sm text-gray-700">Visiteurs</span>
          </label>
        </div>
      </div>

      <!-- Section des catégories d'éléments -->
      <div class="space-y-2">
        <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Éléments</h4>
        <div class="space-y-1">
          <label class="flex items-center">
            <input type="checkbox" v-model="filters.categories.forages" @change="deselectCurrentShape" class="rounded text-primary-600 focus:ring-primary-500 h-4 w-4">
            <span class="ml-2 text-sm text-gray-700">Forages</span>
          </label>
          <label class="flex items-center">
            <input type="checkbox" v-model="filters.categories.clients" @change="deselectCurrentShape" class="rounded text-primary-600 focus:ring-primary-500 h-4 w-4">
            <span class="ml-2 text-sm text-gray-700">Clients</span>
          </label>
          <label class="flex items-center">
            <input type="checkbox" v-model="filters.categories.entrepots" @change="deselectCurrentShape" class="rounded text-primary-600 focus:ring-primary-500 h-4 w-4">
            <span class="ml-2 text-sm text-gray-700">Entrepôts</span>
          </label>
          <label class="flex items-center">
            <input type="checkbox" v-model="filters.categories.livraisons" @change="deselectCurrentShape" class="rounded text-primary-600 focus:ring-primary-500 h-4 w-4">
            <span class="ml-2 text-sm text-gray-700">Lieux de livraison</span>
          </label>
          <label class="flex items-center">
            <input type="checkbox" v-model="filters.categories.cultures" @change="deselectCurrentShape" class="rounded text-primary-600 focus:ring-primary-500 h-4 w-4">
            <span class="ml-2 text-sm text-gray-700">Cultures</span>
          </label>
          <label class="flex items-center">
            <input type="checkbox" v-model="filters.categories.parcelles" @change="deselectCurrentShape" class="rounded text-primary-600 focus:ring-primary-500 h-4 w-4">
            <span class="ml-2 text-sm text-gray-700">Noms des parcelles</span>
          </label>
          <!-- Catégories personnalisées -->
          <template v-for="categoryKey in Object.keys(filters.categories)" :key="categoryKey">
            <div v-if="!defaultCategories.includes(categoryKey)">
              <label class="flex items-center">
                <input type="checkbox" v-model="filters.categories[categoryKey as keyof CategoryFilters]" @change="deselectCurrentShape" class="rounded text-primary-600 focus:ring-primary-500 h-4 w-4">
                <span class="ml-2 text-sm text-gray-700">{{ formatCategoryName(categoryKey) }}</span>
              </label>
            </div>
          </template>
        </div>
      </div>

      <!-- Section des types de formes -->
      <div class="space-y-2">
        <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Types de formes</h4>
        <div class="space-y-1">
          <label class="flex items-center">
            <input type="checkbox" v-model="filters.shapeTypes.Polygon" @change="deselectCurrentShape" class="rounded text-primary-600 focus:ring-primary-500 h-4 w-4">
            <span class="ml-2 text-sm text-gray-700">Polygones</span>
          </label>
          <label class="flex items-center">
            <input type="checkbox" v-model="filters.shapeTypes.Line" @change="deselectCurrentShape" class="rounded text-primary-600 focus:ring-primary-500 h-4 w-4">
            <span class="ml-2 text-sm text-gray-700">Lignes</span>
          </label>
          <label class="flex items-center">
            <input type="checkbox" v-model="filters.shapeTypes.ElevationLine" @change="deselectCurrentShape" class="rounded text-primary-600 focus:ring-primary-500 h-4 w-4">
            <span class="ml-2 text-sm text-gray-700">Profils altimétriques</span>
          </label>
          <label class="flex items-center">
            <input type="checkbox" v-model="filters.shapeTypes.Note" @change="deselectCurrentShape" class="rounded text-primary-600 focus:ring-primary-500 h-4 w-4">
            <span class="ml-2 text-sm text-gray-700">Notes</span>
          </label>
        </div>
      </div>

      <!-- Boutons d'action -->
      <div class="flex justify-between pt-2">
        <button @click="resetFiltersAndDeselect" class="text-sm text-gray-600 hover:text-gray-800">
          Réinitialiser
        </button>
        <button @click="applyFilters" class="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700">
          Appliquer
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useMapDrawing } from '@/composables/useMapDrawing';
import type { ElementCategory, AccessLevel } from '@/types/drawing';

// Définir les props
const props = defineProps({
  initialCollapsed: {
    type: Boolean,
    default: false
  }
});

// Définir les émissions
const emit = defineEmits(['filter-change']);

// État local
const collapsed = ref(props.initialCollapsed);
const authStore = useAuthStore();
const { selectedShape, clearActiveControlPoints } = useMapDrawing();

// Computed properties pour les rôles d'utilisateur
const isAdmin = computed(() => authStore.isAdmin);
const isEntreprise = computed(() => authStore.isEntreprise);
const isSalarie = computed(() => authStore.isSalarie);

// Catégories par défaut
const defaultCategories = [
  'forages',
  'clients',
  'entrepots',
  'livraisons',
  'cultures',
  'parcelles'
];

// Type definitions for filters
type AccessLevelFilters = Record<AccessLevel | string, boolean>;
type CategoryFilters = Record<ElementCategory | string, boolean>;
type ShapeTypeFilters = Record<string, boolean>;

interface Filters {
  accessLevels: AccessLevelFilters;
  categories: CategoryFilters;
  shapeTypes: ShapeTypeFilters;
}

// État des filtres
const filters = reactive<Filters>({
  accessLevels: {
    company: true,
    employee: true,
    visitor: true
  },
  categories: {
    forages: true,
    clients: true,
    entrepots: true,
    livraisons: true,
    cultures: true,
    parcelles: true
  },
  shapeTypes: {
    Polygon: true,
    Line: true,
    ElevationLine: true,
    Note: true
  }
});

// Méthodes
function toggleCollapsed() {
  collapsed.value = !collapsed.value;
  deselectCurrentShape();
}

// Fonction pour désélectionner la forme actuelle
function deselectCurrentShape() {
  console.log('[MapFilterPanel][deselectCurrentShape] Désélection de la forme actuelle');
  if (selectedShape.value) {
    // Désélectionner la forme actuelle
    selectedShape.value = null;
    // Nettoyer les points de contrôle
    clearActiveControlPoints();
    console.log('[MapFilterPanel][deselectCurrentShape] Forme désélectionnée et points de contrôle nettoyés');
  }
}

function resetFilters() {
  // Réinitialiser tous les filtres à true
  Object.keys(filters.accessLevels).forEach(key => {
    filters.accessLevels[key as keyof AccessLevelFilters] = true;
  });

  Object.keys(filters.categories).forEach(key => {
    filters.categories[key as keyof CategoryFilters] = true;
  });

  Object.keys(filters.shapeTypes).forEach(key => {
    filters.shapeTypes[key as keyof ShapeTypeFilters] = true;
  });

  // Émettre l'événement de changement
  applyFilters();
}

// Fonction pour réinitialiser les filtres et désélectionner la forme actuelle
function resetFiltersAndDeselect() {
  console.log('[MapFilterPanel][resetFiltersAndDeselect] Réinitialisation des filtres et désélection de la forme');

  // Désélectionner la forme actuelle
  deselectCurrentShape();

  // Réinitialiser les filtres
  resetFilters();
}

function applyFilters() {
  emit('filter-change', {
    accessLevels: { ...filters.accessLevels },
    categories: { ...filters.categories },
    shapeTypes: { ...filters.shapeTypes }
  });
}

// Formater le nom de la catégorie (convertir de camelCase à texte lisible)
function formatCategoryName(key: string): string {
  // Convertir camelCase en mots séparés et capitaliser la première lettre
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase());
}

// Observer les changements de filtres et émettre l'événement
watch(filters, () => {
  applyFilters();
}, { deep: true });
</script>

<style scoped>
.map-filter-panel {
  width: 250px;
  transition: all 0.3s ease;
}
</style>
