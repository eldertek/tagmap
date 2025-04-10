<!-- DrawingTools.vue -->
<template>
  <div class="drawing-tools-panel" :class="{ 'open': show }">
    <!-- En-tête sur mobile -->
    <div class="mobile-header">
      <div class="header-content">
        <div class="drag-handle">
          <div class="handle-bar"></div>
        </div>
        <h3 class="header-title">Outils de dessin</h3>
        <button @click="$emit('update:show', false)" class="close-button">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Navigation par onglets -->
    <div class="tabs-navigation">
      <button 
        @click="activeTab = 'tools'"
        :class="['tab-button', { 'active': activeTab === 'tools' }]"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
        <span>Outils</span>
      </button>
      <button 
        v-if="selectedShape && selectedShape.properties?.type !== 'Note'"
        @click="activeTab = 'style'"
        :class="['tab-button', { 'active': activeTab === 'style' }]"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
        <span>Style</span>
      </button>
    </div>

    <!-- Contenu scrollable -->
    <div class="content-container">
      <!-- Onglet Outils -->
      <div v-if="activeTab === 'tools'" class="tab-content">
        <!-- Outils de dessin -->
        <div class="tools-grid">
          <button 
            v-for="tool in drawingTools.filter(t => t.type !== 'delete')" 
            :key="tool.type"
            class="tool-button"
            :class="{ 'active': props.selectedTool === tool.type }"
            @click="handleToolClick(tool.type)"
            :title="tool.label"
          >
            <span class="icon" v-html="getToolIcon(tool.type)"></span>
            <span class="tool-label">{{ tool.label }}</span>
          </button>
        </div>

        <!-- Actions pour les GeoNotes -->
        <div v-if="selectedShape && localProperties && localProperties.type === 'Note'" class="note-actions">
          <button class="action-button edit" @click="editGeoNote">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Éditer</span>
          </button>
          <button class="action-button route" @click="openGeoNoteRoute">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span>Itinéraire</span>
          </button>
        </div>

        <!-- Bouton de suppression -->
        <button 
          v-if="selectedShape"
          class="delete-button"
          :class="{ 'active': props.selectedTool === 'delete' }"
          @click="$emit('delete-shape')"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span>Supprimer</span>
        </button>

        <!-- Propriétés de la forme -->
        <div v-if="selectedShape && localProperties" class="shape-properties">
          <div class="property-group">
            <h4 class="property-title">Propriétés</h4>
            <div class="property-content">
              <!-- Polygone -->
              <template v-if="localProperties.type === 'Polygon'">
                <div class="property-item">
                  <span class="property-label">Surface</span>
                  <span class="property-value">{{ formatArea(localProperties.surface || 0) }}</span>
                </div>
                <div class="property-item">
                  <span class="property-label">Périmètre</span>
                  <span class="property-value">{{ formatLength(localProperties.perimeter || 0) }}</span>
                </div>
              </template>

              <!-- Ligne -->
              <template v-else-if="localProperties.type === 'Line'">
                <div class="property-item">
                  <span class="property-label">Longueur</span>
                  <span class="property-value">{{ formatLength(localProperties.length || 0) }}</span>
                </div>
              </template>

              <!-- Ligne d'élévation -->
              <template v-else-if="localProperties.type === 'ElevationLine'">
                <div class="property-item">
                  <span class="property-label">Longueur</span>
                  <span class="property-value">{{ formatLength(localProperties.length || 0) }}</span>
                </div>
                <div class="property-item">
                  <span class="property-label">Dénivelé</span>
                  <span class="property-value">{{ formatLength(localProperties.elevation || 0) }}</span>
                </div>
                <div class="property-item">
                  <span class="property-label">Pente</span>
                  <span class="property-value">{{ formatSlope(localProperties.slope || 0) }}</span>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- Onglet Style -->
      <div v-if="activeTab === 'style' && selectedShape && selectedShape.properties?.type !== 'Note'" class="tab-content">
        <!-- Couleurs prédéfinies -->
        <div class="color-picker">
          <div class="color-grid">
            <button 
              v-for="color in predefinedColors" 
              :key="color" 
              class="color-button"
              :style="{ backgroundColor: color }"
              @click="selectPresetColor(color)"
            ></button>
          </div>
        </div>

        <!-- Contrôles de style -->
        <div class="style-controls">
          <!-- Contour -->
          <div class="style-group">
            <h4 class="style-title">Contour</h4>
            <div class="style-inputs">
              <input type="color" v-model="strokeColor" @change="updateStyle({ strokeColor })" />
              <input type="range" v-model="strokeWidth" min="1" max="10" @change="updateStyle({ strokeWidth })" />
              <span class="value-label">{{ strokeWidth }}px</span>
            </div>
          </div>

          <!-- Style de trait -->
          <div class="style-group">
            <h4 class="style-title">Style de trait</h4>
            <select v-model="strokeStyle" @change="updateStyle({ strokeStyle })" class="style-select">
              <option v-for="style in strokeStyles" :key="style.value" :value="style.value">
                {{ style.label }}
              </option>
            </select>
          </div>

          <!-- Remplissage -->
          <div v-if="showFillOptions" class="style-group">
            <h4 class="style-title">Remplissage</h4>
            <div class="style-inputs">
              <input type="color" v-model="fillColor" @change="updateStyle({ fillColor })" />
              <input type="range" v-model="fillOpacity" min="0" max="1" step="0.1" @change="updateStyle({ fillOpacity })" />
              <span class="value-label">{{ Math.round(fillOpacity * 100) }}%</span>
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
      return '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 2l4 4m-6 0l2-2 4 4-2 2-4-4z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h8" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 14h4" /></svg>'
    default:
      return ''
  }
}

