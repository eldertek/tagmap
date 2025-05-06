<template>
  <div class="drawing-tools-panel" :class="{ 'open': show }">
    <!-- En-tête sur mobile uniquement -->
    <div class="hidden md:hidden flex-mobile items-center justify-between p-4 border-b border-gray-200">
      <div class="flex items-center">
        <div class="w-10 h-1.5 bg-gray-300 rounded-full mr-3"></div>
        <h3 class="text-sm font-semibold text-gray-700">Outils</h3>
      </div>
      <button
        @click="$emit('update:show', false)"
        class="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Contenu principal -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Navigation par onglets -->
      <div class="border-b border-gray-200">
        <nav class="flex -mb-px">
          <button @click="activeTab = 'tools'"
            :class="[activeTab === 'tools' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300', 'flex-1 py-3 px-1 text-center border-b-2 font-medium text-sm']">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mx-auto mb-1" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            <span>Outils</span>
          </button>
          <button v-if="selectedShape && selectedShape.properties?.type !== 'Note'" @click="activeTab = 'style'"
            :class="[activeTab === 'style' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300', 'flex-1 py-3 px-1 text-center border-b-2 font-medium text-sm']">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mx-auto mb-1" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            <span>Style</span>
          </button>
          <button @click="switchToFiltersTab"
            :class="[activeTab === 'filters' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300', 'flex-1 py-3 px-1 text-center border-b-2 font-medium text-sm']">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mx-auto mb-1" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span>Filtres</span>
          </button>
        </nav>
      </div>

      <!-- Contenu des onglets -->
      <div class="flex-1 overflow-hidden flex flex-col">
        <!-- Onglet Outils -->
        <div v-if="activeTab === 'tools'" class="tab-content">
          <!-- Outils de dessin - version compacte avec icônes -->
          <div class="grid grid-cols-3 gap-1.5 mb-4">
            <button v-for="tool in drawingTools.filter(t => t.type !== 'delete')" :key="tool.type"
              class="flex items-center justify-center p-2 rounded-md border transition-all duration-200"
              :class="{
                'bg-primary-500 border-primary-700 text-white font-bold shadow-md': props.selectedTool === tool.type,
                'hover:bg-gray-50 border-gray-300 text-gray-700': props.selectedTool !== tool.type
              }"
              @click="handleToolClick(tool.type)" :title="tool.label">
              <span class="icon" v-html="getToolIcon(tool.type)"></span>
              <span class="ml-1 text-xs" v-if="props.selectedTool === tool.type">Actif</span>
            </button>
          </div>
          <!-- Boutons spécifiques pour les GeoNotes -->
          <div v-if="selectedShape && localProperties && localProperties.type === 'Note'" class="grid grid-cols-2 gap-2 mt-2 mb-2">
            <!-- Bouton d'édition -->
            <button
              class="p-2 rounded-md border border-primary-200 bg-primary-50 text-primary-600 hover:bg-primary-100 flex items-center justify-center"
              @click="editGeoNote" title="Éditer la note">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span class="text-sm">Éditer</span>
            </button>
            <!-- Bouton d'itinéraire -->
            <button
              class="p-2 rounded-md border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center"
              @click="openGeoNoteRoute" title="Obtenir l'itinéraire">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <span class="text-sm">Itinéraire</span>
            </button>
          </div>

          <!-- Bouton de suppression -->
          <button v-if="selectedShape"
            class="w-full mt-2 p-2 rounded-md border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center"
            :class="{ 'bg-red-100': props.selectedTool === 'delete' }" @click="$emit('delete-shape')" title="Supprimer la forme">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span class="text-sm">Supprimer</span>
          </button>

          <!-- Séparateur -->
          <div v-if="selectedShape && localProperties" class="my-4 border-t border-gray-200"></div>

          <!-- Propriétés de la forme sélectionnée (intégrées directement sous les outils) -->
          <div v-if="selectedShape && localProperties" class="mt-4">
            <!-- Champ pour nommer la forme (masqué pour les Notes) -->
            <div v-if="localProperties.type !== 'Note'" class="mb-4">
              <label for="shapeName" class="block text-sm font-medium text-gray-700 mb-1">Nom de la forme</label>
              <input type="text" id="shapeName" v-model="shapeName" @change="updateShapeName"
                placeholder="Donnez un nom à cette forme"
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
            </div>

            <!-- Catégorie de la forme -->
            <div class="mb-4">
              <label for="shapeCategory" class="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
              <select id="shapeCategory" v-model="shapeCategory" @change="updateShapeCategory"
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500">
                <!-- Catégories par défaut -->
                <option value="forages">Forages</option>
                <option value="clients">Clients</option>
                <option value="entrepots">Entrepôts</option>
                <option value="livraisons">Lieux de livraison</option>
                <option value="cultures">Cultures</option>
                <option value="parcelles">Noms des parcelles</option>
                <!-- Catégories personnalisées -->
                <template v-for="(value, key) in filters.categories" :key="key">
                  <option v-if="!defaultCategories.includes(String(key))" :value="String(key)">{{ formatCategoryName(String(key)) }}</option>
                </template>
                <option value="default">Autre</option>
              </select>
            </div>

            <!-- Niveau d'accès -->
            <div class="mb-4">
              <label for="accessLevel" class="block text-sm font-medium text-gray-700 mb-1">Niveau d'accès</label>
              <div class="p-2 bg-blue-50 rounded mb-2 text-xs text-blue-700">
                Définit qui peut voir cet élément sur la carte.
              </div>
              <select id="accessLevel" v-model="accessLevel" @change="updateAccessLevel"
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500">
                <option v-for="level in ACCESS_LEVELS" :key="level.id" :value="level.id">
                  {{ level.title }} - {{ level.description }}
                </option>
              </select>
            </div>

            <!-- Tableau compact des propriétés pour tous les types -->
            <div class="grid grid-cols-1 gap-4">
              <!-- Polygone -->
              <template v-if="localProperties.type === 'Polygon'">
                <div class="space-y-1">
                  <div class="flex justify-between items-center">
                    <span class="text-sm font-semibold text-gray-700">Surface :</span>
                    <span class="text-sm font-medium text-gray-500">{{ formatArea(localProperties.surface || 0)
                    }}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-sm font-semibold text-gray-700">Périmètre :</span>
                    <span class="text-sm font-medium text-gray-500">{{ formatLength(localProperties.perimeter || 0)
                    }}</span>
                  </div>
                </div>
              </template>

              <!-- Ligne -->
              <template v-else-if="localProperties.type === 'Line'">
                <span class="text-sm font-semibold text-gray-700">Longueur :</span>
                <span class="text-sm font-medium text-gray-500">{{ formatLength(localProperties.length || 0) }}</span>
              </template>
            </div>
          </div>
        </div>

        <!-- Onglet Style -->
        <div v-if="activeTab === 'style' && selectedShape && selectedShape.properties?.type !== 'Note'" class="tab-content">
          <!-- Couleurs prédéfinies - compact -->
          <div class="grid grid-cols-6 gap-2 mb-4">
            <button v-for="color in predefinedColors" :key="color" class="w-8 h-8 rounded-full"
              :style="{ backgroundColor: color }" @click="selectPresetColor(color)" :title="color"></button>
          </div>
          <div class="space-y-4">
            <div class="flex items-center gap-4">
              <span class="w-20 text-sm font-semibold text-gray-700">Contour</span>
              <div class="flex items-center gap-2">
                <input type="color" v-model="strokeColor" class="w-16 h-8 rounded border"
                  @change="updateStyle({ strokeColor })" title="Couleur du contour" />
                <input type="range" v-model="strokeWidth" min="1" max="10" class="w-16 h-2 rounded-md"
                  @change="updateStyle({ strokeWidth })" title="Épaisseur du contour" />
              </div>
            </div>
            <!-- Style de trait -->
            <div class="flex items-center gap-4">
              <span class="w-20 text-sm font-semibold text-gray-700">Style</span>
              <select v-model="strokeStyle" class="w-full rounded border" @change="updateStyle({ strokeStyle })">
                <option v-for="style in strokeStyles" :key="style.value" :value="style.value">
                  {{ style.label }}
                </option>
              </select>
            </div>
            <div v-if="showFillOptions" class="flex items-center gap-4">
              <span class="w-20 text-sm font-semibold text-gray-700">Remplir</span>
              <div class="flex items-center gap-2">
                <input type="color" v-model="fillColor" class="w-16 h-8 rounded border"
                  @change="updateStyle({ fillColor })" title="Couleur de remplissage" />
                <input type="range" v-model="fillOpacity" min="0" max="1" step="0.1" class="w-16 h-2 rounded-md"
                  @change="updateStyle({ fillOpacity })" title="Opacité du remplissage" />
              </div>
            </div>
          </div>
        </div>

        <!-- Onglet Filtres -->
        <div v-if="activeTab === 'filters'" class="tab-content filters-tab">
          <div class="filters-content">
            <!-- Section des niveaux d'accès avec liste déroulante -->
            <div class="space-y-2">
              <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Niveau d'accès</h4>
              <div class="p-2 bg-blue-50 rounded mb-2 text-xs text-blue-700">
                Sélectionnez votre niveau d'accès pour filtrer les éléments visibles sur la carte.
              </div>
              <div>
                <select v-model="selectedAccessLevel" @change="updateAccessLevelFilterAndDeselect(selectedAccessLevel)"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm">
                  <option v-for="level in ACCESS_LEVELS.filter(l => l.id !== NoteAccessLevel.PRIVATE)" :key="level.id" :value="level.id">
                    {{ level.title }} ({{ level.description }})
                  </option>
                </select>
                <div class="mt-2 text-xs text-gray-500">
                  <p><strong>Entreprise</strong> : Vous verrez tous les éléments (entreprise, salariés, visiteurs)</p>
                  <p><strong>Salariés</strong> : Vous verrez les éléments pour salariés et visiteurs</p>
                  <p><strong>Visiteurs</strong> : Vous ne verrez que les éléments pour visiteurs</p>
                </div>
              </div>
            </div>

            <!-- Section des catégories -->
            <div class="space-y-2 mt-4">
              <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Catégories</h4>
              <div class="space-y-1">
                <label class="flex items-center">
                  <input type="checkbox" v-model="filters.categories.forages" @change="deselectCurrentShape"
                    class="rounded text-primary-600 focus:ring-primary-500 h-4 w-4">
                  <span class="ml-2 text-sm text-gray-700">Forages</span>
                </label>
                <label class="flex items-center">
                  <input type="checkbox" v-model="filters.categories.clients" @change="deselectCurrentShape"
                    class="rounded text-primary-600 focus:ring-primary-500 h-4 w-4">
                  <span class="ml-2 text-sm text-gray-700">Clients</span>
                </label>
                <label class="flex items-center">
                  <input type="checkbox" v-model="filters.categories.entrepots" @change="deselectCurrentShape"
                    class="rounded text-primary-600 focus:ring-primary-500 h-4 w-4">
                  <span class="ml-2 text-sm text-gray-700">Entrepôts</span>
                </label>
                <label class="flex items-center">
                  <input type="checkbox" v-model="filters.categories.livraisons" @change="deselectCurrentShape"
                    class="rounded text-primary-600 focus:ring-primary-500 h-4 w-4">
                  <span class="ml-2 text-sm text-gray-700">Lieux de livraison</span>
                </label>
                <label class="flex items-center">
                  <input type="checkbox" v-model="filters.categories.cultures" @change="deselectCurrentShape"
                    class="rounded text-primary-600 focus:ring-primary-500 h-4 w-4">
                  <span class="ml-2 text-sm text-gray-700">Cultures</span>
                </label>
                <label class="flex items-center">
                  <input type="checkbox" v-model="filters.categories.parcelles" @change="deselectCurrentShape"
                    class="rounded text-primary-600 focus:ring-primary-500 h-4 w-4">
                  <span class="ml-2 text-sm text-gray-700">Noms des parcelles</span>
                </label>

                <!-- Afficher les filtres personnalisés existants -->
                <template v-for="(value, key) in filters.categories" :key="key">
                  <label v-if="!defaultCategories.includes(String(key))" class="flex items-center">
                    <input type="checkbox" v-model="filters.categories[key]" @change="deselectCurrentShape"
                      class="rounded text-primary-600 focus:ring-primary-500 h-4 w-4">
                    <span class="ml-2 text-sm text-gray-700">{{ key }}</span>
                  </label>
                </template>

                <!-- Ajout de filtre personnalisé (visible uniquement pour admin et entreprise) -->
                <div v-if="isAdmin || isEntreprise" class="mt-2 pt-2 border-t border-gray-200">
                  <div class="flex space-x-2">
                    <input
                      type="text"
                      v-model="newFilter.name"
                      placeholder="Nouveau filtre..."
                      class="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
                    />
                    <button
                      @click="createFilter"
                      :disabled="!newFilter.name || isCreatingFilter"
                      class="px-2 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed">
                      <svg v-if="!isCreatingFilter" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <svg v-else class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Section des types de formes -->
            <div class="space-y-2 mt-4">
              <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Types de formes</h4>
              <div class="space-y-1">
                <label class="flex items-center">
                  <input type="checkbox" v-model="filters.shapeTypes.Polygon" @change="deselectCurrentShape"
                    class="rounded text-primary-600 focus:ring-primary-500 h-4 w-4">
                  <span class="ml-2 text-sm text-gray-700">Polygones</span>
                </label>
                <label class="flex items-center">
                  <input type="checkbox" v-model="filters.shapeTypes.Line" @change="deselectCurrentShape"
                    class="rounded text-primary-600 focus:ring-primary-500 h-4 w-4">
                  <span class="ml-2 text-sm text-gray-700">Lignes</span>
                </label>
                <label class="flex items-center">
                  <input type="checkbox" v-model="filters.shapeTypes.Note" @change="deselectCurrentShape"
                    class="rounded text-primary-600 focus:ring-primary-500 h-4 w-4">
                  <span class="ml-2 text-sm text-gray-700">Notes</span>
                </label>
              </div>
            </div>

            <!-- Bouton de réinitialisation -->
            <div class="pt-4 mb-4">
              <button @click="resetFiltersAndDeselect"
                class="w-full px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 transition-colors">
                Réinitialiser
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect, reactive, watch, onMounted } from 'vue'
import type { AccessLevel, ElementCategory } from '@/types/drawing'
import { useDrawingStore } from '@/stores/drawing'
import { useAuthStore } from '@/stores/auth'
import { useMapFilterStore } from '@/stores/mapFilters'
import { useIrrigationStore } from '@/stores/irrigation'
import { ACCESS_LEVELS, NoteAccessLevel } from '@/utils/noteHelpers'