// Define reactive variables for the component
const activeTab = ref('tools') // Onglet actif par défaut

// Observer les changements de l'outil sélectionné
watch(() => props.selectedTool, (newTool, oldTool) => {
  console.log('[DrawingTools][watch selectedTool] Changement d\'outil:', { newTool, oldTool });
});

// Watch for tab changes to ensure filters are applied when switching to the filters tab
watch(activeTab, (newTab, oldTab) => {
  console.log('[DrawingTools][watch activeTab] Changement d\'onglet:', { newTab, oldTab });

  // If we're switching to the filters tab, make sure filters are up to date
  if (newTab === 'filters' && oldTab !== 'filters') {
    // Just ensure the UI reflects the current state
    console.log('[DrawingTools][watch activeTab] Passage à l\'onglet filtres');
    console.log('[DrawingTools][watch activeTab] État actuel des filtres dans le store:', JSON.stringify({
      accessLevels: { ...drawingStore.filters.accessLevels },
      categories: { ...drawingStore.filters.categories },
      shapeTypes: { ...drawingStore.filters.shapeTypes }
    }, null, 2));
    console.log('[DrawingTools][watch activeTab] État actuel des filtres locaux:', JSON.stringify({
      accessLevels: { ...filters.accessLevels },
      categories: { ...filters.categories },
      shapeTypes: { ...filters.shapeTypes }
    }, null, 2));

    // Désélectionner la forme actuelle lorsqu'on passe à l'onglet filtres
    if (props.selectedShape) {
      console.log('[DrawingTools][watch activeTab] Désélection de la forme actuelle lors du passage à l\'onglet filtres');
      emit('tool-selected', ''); // Désélectionne l'outil actuel
    }

    // Appliquer les filtres immédiatement lors du passage à l'onglet filtres
    setTimeout(() => {
      applyFilters();
    }, 0);
  }

  // If we're leaving the filters tab, apply any pending changes
  if (oldTab === 'filters' && newTab !== 'filters') {
    console.log('[DrawingTools][watch activeTab] Sortie de l\'onglet filtres, application des changements');
    console.log('[DrawingTools][watch activeTab] État des filtres locaux avant application:', JSON.stringify({
      accessLevels: { ...filters.accessLevels },
      categories: { ...filters.categories },
      shapeTypes: { ...filters.shapeTypes }
    }, null, 2));
    applyFilters();
  }
})

const sectionsCollapsed = ref({
  samplePoints: true,
  circleSections: true
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

// Sample point styles
const samplePointStyle = ref({
  radius: 4,
  color: '#2b6451',
  fillOpacity: 0.6,
  weight: 2
})

// Min/max point styles
const minMaxPointStyle = ref({
  radius: 6,
  color: '#EF4444',
  fillOpacity: 0.8,
  weight: 2
})

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
  ElevationLine: boolean;
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
    ElevationLine: true,
    Note: true
  }
});

// Méthode pour mettre à jour le niveau d'accès sélectionné
const updateAccessLevelFilter = (level: string) => {
  console.log(`[DrawingTools][updateAccessLevelFilter] Changement du niveau d'accès: ${level}`);

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
  console.log(`[DrawingTools][updateAccessLevelFilterAndDeselect] Changement du niveau d'accès: ${level}`);

  // Désélectionner la forme actuelle si nécessaire
  if (props.selectedShape) {
    console.log('[DrawingTools][updateAccessLevelFilterAndDeselect] Désélection de la forme actuelle');
    emit('tool-selected', ''); // Désélectionne l'outil actuel
  }

  // Appeler la fonction de mise à jour standard
  updateAccessLevelFilter(level);
};

// Log des filtres initiaux
console.log('[DrawingTools] Initialisation des filtres:', JSON.stringify({
  local: {
    accessLevels: { ...filters.accessLevels },
    categories: { ...filters.categories },
    shapeTypes: { ...filters.shapeTypes }
  },
  store: {
    accessLevels: { ...drawingStore.filters.accessLevels },
    categories: { ...drawingStore.filters.categories },
    shapeTypes: { ...drawingStore.filters.shapeTypes }
  }
}, null, 2));

// Computed property to get the properties from the selected shape
const localProperties = computed(() => {
  if (!props.selectedShape) return null
  return props.selectedShape.properties || null
})

// Define types for method parameters
type SectionKey = 'samplePoints' | 'circleSections';
type StyleProps = { [key: string]: any };

// Methods
const toggleSection = (section: SectionKey): void => {
  // Comportement simple : basculer l'état de la section
  sectionsCollapsed.value[section] = !sectionsCollapsed.value[section];
}

const selectPresetColor = (color: string): void => {
  strokeColor.value = color
  fillColor.value = color
  updateStyle({ strokeColor: color, fillColor: color })
}