// Les types pour les filtres sont définis plus bas dans le fichier

// Define types
interface ShapeProperties {
  type: string;
  name?: string;
  style?: any;
  category?: ElementCategory;
  accessLevel?: AccessLevel;
  [key: string]: any;
}

interface ShapeType {
  type: string;
  properties: {
    type: string;  // Rendre le type obligatoire
    style?: any;
    name?: string;
    category?: ElementCategory;
    accessLevel?: AccessLevel;
    [key: string]: any;
  };
  layer: any;
  options: any;
}

// Define props for the component
const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  selectedTool: {
    type: String,
    default: ''
  },
  selectedShape: {
    type: Object as () => import('@/types/drawing').ShapeType | null,
    default: null
  },
  allLayers: {
    type: Array,
    default: () => []
  },
  isDrawing: {
    type: Boolean,
    default: false
  },
  activeTabProp: {
    type: String,
    default: 'tools'
  }
})

// Initialize the drawing store
const drawingStore = useDrawingStore()

// Auth store pour les permissions
const authStore = useAuthStore();
const isAdmin = computed(() => authStore.isAdmin);
const isEntreprise = computed(() => authStore.isEntreprise);

// Store pour les filtres
const mapFilterStore = useMapFilterStore();

// Store pour les plans d'irrigation
const irrigationStore = useIrrigationStore();