const updateStyle = (styleProps: StyleProps): void => {
  if (!props.selectedShape) return

  // Convertir le style de trait en dashArray pour Leaflet
  if (styleProps.strokeStyle) {
    switch (styleProps.strokeStyle) {
      case 'dashed':
        styleProps.dashArray = '10, 10'
        break
      case 'dotted':
        styleProps.dashArray = '2, 8'
        break
      case 'solid':
        styleProps.dashArray = null
        break
    }
    // Supprimer strokeStyle car il n'est pas utilisé par Leaflet
    delete styleProps.strokeStyle
  }

  // Emit the style update to the parent component
  emit('style-update', styleProps)
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

const updateSamplePointStyle = (): void => {
  if (!props.selectedShape || localProperties.value?.type !== 'ElevationLine') return

  // Emit the style update to the parent component
  emit('style-update', { samplePointStyle: samplePointStyle.value })
}

const updateMinMaxPointStyle = (): void => {
  if (!props.selectedShape || localProperties.value?.type !== 'ElevationLine') return

  // Emit the style update to the parent component
  emit('style-update', { minMaxPointStyle: minMaxPointStyle.value })
}

// Méthode pour réinitialiser les filtres
const resetFilters = (): void => {
  console.log('[DrawingTools][resetFilters] Début de la réinitialisation des filtres');
  console.log('[DrawingTools][resetFilters] État actuel des filtres:', JSON.stringify({
    accessLevels: { ...filters.accessLevels },
    categories: { ...filters.categories },
    shapeTypes: { ...filters.shapeTypes }
  }, null, 2));

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
      ElevationLine: true,
      Note: true
    }
  };

  console.log('[DrawingTools][resetFilters] Nouveaux filtres à appliquer:', JSON.stringify(resetedFilters, null, 2));

  // Mettre à jour directement les filtres locaux
  console.log('[DrawingTools][resetFilters] Mise à jour des filtres locaux');

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
  filters.shapeTypes.ElevationLine = true;
  filters.shapeTypes.Note = true;

  // Vérifier que les filtres locaux ont bien été mis à jour
  console.log('[DrawingTools][resetFilters] Filtres locaux après mise à jour:', JSON.stringify({
    accessLevels: { ...filters.accessLevels },
    categories: { ...filters.categories },
    shapeTypes: { ...filters.shapeTypes }
  }, null, 2));

  // Mettre à jour les filtres dans le store
  console.log('[DrawingTools][resetFilters] Mise à jour des filtres dans le store');
  drawingStore.updateFilters(resetedFilters);

  // Émettre un événement pour indiquer que les filtres ont changé
  console.log('[DrawingTools][resetFilters] Émission de l\'event filter-change');
  emit('filter-change', resetedFilters);

  // Forcer la mise à jour de l'affichage
  console.log('[DrawingTools][resetFilters] Mise à jour forcée de l\'affichage');

  console.log('[DrawingTools][resetFilters] Filtres réinitialisés avec succès');
}

// Méthode pour réinitialiser les filtres et désélectionner la forme actuelle
const resetFiltersAndDeselect = (): void => {
  console.log('[DrawingTools][resetFiltersAndDeselect] Début de la réinitialisation des filtres avec désélection');

  // Désélectionner la forme actuelle si nécessaire
  deselectCurrentShape();

  // Réinitialiser les filtres
  resetFilters();

  console.log('[DrawingTools][resetFiltersAndDeselect] Filtres réinitialisés et forme désélectionnée avec succès');
}

// Méthode pour appliquer les filtres
const applyFilters = (): void => {
  // Créer des copies des filtres pour les logs et les mises à jour
  const accessLevelsCopy = { ...filters.accessLevels };
  const categoriesCopy = { ...filters.categories };
  const shapeTypesCopy = { ...filters.shapeTypes };

  console.log('[DrawingTools][applyFilters] Application des filtres:', JSON.stringify({
    accessLevels: accessLevelsCopy,
    categories: categoriesCopy,
    shapeTypes: shapeTypesCopy
  }, null, 2));

  // Toujours mettre à jour les filtres dans le store
  const filtersToUpdate = {
    accessLevels: accessLevelsCopy,
    categories: categoriesCopy,
    shapeTypes: shapeTypesCopy
  };

  console.log('[DrawingTools][applyFilters] Envoi des filtres au store:', JSON.stringify(filtersToUpdate, null, 2));
  drawingStore.updateFilters(filtersToUpdate);

  // Émettre un événement pour indiquer que les filtres ont changé
  console.log('[DrawingTools][applyFilters] Émission de l\'event filter-change');
  emit('filter-change', filtersToUpdate);

  // Forcer la mise à jour de l'affichage
  setTimeout(() => {
    console.log('[DrawingTools][applyFilters] Mise à jour forcée de l\'affichage');
    window.dispatchEvent(new CustomEvent('filtersChanged', {
      detail: {
        filters: filtersToUpdate
      }
    }));
  }, 0);

  console.log('[DrawingTools][applyFilters] Filtres appliqués avec succès');
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

const formatSlope = (value: number): string => {
  return `${value.toFixed(1)}%`
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
    console.log('[DrawingTools][deselectCurrentShape] Désélection de la forme actuelle');
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
      console.error('[DrawingTools] Impossible de créer un filtre: ID d\'entreprise non disponible');
      return;
    }

    console.log('[DrawingTools] Création d\'un filtre pour l\'entreprise:', entrepriseId);

    // Créer le filtre via le store
    const newMapFilter = await mapFilterStore.createFilter({
      name: newFilter.name,
      category: category,
      entreprise: entrepriseId
    });

    console.log('[DrawingTools] Filtre créé avec succès:', newMapFilter);

    // Ajouter la catégorie au filtre local
    if (!filters.categories[category]) {
      console.log(`[DrawingTools] Ajout de la catégorie ${category} aux filtres locaux`);
      filters.categories[category] = true;
    }

    // Mettre à jour le DrawingStore avec la nouvelle catégorie
    console.log(`[DrawingTools] Mise à jour du DrawingStore avec la catégorie ${category}`);
    const updatedCategories = { ...drawingStore.filters.categories };
    updatedCategories[category] = true;
    drawingStore.updateFilters({ categories: updatedCategories });

    // Émettre un événement pour indiquer que les filtres ont changé
    console.log('[DrawingTools] Émission de l\'événement filter-change');
    emit('filter-change', filters);

    // Réinitialiser le formulaire
    newFilter.name = '';
  } catch (error) {
    console.error('[DrawingTools] Erreur lors de la création du filtre:', error);
  } finally {
    isCreatingFilter.value = false;
  }
};

// Fonction pour passer à l'onglet filtres et désélectionner la forme actuelle
const switchToFiltersTab = () => {
  // Désélectionner la forme actuelle
  deselectCurrentShape();

  // Passer à l'onglet filtres
  activeTab.value = 'filters';
}

// Define emits
const emit = defineEmits(['update:show', 'tool-selected', 'style-update', 'properties-update', 'delete-shape', 'filter-change', 'close-drawer'])

// Watch for changes in the selected shape to update the style controls
watchEffect(() => {
  if (props.selectedShape) {
    console.log('[DrawingTools][watchEffect] Mise à jour des propriétés pour la forme sélectionnée:', {
      type: props.selectedShape.type,
      properties: props.selectedShape.properties,
      options: props.selectedShape.options,
      layer: props.selectedShape.layer?._leaflet_id
    });

    // Récupérer le style de la forme sélectionnée
    const style = props.selectedShape.options || {}

    // Mettre à jour les propriétés de style générales
    strokeColor.value = style.color || '#2b6451'
    strokeWidth.value = style.weight || 3
    
    // Déterminer le style de trait en fonction du dashArray
    if (style.dashArray === '10, 10') {
      strokeStyle.value = 'dashed'
    } else if (style.dashArray === '2, 8') {
      strokeStyle.value = 'dotted'
    } else {
      strokeStyle.value = 'solid'
    }
    
    fillColor.value = style.fillColor || '#2b6451'
    fillOpacity.value = style.fillOpacity || 0.2

    // Déterminer si les options de remplissage doivent être affichées en fonction du type de forme
    const shapeType = props.selectedShape.type || props.selectedShape.properties?.type || '';
    showFillOptions.value = shapeType !== 'Line';

    console.log('[DrawingTools][watchEffect] Type de forme détecté:', shapeType);

    // Mettre à jour le nom de la forme
    shapeName.value = props.selectedShape.properties?.name || ''

    // Mettre à jour la catégorie de la forme
    shapeCategory.value = props.selectedShape.properties?.category || 'forages' // Utiliser 'forages' comme valeur par défaut

    // Mettre à jour le niveau d'accès de la forme
    accessLevel.value = props.selectedShape.properties?.accessLevel || 'visitor'

    // Mettre à jour les propriétés spécifiques au type de forme
    if (shapeType === 'ElevationLine') {
      // Propriétés spécifiques aux lignes d'élévation
      if (props.selectedShape.properties?.samplePointStyle) {
        samplePointStyle.value = { ...props.selectedShape.properties.samplePointStyle };
      }
      if (props.selectedShape.properties?.minMaxPointStyle) {
        minMaxPointStyle.value = { ...props.selectedShape.properties.minMaxPointStyle };
      }
    }

    console.log('[DrawingTools][watchEffect] Propriétés mises à jour avec succès');
  }
})