// État pour l'ajout de filtre
const newFilter = reactive({
  name: ''
});
const isCreatingFilter = ref(false);

// Catégories par défaut - définies comme ref pour être accessibles dans le template
const defaultCategories = ref([
  'forages',
  'clients',
  'entrepots',
  'livraisons',
  'cultures',
  'parcelles'
]);

const drawingTools = [
  { type: 'Polygon', label: 'Polygone' },
  { type: 'Line', label: 'Ligne' },
  { type: 'Note', label: 'Note géolocalisée' }
]

const getToolIcon = (type: string) => {
  switch (type) {
    case 'Polygon':
      return '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5l16 0l0 14l-16 0l0 -14z"/></svg>'
    case 'Line':
      return '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 20l16 -16"/></svg>'
    case 'Note':
      return '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11c1.38 0 2.5-1.12 2.5-2.5S13.38 6 12 6s-2.5 1.12-2.5 2.5S10.62 11 12 11z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><ellipse cx="12" cy="22" rx="4" ry="1.5" stroke-width="2.5" fill="currentColor" fill-opacity="0.2"/></svg>'
    default:
      return ''
  }
}

// Define reactive variables for the component
const activeTab = ref(props.activeTabProp) // Onglet actif par défaut
// Watch for tab changes to ensure filters are applied when switching to the filters tab
watch(activeTab, (newTab, oldTab) => {
  // If we're switching to the filters tab, make sure filters are up to date
  if (newTab === 'filters' && oldTab !== 'filters') {
    // Désélectionner la forme actuelle lorsqu'on passe à l'onglet filtres
    if (props.selectedShape) {
      emit('tool-selected', ''); // Désélectionne l'outil actuel
    }

    // Appliquer les filtres immédiatement lors du passage à l'onglet filtres
    setTimeout(() => {
      applyFilters();
    }, 0);
  }

  // If we're leaving the filters tab, apply any pending changes
  if (oldTab === 'filters' && newTab !== 'filters') {
    applyFilters();
  }
  
  // Emit the tab change event
  emit('tab-change', newTab);
})