// Initialiser les filtres avec les valeurs du store seulement au montage du composant
onMounted(async () => {
  console.log('[DrawingTools][onMounted] Initialisation des filtres depuis le store');
  const storeFilters = drawingStore.filters;

  console.log('[DrawingTools][onMounted] Filtres du store:', JSON.stringify({
    accessLevels: { ...storeFilters.accessLevels },
    categories: { ...storeFilters.categories },
    shapeTypes: { ...storeFilters.shapeTypes }
  }, null, 2));

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
  filters.shapeTypes.ElevationLine = storeFilters.shapeTypes.ElevationLine;
  filters.shapeTypes.Note = storeFilters.shapeTypes.Note;

  // Charger les filtres personnalisés depuis l'API
  try {
    console.log('[DrawingTools][onMounted] Chargement des filtres personnalisés');
    await mapFilterStore.fetchFilters();

    // Récupérer les catégories uniques des filtres personnalisés
    const customCategories = mapFilterStore.getUniqueCategories;
    console.log('[DrawingTools][onMounted] Catégories personnalisées trouvées:', customCategories);

    // Ajouter les catégories personnalisées aux filtres
    const categoriesAdded: string[] = [];
    customCategories.forEach(category => {
      // Ne pas ajouter les catégories par défaut qui existent déjà
      if (!defaultCategories.value.includes(category) && !filters.categories[category]) {
        console.log(`[DrawingTools][onMounted] Ajout de la catégorie personnalisée: ${category}`);
        filters.categories[category] = true;
        categoriesAdded.push(category);
      }
    });

    // Si des catégories ont été ajoutées, mettre à jour le store
    if (categoriesAdded.length > 0) {
      console.log('[DrawingTools][onMounted] Mise à jour du store avec les catégories personnalisées:', categoriesAdded);
      drawingStore.updateFilters({ categories: filters.categories });
      // Émettre un événement pour indiquer que les filtres ont changé
      emit('filter-change', filters);
    }
  } catch (error) {
    console.error('[DrawingTools][onMounted] Erreur lors du chargement des filtres personnalisés:', error);
  }

  console.log('[DrawingTools][onMounted] Filtres locaux après initialisation:', JSON.stringify({
    accessLevels: { ...filters.accessLevels },
    categories: { ...filters.categories },
    shapeTypes: { ...filters.shapeTypes }
  }, null, 2));
});

// Observer les changements dans les filtres et appliquer automatiquement
// Utiliser watch au lieu de watchEffect pour éviter les problèmes de variables non utilisées
watch(filters, (newFilters, oldFilters) => {
  console.log('[DrawingTools][watch filters] Changement détecté:', {
    activeTab: activeTab.value,
    newFilters: JSON.stringify({
      accessLevels: newFilters.accessLevels,
      categories: newFilters.categories,
      shapeTypes: newFilters.shapeTypes
    }),
    oldFilters: JSON.stringify({
      accessLevels: oldFilters.accessLevels,
      categories: oldFilters.categories,
      shapeTypes: oldFilters.shapeTypes
    })
  });

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

  console.log('[DrawingTools][watch filters] Différences détectées:', {
    accessLevelsDiff,
    categoriesDiff,
    shapeTypesDiff,
    hasChanges
  });

  // Appliquer les filtres automatiquement lorsque l'onglet filtres est actif
  if (activeTab.value === 'filters') {
    console.log('[DrawingTools][watch filters] Onglet filtres actif, application des filtres');

    // Appliquer les filtres immédiatement
    applyFilters();
  } else {
    console.log('[DrawingTools][watch filters] Onglet filtres non actif, pas d\'application automatique');
  }
}, { deep: true });