// Watch for changes in the activeTabProp
watch(() => props.activeTabProp, (newValue) => {
  if (newValue && newValue !== activeTab.value) {
    activeTab.value = newValue;
  }
})

// Style properties
const strokeColor = ref('#2b6451')
const strokeWidth = ref(2)
const strokeStyle = ref('solid')
const fillColor = ref('#2b6451')
const fillOpacity = ref(0.2)
const showFillOptions = ref(true)

// Propriétés de la forme
const shapeName = ref('')
const shapeCategory = ref<ElementCategory>('default')
const accessLevel = ref<AccessLevel>('visitor')


// Predefined colors
const predefinedColors = [
  '#2b6451', // Vert principal
  '#10B981', // Vert
  '#F59E0B', // Jaune
  '#EF4444', // Rouge
  '#8B5CF6', // Violet
  '#EC4899'  // Rose
]

// Stroke styles
const strokeStyles = [
  { value: 'solid', label: 'Continu' },
  { value: 'dashed', label: 'Tirets' },
  { value: 'dotted', label: 'Pointillés' }
]

// Define filter types
interface AccessLevelFilters {
  company: boolean;
  employee: boolean;
  visitor: boolean;
  [key: string]: boolean;
}

interface CategoryFilters {
  forages: boolean;
  clients: boolean;
  entrepots: boolean;
  livraisons: boolean;
  cultures: boolean;
  parcelles: boolean;
  [key: string]: boolean;
}

interface ShapeTypeFilters {
  Polygon: boolean;
  Line: boolean;
  Note: boolean;
  [key: string]: boolean;
}

interface Filters {
  accessLevels: AccessLevelFilters;
  categories: CategoryFilters;
  shapeTypes: ShapeTypeFilters;
}

// Niveau d'accès sélectionné pour le filtrage
const selectedAccessLevel = ref('company'); // Par défaut, niveau entreprise (accès à tout)

// Filters state
const filters = reactive<Filters>({
  accessLevels: {
    company: true,
    employee: false,
    visitor: false
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
    Note: true
  }
});

// Méthode pour mettre à jour le niveau d'accès sélectionné
const updateAccessLevelFilter = (level: string) => {
  // Mettre à jour le niveau sélectionné
  selectedAccessLevel.value = level;

  // Mettre à jour les filtres en fonction du niveau sélectionné
  if (level === 'company') {
    // Niveau entreprise: accès à tout (entreprise, salariés, visiteurs)
    filters.accessLevels.company = true;
    filters.accessLevels.employee = false;
    filters.accessLevels.visitor = false;
  } else if (level === 'employee') {
    // Niveau salariés: accès aux éléments pour salariés et visiteurs
    filters.accessLevels.company = false;
    filters.accessLevels.employee = true;
    filters.accessLevels.visitor = false;
  } else if (level === 'visitor') {
    // Niveau visiteurs: accès aux éléments pour visiteurs uniquement
    filters.accessLevels.company = false;
    filters.accessLevels.employee = false;
    filters.accessLevels.visitor = true;
  }

  // Appliquer les filtres
  applyFilters();
};

// Méthode pour mettre à jour le niveau d'accès et désélectionner la forme actuelle
const updateAccessLevelFilterAndDeselect = (level: string) => {
  // Désélectionner la forme actuelle si nécessaire
  if (props.selectedShape) {
    emit('tool-selected', ''); // Désélectionne l'outil actuel
  }

  // Appeler la fonction de mise à jour standard
  updateAccessLevelFilter(level);
};

// Initialiser les filtres

// Computed property to get the properties from the selected shape
const localProperties = computed(() => {
  if (!props.selectedShape) return null
  return props.selectedShape.properties || null
})

// Define types for method parameters
type StyleProps = { [key: string]: any };

const selectPresetColor = (color: string): void => {
  strokeColor.value = color
  fillColor.value = color
  updateStyle({ strokeColor: color, fillColor: color })
}

const updateStyle = (styleProps: StyleProps): void => {
  if (!props.selectedShape) return

  // Log the style props being updated
  console.log('DrawingTools: Updating style with props:', styleProps)

  // Emit the style update to the parent component
  emit('style-update', styleProps)
  
  // Force an immediate UI update to show the style change in the drawing tools panel
  // Update local state to reflect new values
  if (styleProps.strokeColor) {
    strokeColor.value = styleProps.strokeColor
  }
  if (styleProps.strokeWidth !== undefined) {
    strokeWidth.value = styleProps.strokeWidth
  }
  if (styleProps.strokeStyle) {
    strokeStyle.value = styleProps.strokeStyle
  }
  if (styleProps.fillColor) {
    fillColor.value = styleProps.fillColor
  }
  if (styleProps.fillOpacity !== undefined) {
    fillOpacity.value = styleProps.fillOpacity
  }
}

// Méthode pour mettre à jour le nom de la forme
const updateShapeName = (): void => {
  if (!props.selectedShape) return

  // Mettre à jour le nom de la forme
  emit('properties-update', { name: shapeName.value })
}

// Méthode pour mettre à jour la catégorie de la forme
const updateShapeCategory = (): void => {
  if (!props.selectedShape) return

  // Mettre à jour la catégorie de la forme
  emit('properties-update', { category: shapeCategory.value })
}

// Méthode pour mettre à jour le niveau d'accès de la forme
const updateAccessLevel = (): void => {
  if (!props.selectedShape) return

  // Mettre à jour le niveau d'accès de la forme
  emit('properties-update', { accessLevel: accessLevel.value })
}


// Méthode pour réinitialiser les filtres
const resetFilters = (): void => {
  // Créer un nouvel objet de filtres avec toutes les valeurs à true
  const resetedFilters = {
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
      Note: true
    }
  };

  // Mettre à jour directement les filtres locaux
  // Niveaux d'accès
  filters.accessLevels.company = true;
  filters.accessLevels.employee = true;
  filters.accessLevels.visitor = true;

  // Catégories
  filters.categories.forages = true;
  filters.categories.clients = true;
  filters.categories.entrepots = true;
  filters.categories.livraisons = true;
  filters.categories.cultures = true;
  filters.categories.parcelles = true;

  // Types de formes
  filters.shapeTypes.Polygon = true;
  filters.shapeTypes.Line = true;
  filters.shapeTypes.Note = true;

  // Mettre à jour les filtres dans le store
  drawingStore.updateFilters(resetedFilters);

  // Émettre un événement pour indiquer que les filtres ont changé
  emit('filter-change', resetedFilters);
}

// Méthode pour réinitialiser les filtres et désélectionner la forme actuelle
const resetFiltersAndDeselect = (): void => {
  // Désélectionner la forme actuelle si nécessaire
  deselectCurrentShape();

  // Réinitialiser les filtres
  resetFilters();
}

// Méthode pour appliquer les filtres
const applyFilters = (): void => {
  // Créer des copies des filtres pour les mises à jour
  const accessLevelsCopy = { ...filters.accessLevels };
  const categoriesCopy = { ...filters.categories };
  const shapeTypesCopy = { ...filters.shapeTypes };

  // Mettre à jour les filtres dans le store
  const filtersToUpdate = {
    accessLevels: accessLevelsCopy,
    categories: categoriesCopy,
    shapeTypes: shapeTypesCopy
  };

  drawingStore.updateFilters(filtersToUpdate);

  // Émettre un événement pour indiquer que les filtres ont changé
  emit('filter-change', filtersToUpdate);

  // Forcer la mise à jour de l'affichage
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('filtersChanged', {
      detail: {
        filters: filtersToUpdate
      }
    }));
  }, 0);
}

const formatLength = (value: number): string => {
  return `${Math.round(value)} m`
}

const formatArea = (value: number): string => {
  if (value >= 10000) {
    return `${(value / 10000).toFixed(2)} ha`
  }
  return `${Math.round(value)} m²`
}