// Méthode pour gérer le clic sur un outil
const handleToolClick = (toolType: string) => {
  console.log('[DrawingTools][handleToolClick] Outil cliqué:', toolType, 'Outil actuel:', props.selectedTool);

  // Émettre l'événement tool-selected
  // Si l'outil cliqué est déjà sélectionné, on le désélectionne, sinon on le sélectionne
  emit('tool-selected', props.selectedTool === toolType ? '' : toolType);

  // Sur mobile, fermer le panneau d'outils après la sélection
  if (window.innerWidth < 768) {
    emit('update:show', false);
  }
}

// Méthode pour éditer une GeoNote
const editGeoNote = () => {
  console.log('[DrawingTools][editGeoNote] Édition de la GeoNote');

  if (props.selectedShape && props.selectedShape.properties?.type === 'Note') {
    // Accéder à l'instance de GeoNote via la propriété layer
    const geoNote = props.selectedShape.layer;

    if (geoNote && typeof geoNote.editNote === 'function') {
      // Appeler la méthode editNote de la GeoNote
      geoNote.editNote();
      console.log('[DrawingTools][editGeoNote] Méthode editNote appelée avec succès');
    } else {
      console.error('[DrawingTools][editGeoNote] La méthode editNote n\'est pas disponible sur la couche');
    }
  }
}