// Méthode pour formater le nom d'une catégorie
const formatCategoryName = (category: string): string => {
  // Si c'est une catégorie par défaut, retourner le nom tel quel
  if (defaultCategories.value.includes(category)) {
    return category;
  }

  // Pour les catégories personnalisées, formater le nom
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Fonction pour désélectionner la forme actuelle
const deselectCurrentShape = () => {
  // Désélectionner la forme actuelle si nécessaire
  if (props.selectedShape) {
    emit('tool-selected', ''); // Désélectionne l'outil actuel
  }
};

// Fonction pour créer un nouveau filtre
async function createFilter() {
  if (!newFilter.name || isCreatingFilter.value) return;

  isCreatingFilter.value = true;
  try {
    // Utiliser le nom du filtre comme catégorie
    const category = newFilter.name.toLowerCase().replace(/\s+/g, '_');

    // Récupérer l'ID de l'entreprise du plan actuel ou de l'utilisateur connecté
    const currentPlan = irrigationStore.currentPlan;

    // Essayer d'obtenir l'ID d'entreprise de différentes sources
    let entrepriseId = null;

    // 1. Essayer d'obtenir l'ID d'entreprise du plan actuel
    if (currentPlan?.entreprise_id) {
      entrepriseId = currentPlan.entreprise_id;
    }
    // 2. Essayer d'obtenir l'ID d'entreprise de l'objet entreprise du plan
    else if (currentPlan?.entreprise && typeof currentPlan.entreprise === 'object' && 'id' in currentPlan.entreprise) {
      entrepriseId = (currentPlan.entreprise as any).id;
    }
    // 3. Essayer d'obtenir l'ID d'entreprise de l'utilisateur connecté
    else if (authStore.user?.enterprise_id) {
      entrepriseId = authStore.user.enterprise_id;
    }
    // 4. Si l'utilisateur est une entreprise, utiliser son ID
    else if (authStore.isEntreprise && authStore.user?.id) {
      entrepriseId = authStore.user.id;
    }

    if (!entrepriseId) {
      return;
    }

    // Créer le filtre via le store
    const newMapFilter = await mapFilterStore.createFilter({
      name: newFilter.name,
      category: category,
      entreprise: entrepriseId
    });

    // Ajouter la catégorie au filtre local
    if (!filters.categories[category]) {
      filters.categories[category] = true;
    }

    // Mettre à jour le DrawingStore avec la nouvelle catégorie
    const updatedCategories = { ...drawingStore.filters.categories };
    updatedCategories[category] = true;
    drawingStore.updateFilters({ categories: updatedCategories });

    // Émettre un événement pour indiquer que les filtres ont changé
    emit('filter-change', filters);

    // Réinitialiser le formulaire
    newFilter.name = '';
  } catch (error) {
    // Gérer l'erreur silencieusement
  } finally {
    isCreatingFilter.value = false;
  }
};

// Méthode pour passer à l'onglet filtres et désélectionner la forme actuelle
const switchToFiltersTab = () => {
  try {
    // Désélectionner la forme actuelle
    deselectCurrentShape();

    // Passer à l'onglet filtres
    activeTab.value = 'filters';
    
    // Emit the tab change event
    emit('tab-change', 'filters');
  } catch (error) {
    console.error('Error switching to filters tab:', error);
    // Fallback - set the tab directly
    activeTab.value = 'filters';
  }
}

// Define emits
const emit = defineEmits([
  'update:show', 
  'tool-selected', 
  'style-update', 
  'properties-update', 
  'delete-shape', 
  'filter-change', 
  'close-drawer',
  'tab-change'
])

// Watch for changes in the selected shape to update the style controls
watchEffect(() => {
  if (props.selectedShape) {
    // Récupérer le style de la forme sélectionnée
    const style = props.selectedShape.options || {}

    // Mettre à jour les propriétés de style générales
    strokeColor.value = style.color || '#2b6451'
    strokeWidth.value = style.weight || 3
    strokeStyle.value = style.dashArray ? 'dashed' : 'solid'
    fillColor.value = style.fillColor || '#2b6451'
    fillOpacity.value = style.fillOpacity || 0.2

    // Déterminer si les options de remplissage doivent être affichées en fonction du type de forme
    const shapeType = props.selectedShape.type || props.selectedShape.properties?.type || '';
    showFillOptions.value = shapeType !== 'Line';

    // Mettre à jour le nom de la forme
    shapeName.value = props.selectedShape.properties?.name || ''

    // Mettre à jour la catégorie de la forme
    shapeCategory.value = props.selectedShape.properties?.category || 'forages' // Utiliser 'forages' comme valeur par défaut

    // Mettre à jour le niveau d'accès de la forme
    accessLevel.value = props.selectedShape.properties?.accessLevel || 'visitor'
  }
})

// Initialiser les filtres avec les valeurs du store seulement au montage du composant
onMounted(async () => {
  const storeFilters = drawingStore.filters;

  // Initialiser les filtres locaux avec les valeurs du store
  // Accès directs pour éviter les problèmes de typage
  filters.accessLevels.company = storeFilters.accessLevels.company;
  filters.accessLevels.employee = storeFilters.accessLevels.employee;
  filters.accessLevels.visitor = storeFilters.accessLevels.visitor;

  // Catégories
  filters.categories.forages = storeFilters.categories.forages;
  filters.categories.clients = storeFilters.categories.clients;
  filters.categories.entrepots = storeFilters.categories.entrepots;
  filters.categories.livraisons = storeFilters.categories.livraisons;
  filters.categories.cultures = storeFilters.categories.cultures;
  filters.categories.parcelles = storeFilters.categories.parcelles;

  // Types de formes
  filters.shapeTypes.Polygon = storeFilters.shapeTypes.Polygon;
  filters.shapeTypes.Line = storeFilters.shapeTypes.Line;
  filters.shapeTypes.Note = storeFilters.shapeTypes.Note;

  // Charger les filtres personnalisés depuis l'API
  try {
    await mapFilterStore.fetchFilters();

    // Récupérer les catégories uniques des filtres personnalisés
    const customCategories = mapFilterStore.getUniqueCategories;
    
    // Ajouter les catégories personnalisées aux filtres
    const categoriesAdded: string[] = [];
    customCategories.forEach(category => {
      // Ne pas ajouter les catégories par défaut qui existent déjà
      if (!defaultCategories.value.includes(category) && !filters.categories[category]) {
        filters.categories[category] = true;
        categoriesAdded.push(category);
      }
    });

    // Si des catégories ont été ajoutées, mettre à jour le store
    if (categoriesAdded.length > 0) {
      drawingStore.updateFilters({ categories: filters.categories });
      // Émettre un événement pour indiquer que les filtres ont changé
      emit('filter-change', filters);
    }
  } catch (error) {
    // Gérer silencieusement l'erreur
  }
});

// Observer les changements dans les filtres et appliquer automatiquement
// Utiliser watch au lieu de watchEffect pour éviter les problèmes de variables non utilisées
watch(filters, (newFilters, oldFilters) => {
  // Détecter les différences entre les anciens et les nouveaux filtres
  const accessLevelsDiff = Object.keys(newFilters.accessLevels).filter(key =>
    oldFilters.accessLevels[key as keyof typeof oldFilters.accessLevels] !==
    newFilters.accessLevels[key as keyof typeof newFilters.accessLevels]
  );

  const categoriesDiff = Object.keys(newFilters.categories).filter(key =>
    oldFilters.categories[key as keyof typeof oldFilters.categories] !==
    newFilters.categories[key as keyof typeof newFilters.categories]
  );

  const shapeTypesDiff = Object.keys(newFilters.shapeTypes).filter(key =>
    oldFilters.shapeTypes[key as keyof typeof oldFilters.shapeTypes] !==
    newFilters.shapeTypes[key as keyof typeof newFilters.shapeTypes]
  );

  // Vérifier s'il y a des changements réels dans les filtres
  const hasChanges = accessLevelsDiff.length > 0 || categoriesDiff.length > 0 || shapeTypesDiff.length > 0;

  // Appliquer les filtres automatiquement lorsque l'onglet filtres est actif
  if (activeTab.value === 'filters') {
    // Appliquer les filtres immédiatement
    applyFilters();
  }
}, { deep: true });

// Méthode pour gérer le clic sur un outil
const handleToolClick = (toolType: string) => {
  try {
    // Make sure we have a valid toolType
    if (!toolType || typeof toolType !== 'string') {
      console.warn('Invalid tool type:', toolType);
      return;
    }
    
    // Émettre l'événement tool-selected
    // Si l'outil cliqué est déjà sélectionné, on le désélectionne, sinon on le sélectionne
    emit('tool-selected', props.selectedTool === toolType ? '' : toolType);

    // Sur mobile, fermer le panneau d'outils après la sélection
    if (window.innerWidth < 768) {
      emit('update:show', false);
    }
  } catch (error) {
    console.error('Error handling tool click:', error);
  }
}

// Méthode pour éditer une GeoNote
const editGeoNote = () => {
  // Fermer le panneau DrawingTools avant d'ouvrir le modal d'édition
  // pour éviter que le modal soit masqué
  emit('update:show', false);

  if (props.selectedShape && props.selectedShape.properties?.type === 'Note') {
    // Accéder à l'instance de GeoNote via la propriété layer
    const geoNote = props.selectedShape.layer;

    if (geoNote && typeof geoNote.editNote === 'function') {
      // Appeler la méthode editNote de la GeoNote
      geoNote.editNote();
    }
  }
}

// Méthode pour ouvrir l'itinéraire Google Maps pour une GeoNote
const openGeoNoteRoute = () => {
  // Fermer le panneau DrawingTools avant d'ouvrir Google Maps
  emit('update:show', false);

  if (props.selectedShape && props.selectedShape.properties?.type === 'Note') {
    // Accéder à l'instance de GeoNote via la propriété layer
    const geoNote = props.selectedShape.layer;

    if (geoNote && typeof geoNote.openInGoogleMaps === 'function') {
      // Appeler la méthode openInGoogleMaps de la GeoNote
      geoNote.openInGoogleMaps();
    }
  }
}
</script>

<style scoped>
/* Styles de base */
.drawing-tools-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  @apply bg-white;
  min-height: 0;
  overflow: hidden;
}

/* Structure flex pour permettre le défilement */
.flex-1 {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* Contenu principal des onglets */
.overflow-hidden.flex.flex-col {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* Contenu scrollable des tabs */
.tab-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 1rem;
}

/* Tabs navigation container */
.tabs-container {
  height: 40px;
  flex-shrink: 0;
}

/* Style d'onglet */
.tab-item {
  @apply font-medium text-gray-500 py-1;
  user-select: none;
}

/* Style d'onglet actif */
.active-tab {
  @apply text-primary-600 border-b-2 border-primary-500;
}

/* Ajustements responsive */
@media (max-width: 767px) {
  .tab-content {
    padding-bottom: 60px;
  }
  
  .drawing-tools-panel {
    @apply fixed bottom-0 left-0 right-0 z-[2000];
    height: 80vh;
    transform: translateY(100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border-top-left-radius: 1rem;
    border-top-right-radius: 1rem;
    box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -1px rgba(0, 0, 0, 0.06);
  }

  .drawing-tools-panel.open {
    transform: translateY(0);
  }

  /* Styles spécifiques pour le panneau téléporté */
  :root body > .drawing-tools-panel {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 2500;
    margin: 0;
    max-width: 100%;
    width: 100%;
  }

  /* Ajouter un espace en haut de l'en-tête pour mobile */
  .drawing-tools-panel .flex-mobile {
    padding-top: 15px !important;
  }

  /* Afficher flex uniquement sur mobile */
  .flex-mobile {
    display: flex !important;
  }
}

@media (min-width: 768px) {
  .drawing-tools-panel {
    @apply relative border-l border-gray-200;
    width: var(--drawing-tools-width-desktop, 20rem);
    height: calc(100vh - var(--header-height) - var(--toolbar-height));
  }
}

.h-full {
  height: 100%;
}

.flex {
  display: flex;
}

.flex-col {
  flex-direction: column;
}

.bg-white {
  background-color: white;
}

.overflow-y-auto {
  overflow-y: auto;
}

.p-3 {
  padding: 1rem;
}

.border-b {
  border-bottom: 1px solid #e2e8f0;
}

.text-sm {
  font-size: 0.875rem;
}

.font-semibold {
  font-weight: 600;
}

.text-gray-700 {
  color: #334155;
}

.sidebar-header {
  padding: 10px;
  background-color: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-title {
  font-size: 16px;
  font-weight: 600;
  color: #334155;
  margin: 0;
}

.tools-section {
  padding: 10px;
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 5px;
}

.tool-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5px;
  border-radius: 4px;
  border: 1px solid #cbd5e1;
  background-color: white;
  color: #475569;
  transition: all 0.2s;
}

.tool-button:hover {
  background-color: #f1f5f9;
}

.tool-button.active {
  background-color: #e0f2fe;
  border-color: #7dd3fc;
  color: #2b6451;
}

.delete-button {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 5px;
  padding: 5px;
  width: 100%;
  border-radius: 4px;
  border: 1px solid #f87171;
  background-color: #fee2e2;
  color: #ef4444;
  transition: all 0.2s;
}

.delete-button:hover {
  background-color: #fecaca;
}

.delete-button.active {
  background-color: #fca5a5;
}

.sidebar-divider {
  height: 1px;
  background-color: #e2e8f0;
  margin: 0 10px;
}

.properties-container {
  padding: 10px;
  flex: 1;
  overflow-y: auto;
  max-height: calc(100vh - 200px);
  /* Ensure it doesn't overflow the viewport */
}

.sidebar-section {
  margin-bottom: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 8px 10px;
  background-color: #f8fafc;
  border: none;
  text-align: left;
  cursor: pointer;
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  color: #334155;
}

.section-icon {
  width: 16px;
  height: 16px;
  transition: transform 0.2s;
}

.section-content {
  padding: 10px;
  background-color: white;
  max-height: 350px;
  /* Add max height to ensure it's scrollable */
  overflow-y: auto;
  /* Make it scrollable when content overflows */
}

/* Specific styles for text controls to ensure they're visible */
.text-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 10px;
  /* Add padding to ensure last items are visible */
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 5px;
  margin-bottom: 10px;
}

.color-button {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: transform 0.2s;
}

.color-button:hover {
  transform: scale(1.2);
}

.style-controls,
.text-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-label {
  width: 60px;
  font-size: 12px;
  color: #64748b;
}

.control-inputs {
  display: flex;
  flex: 1;
  gap: 5px;
  align-items: center;
}

.color-input {
  width: 20px;
  height: 20px;
  padding: 0;
  border: 1px solid #e2e8f0;
  cursor: pointer;
}

.range-input {
  flex: 1;
  height: 4px;
}

.select-input {
  width: 100%;
  padding: 2px 5px;
  font-size: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 3px;
  background-color: white;
}

.button-group {
  display: flex;
  border: 1px solid #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
}

.align-button,
.style-button {
  padding: 2px 6px;
  font-size: 12px;
  background-color: white;
  border: none;
  border-right: 1px solid #e2e8f0;
}

.align-button:last-child,
.style-button:last-child {
  border-right: none;
}

.align-button.active,
.style-button.active {
  background-color: #e0f2fe;
  color: #2b6451;
}

.properties-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
}