// Méthode pour ouvrir l'itinéraire Google Maps pour une GeoNote
const openGeoNoteRoute = () => {
  console.log('[DrawingTools][openGeoNoteRoute] Ouverture de l\'itinéraire pour la GeoNote');

  if (props.selectedShape && props.selectedShape.properties?.type === 'Note') {
    // Accéder à l'instance de GeoNote via la propriété layer
    const geoNote = props.selectedShape.layer;

    if (geoNote && typeof geoNote.openInGoogleMaps === 'function') {
      // Appeler la méthode openInGoogleMaps de la GeoNote
      geoNote.openInGoogleMaps();
      console.log('[DrawingTools][openGeoNoteRoute] Méthode openInGoogleMaps appelée avec succès');
    } else {
      console.error('[DrawingTools][openGeoNoteRoute] La méthode openInGoogleMaps n\'est pas disponible sur la couche');
    }
  }
}
</script>
<style scoped>
/* Styles de base */
.drawing-tools-panel {
  @apply bg-white;
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* En-tête mobile */
.mobile-header {
  @apply bg-white border-b border-gray-200;
  padding: 0.75rem 1rem;
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-content {
  @apply flex items-center justify-between;
}

.drag-handle {
  @apply flex items-center justify-center;
  width: 2rem;
  height: 2rem;
}

.handle-bar {
  @apply bg-gray-300 rounded-full;
  width: 2rem;
  height: 0.25rem;
}

.header-title {
  @apply text-base font-semibold text-gray-800;
}

.close-button {
  @apply p-1 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100;
  position: relative;
  z-index: 20;
}

/* Navigation par onglets */
.tabs-navigation {
  @apply flex border-b border-gray-200;
  position: sticky;
  top: 3.5rem; /* Hauteur de l'en-tête mobile */
  z-index: 10;
  background-color: white;
}

.tab-button {
  @apply flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium;
  @apply text-gray-500 hover:text-gray-700 hover:bg-gray-50;
  @apply border-b-2 border-transparent;
}

.tab-button.active {
  @apply text-primary-600 border-primary-500;
}

/* Contenu */
.content-container {
  @apply flex-1 overflow-y-auto;
  padding: 1rem;
}

/* Grille d'outils */
.tools-grid {
  @apply grid grid-cols-2 gap-3 mb-4;
}

.tool-button {
  @apply flex flex-col items-center justify-center gap-2 p-3 rounded-lg;
  @apply border border-gray-200 bg-white;
  @apply hover:bg-gray-50 hover:border-gray-300;
  @apply transition-colors duration-200;
}

.tool-button.active {
  @apply bg-primary-50 border-primary-500 text-primary-600;
}

.tool-label {
  @apply text-sm font-medium;
}

/* Actions pour les notes */
.note-actions {
  @apply grid grid-cols-2 gap-3 mb-4;
}

.action-button {
  @apply flex items-center justify-center gap-2 p-3 rounded-lg;
  @apply text-sm font-medium;
  @apply transition-colors duration-200;
}

.action-button.edit {
  @apply bg-primary-50 text-primary-600 border border-primary-200;
  @apply hover:bg-primary-100;
}

.action-button.route {
  @apply bg-blue-50 text-blue-600 border border-blue-200;
  @apply hover:bg-blue-100;
}

/* Bouton de suppression */
.delete-button {
  @apply flex items-center justify-center gap-2 p-3 rounded-lg w-full mb-4;
  @apply bg-red-50 text-red-600 border border-red-200;
  @apply hover:bg-red-100;
  @apply transition-colors duration-200;
}

.delete-button.active {
  @apply bg-red-100;
}

/* Propriétés de la forme */
.shape-properties {
  @apply mt-4;
}

.property-group {
  @apply bg-gray-50 rounded-lg p-4;
}

.property-title {
  @apply text-sm font-semibold text-gray-700 mb-3;
}

.property-content {
  @apply space-y-2;
}

.property-item {
  @apply flex justify-between items-center;
}

.property-label {
  @apply text-sm text-gray-600;
}

.property-value {
  @apply text-sm font-medium text-gray-800;
}

/* Sélecteur de couleur */
.color-picker {
  @apply mb-4;
}

.color-grid {
  @apply grid grid-cols-6 gap-2;
}

.color-button {
  @apply w-8 h-8 rounded-full cursor-pointer;
  @apply transition-transform duration-200;
  @apply hover:scale-110;
}

/* Contrôles de style */
.style-controls {
  @apply space-y-4;
}

.style-group {
  @apply bg-gray-50 rounded-lg p-4;
}

.style-title {
  @apply text-sm font-semibold text-gray-700 mb-3;
}

.style-inputs {
  @apply flex items-center gap-3;
}

.style-select {
  @apply w-full p-2 rounded border border-gray-300;
  @apply bg-white text-sm;
}

.value-label {
  @apply text-sm text-gray-600 min-w-[3rem];
}

/* Styles mobiles */
@media (max-width: 767px) {
  .drawing-tools-panel {
    @apply fixed bottom-0 left-0 right-0 z-[2000];
    height: calc(100vh - var(--header-height) - var(--mobile-toolbar-height));
    transform: translateY(100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border-top-left-radius: 1rem;
    border-top-right-radius: 1rem;
    box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -1px rgba(0, 0, 0, 0.06);
  }

  .drawing-tools-panel.open {
    transform: translateY(0);
  }

  .content-container {
    padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0));
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  /* Ajuster la position des boutons pour éviter la superposition */
  .tools-grid {
    @apply grid grid-cols-2 gap-3 mb-4;
    margin-top: 1rem;
  }

  .tool-button {
    @apply flex flex-col items-center justify-center gap-2 p-3 rounded-lg;
    @apply border border-gray-200 bg-white;
    @apply hover:bg-gray-50 hover:border-gray-300;
    @apply transition-colors duration-200;
    min-height: 4rem;
  }

  .note-actions {
    @apply grid grid-cols-2 gap-3 mb-4;
    margin-top: 1rem;
  }

  .delete-button {
    @apply flex items-center justify-center gap-2 p-3 rounded-lg w-full mb-4;
    @apply bg-red-50 text-red-600 border border-red-200;
    @apply hover:bg-red-100;
    @apply transition-colors duration-200;
    margin-top: 1rem;
  }
}

/* Styles desktop */
@media (min-width: 768px) {
  .drawing-tools-panel {
    @apply relative border-l border-gray-200;
    width: 20rem;
  }

  .mobile-header {
    display: none;
  }
}
</style>