.property-label {
  font-size: 12px;
  color: #64748b;
}

.property-value {
  font-size: 12px;
  font-weight: 500;
  color: #334155;
  text-align: right;
}

.no-properties {
  text-align: center;
  color: #94a3b8;
  font-size: 12px;
  padding: 10px 0;
}

/* Pour les écrans plus petits */
@media (max-width: 640px) {
  .drawing-tools-sidebar {
    width: 100%;
  }

  .sidebar-title {
    font-size: 14px;
  }

  .tool-button,
  .color-button {
    width: 24px;
    height: 24px;
  }

  .control-label {
    width: 60px;
    font-size: 12px;
  }

  .property-label,
  .property-value {
    font-size: 12px;
  }

  .icon svg {
    width: 20px;
    height: 20px;
  }

  /* Améliorer les contrôles tactiles */
  input[type="range"] {
    height: 8px;
  }

  input[type="range"]::-webkit-slider-thumb {
    width: 20px;
    height: 20px;
  }

  input[type="color"] {
    height: 40px;
  }

  /* Augmenter l'espacement pour les contrôles tactiles */
  .control-row {
    margin-bottom: 12px;
  }

  .section-content {
    padding: 16px;
  }
}

/* Animations */
.rotate-180 {
  transform: rotate(180deg);
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 100%;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.switch-label {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #e2e8f0;
  border-radius: 12px;
  transition: .4s;
  text-align: center;
  line-height: 24px;
  font-size: 12px;
  color: #475569;
}

.switch-label:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  border-radius: 50%;
  transition: .4s;
}

input:checked+.switch-label {
  background-color: #3b82f6;
  color: white;
}

input:checked+.switch-label:before {
  transform: translateX(calc(100% - 6px));
}

input:focus+.switch-label {
  box-shadow: 0 0 1px #3b82f6;
}

/* Styles pour les inputs de type range */
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: #e2e8f0;
  outline: none;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #3B82F6;
  cursor: pointer;
}

/* Styles pour les inputs de type color */
input[type="color"] {
  -webkit-appearance: none;
  appearance: none;
  padding: 0;
  border: none;
  border-radius: 4px;
  height: 32px;
}

input[type="color"]::-webkit-color-swatch-wrapper {
  padding: 0;
}

input[type="color"]::-webkit-color-swatch {
  border: none;
  border-radius: 4px;
}

.elevation-profile-container {
  width: 100% !important;
  height: 200px;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  position: relative;
  overflow: hidden;
  margin-top: 1rem;
}

canvas {
  width: 100% !important;
  height: 100%;
  display: block;
}

.elevation-tooltip {
  z-index: 1000;
  white-space: nowrap;
}

/* Ajout de styles pour les propriétés */
.whitespace-nowrap {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Ajuster la largeur de la section des propriétés */
.properties-container {
  min-width: 280px;
  padding: 1rem;
}

/* Ajuster l'espacement des propriétés */
.space-y-2>*+* {
  margin-top: 0.5rem;
}

/* Ajuster l'espacement entre le label et la valeur */
.flex.justify-between>.ml-2 {
  margin-left: 1rem;
}

/* Ajout pour les sections du cercle */
.left-25\% {
  left: 25%;
}

.left-50\% {
  left: 50%;
}

.left-75\% {
  left: 75%;
}

.-ml-2 {
  margin-left: -0.5rem;
}

.-mr-6 {
  margin-right: -1.5rem;
}

/* Add styles for the tooltip that shows when groups are connected */
:global(.connected-group-tooltip) {
  background-color: rgba(59, 130, 246, 0.9);
  color: white;
  font-weight: bold;
  border: none;
  padding: 5px 10px;
  border-radius: 15px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

:global(.connected-group-tooltip::before) {
  display: none;
}

:global(.connected-group-tooltip div) {
  text-align: center;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Support for pattern display */
.pattern-dot {
  background-image: radial-gradient(circle, #3B82F6 1px, transparent 1px);
  background-size: 5px 5px;
}

.filters-tab {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 1rem;
  flex: 1;
  min-height: 0;
}

.filters-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: min-content;
  padding-bottom: 20px;
}

@media (max-width: 767px) {
  .filters-tab {
    max-height: calc(80vh - 50px);
    padding-bottom: 20px;
  }
}

@media (min-width: 768px) {
  .filters-tab {
    max-height: calc(100vh - 120px);
  }
}

/* Ajuster la hauteur du conteneur de la carte */
.map-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}
</style>