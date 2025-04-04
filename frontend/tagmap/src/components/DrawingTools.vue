<!-- DrawingTools.vue -->
<template>
  <div class="h-full flex flex-col bg-white overflow-y-auto">
    <!-- Header avec titre (masqué sur mobile car déjà dans le panneau parent) -->
    <div class="p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center md:flex hidden">
      <h3 class="text-sm font-semibold text-gray-700">Outils de dessin</h3>
    </div>

    <!-- Navigation par onglets -->
    <div class="border-b border-gray-200">
      <nav class="flex -mb-px">
        <button
          @click="activeTab = 'tools'"
          :class="[activeTab === 'tools' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300', 'flex-1 py-3 px-1 text-center border-b-2 font-medium text-sm']"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          <span>Outils</span>
        </button>
        <button
          @click="activeTab = 'style'"
          :class="[activeTab === 'style' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300', 'flex-1 py-3 px-1 text-center border-b-2 font-medium text-sm']"
          :disabled="!selectedShape || selectedShape.properties?.type === 'Note'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
          <span>Style</span>
        </button>
        <button
          @click="activeTab = 'properties'"
          :class="[activeTab === 'properties' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300', 'flex-1 py-3 px-1 text-center border-b-2 font-medium text-sm']"
          :disabled="!selectedShape"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span>Propriétés</span>
        </button>
      </nav>
    </div>

    <!-- Contenu des onglets -->
    <div class="flex-1 overflow-y-auto">
      <!-- Onglet Outils -->
      <div v-if="activeTab === 'tools'" class="p-3">
        <!-- Outils de dessin - version compacte avec icônes -->
        <div class="grid grid-cols-4 gap-1.5 mb-4">
          <button v-for="tool in drawingTools.filter(t => t.type !== 'delete')" :key="tool.type"
            class="flex items-center justify-center p-2 rounded-md border"
            :class="{ 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm': currentTool === tool.type }"
            @click="$emit('tool-change', currentTool === tool.type ? '' : tool.type)" :title="tool.label">
            <span class="icon" v-html="getToolIcon(tool.type)"></span>
          </button>
        </div>
        <!-- Bouton de suppression -->
        <button v-if="selectedShape"
          class="w-full mt-2 p-2 rounded-md border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center"
          :class="{ 'bg-red-100': currentTool === 'delete' }" @click="$emit('delete-shape')" title="Supprimer la forme">
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span class="text-sm">Supprimer</span>
        </button>
      </div>

      <!-- Message spécifique pour les notes -->
      <div v-if="selectedShape && selectedShape.properties?.type === 'Note'" class="p-4 text-center">
        <div class="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 mx-auto text-blue-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-sm text-blue-700 font-medium">Les notes géolocalisées se modifient directement sur la carte.</p>
        </div>
      </div>

      <!-- Onglet Style -->
      <div v-if="activeTab === 'style' && selectedShape && selectedShape.properties?.type !== 'Note'" class="p-3">
        <!-- Couleurs prédéfinies - compact -->
        <div class="grid grid-cols-6 gap-2 mb-4">
          <button v-for="color in predefinedColors" :key="color" class="w-8 h-8 rounded-full"
            :style="{ backgroundColor: color }" @click="selectPresetColor(color)" :title="color"></button>
        </div>
        <!-- Contrôles de style pour les formes standards (non TextRectangle) -->
        <div v-if="localProperties?.type !== 'TextRectangle'" class="space-y-4">
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
        <!-- Options spécifiques au TextRectangle -->
        <div v-if="localProperties?.type === 'TextRectangle'" class="space-y-4">
          <!-- Contour du rectangle avec texte -->
          <div class="flex items-center gap-4">
            <span class="w-20 text-sm font-semibold text-gray-700">Contour</span>
            <div class="flex items-center gap-2">
              <input type="color" v-model="strokeColor" class="w-16 h-8 rounded border"
                @change="updateStyle({ strokeColor })" title="Couleur du contour" />
              <input type="range" v-model="strokeWidth" min="1" max="10" class="w-16 h-2 rounded-md"
                @change="updateStyle({ strokeWidth })" title="Épaisseur du contour" />
            </div>
          </div>
          <!-- Remplissage du rectangle -->
          <div class="flex items-center gap-4">
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
      <!-- Onglet Propriétés -->
      <div v-if="activeTab === 'properties' && selectedShape" class="p-3">
          <div v-if="localProperties">
            <!-- Champ pour nommer la forme -->
            <div class="mb-4">
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
                <option value="forages">Forages</option>
                <option value="clients">Clients</option>
                <option value="entrepots">Entrepôts</option>
                <option value="livraisons">Lieux de livraison</option>
                <option value="cultures">Cultures</option>
                <option value="parcelles">Noms des parcelles</option>
                <option value="default">Autre</option>
              </select>
            </div>

            <!-- Niveau d'accès -->
            <div class="mb-4">
              <label for="accessLevel" class="block text-sm font-medium text-gray-700 mb-1">Niveau d'accès</label>
              <select id="accessLevel" v-model="accessLevel" @change="updateAccessLevel"
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500">
                <option value="company">Entreprise uniquement</option>
                <option value="employee">Entreprise et salariés</option>
                <option value="visitor">Tous (visiteurs inclus)</option>
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
              <!-- ElevationLine -->
              <template v-else-if="localProperties.type === 'ElevationLine'">
                <!-- Propriétés sur une seule colonne -->
                <div class="flex flex-col space-y-2 w-full">
                  <div class="flex justify-between items-center">
                    <span class="text-sm font-semibold text-gray-700 whitespace-nowrap">Distance totale :</span>
                    <span class="text-sm font-medium text-gray-500 ml-2">{{ formatLength(localProperties.length || 0)
                      }}</span>
                  </div>

                  <div class="flex justify-between items-center">
                    <span class="text-sm font-semibold text-gray-700 whitespace-nowrap">Dénivelé + :</span>
                    <span class="text-sm font-medium text-gray-500 ml-2">{{ formatLength(localProperties.elevationGain
                      || 0) }}</span>
                  </div>

                  <div class="flex justify-between items-center">
                    <span class="text-sm font-semibold text-gray-700 whitespace-nowrap">Dénivelé - :</span>
                    <span class="text-sm font-medium text-gray-500 ml-2">{{ formatLength(localProperties.elevationLoss
                      || 0) }}</span>
                  </div>

                  <div class="flex justify-between items-center">
                    <span class="text-sm font-semibold text-gray-700 whitespace-nowrap">Pente moy. :</span>
                    <span class="text-sm font-medium text-gray-500 ml-2">{{ formatSlope(localProperties.averageSlope ||
                      0) }}</span>
                  </div>

                  <div class="flex justify-between items-center">
                    <span class="text-sm font-semibold text-gray-700 whitespace-nowrap">Pente max :</span>
                    <span class="text-sm font-medium text-gray-500 ml-2">{{ formatSlope(localProperties.maxSlope || 0)
                      }}</span>
                  </div>
                </div>

                <!-- Graphique du profil sur toute la largeur -->
                <div ref="elevationProfileContainer"
                  class="elevation-profile-container w-full h-48 bg-gray-50 rounded border border-gray-200 relative mt-4">
                  <canvas ref="elevationCanvas"></canvas>
                </div>
              </template>

              <!-- Note géolocalisée - Masquée car gérée par la condition v-if au niveau supérieur -->
              <!-- <template v-else-if="localProperties.type === 'Note'">
                <div class="space-y-1">
                  <div class="flex justify-between items-center">
                    <span class="text-sm font-semibold text-gray-700">Type :</span>
                    <span class="text-sm font-medium text-gray-500">Note géolocalisée</span>
                  </div>
                </div>
              </template> -->
            </div>
          </div>
          <div v-else class="text-center text-sm text-gray-500">
            Aucune propriété disponible
          </div>
        </div>
      </div>
      <!-- Section de personnalisation des points d'échantillonnage -->
      <div v-if="selectedShape && localProperties && localProperties.type === 'ElevationLine'"
        class="p-3 border-t border-gray-200">
        <!-- Section Points d'échantillonnage (toujours fermée par défaut) -->
        <button class="flex items-center justify-between w-full text-sm font-semibold text-gray-700"
          @click="toggleSection('samplePoints')">
          <span>Points d'échantillonnage</span>
          <svg class="w-4 h-4" :class="{ 'rotate-180': !sectionsCollapsed.samplePoints }" fill="none"
            stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div v-show="!sectionsCollapsed.samplePoints" class="mt-3">
          <!-- Points normaux -->
          <div class="mb-4">
            <h4 class="text-sm font-semibold mb-2">Points normaux</h4>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-xs text-gray-600">Taille</label>
                <input type="number" v-model="samplePointStyle.radius" min="2" max="10" step="1"
                  class="w-full px-2 py-1 border rounded" @change="updateSamplePointStyle">
              </div>
              <div>
                <label class="text-xs text-gray-600">Couleur</label>
                <input type="color" v-model="samplePointStyle.color" class="w-full h-8 px-1 border rounded"
                  @change="updateSamplePointStyle">
              </div>
              <div>
                <label class="text-xs text-gray-600">Opacité</label>
                <input type="range" v-model="samplePointStyle.fillOpacity" min="0" max="1" step="0.1" class="w-full"
                  @change="updateSamplePointStyle">
              </div>
              <div>
                <label class="text-xs text-gray-600">Bordure</label>
                <input type="number" v-model="samplePointStyle.weight" min="1" max="5" step="1"
                  class="w-full px-2 py-1 border rounded" @change="updateSamplePointStyle">
              </div>
            </div>
          </div>

          <!-- Points min/max -->
          <div>
            <h4 class="text-sm font-semibold mb-2">Points min/max</h4>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-xs text-gray-600">Taille</label>
                <input type="number" v-model="minMaxPointStyle.radius" min="4" max="12" step="1"
                  class="w-full px-2 py-1 border rounded" @change="updateMinMaxPointStyle">
              </div>
              <div>
                <label class="text-xs text-gray-600">Bordure</label>
                <input type="number" v-model="minMaxPointStyle.weight" min="1" max="5" step="1"
                  class="w-full px-2 py-1 border rounded" @change="updateMinMaxPointStyle">
              </div>
              <div>
                <label class="text-xs text-gray-600">Opacité</label>
                <input type="range" v-model="minMaxPointStyle.fillOpacity" min="0" max="1" step="0.1" class="w-full"
                  @change="updateMinMaxPointStyle">
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
</template>
<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue'
import type { AccessLevel, ElementCategory } from '@/types/drawing'

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
  properties: ShapeProperties;
  layer: any;
  options: any;
}

// Pas d'interface SectionType

// Define props for the component
const props = defineProps({
  currentTool: {
    type: String as () => string,
    default: ''
  },
  selectedShape: {
    type: Object as () => ShapeType | null,
    default: null
  },
  allLayers: {
    type: Array,
    default: () => []
  }
})

const drawingTools = [
  { type: 'Polygon', label: 'Polygone' },
  { type: 'Line', label: 'Ligne' },
  { type: 'ElevationLine', label: 'Profil altimétrique' },
  { type: 'Note', label: 'Note géolocalisée' }
]

const getToolIcon = (type: string) => {
  switch (type) {
    case 'Polygon':
      return '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5l16 0l0 14l-16 0l0 -14z"/></svg>'
    case 'Line':
      return '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 20l16 -16"/></svg>'
    case 'ElevationLine':
      return '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 20h18l-3-3l-4 4l-4-7l-4 4l-3-3"/></svg>'
    case 'Note':
      return '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 2l4 4m-6 0l2-2 4 4-2 2-4-4z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h8" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 14h4" /></svg>'
    default:
      return ''
  }
}

// Propriétés pour les notes géolocalisées - à implémenter

// Define reactive variables for the component
const activeTab = ref('tools') // Onglet actif par défaut

const sectionsCollapsed = ref({
  samplePoints: true,
  circleSections: true
})



// Style properties
const strokeColor = ref('#3B82F6')
const strokeWidth = ref(2)
const strokeStyle = ref('solid')
const fillColor = ref('#3B82F6')
const fillOpacity = ref(0.2)
const showFillOptions = ref(true)

// Propriétés de la forme
const shapeName = ref('')
const shapeCategory = ref<ElementCategory>('default')
const accessLevel = ref<AccessLevel>('visitor')

// Sample point styles
const samplePointStyle = ref({
  radius: 4,
  color: '#3B82F6',
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

// Pas de sections de cercles

// Predefined colors
const predefinedColors = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899'  // Pink
]

// Stroke styles
const strokeStyles = [
  { value: 'solid', label: 'Continu' },
  { value: 'dashed', label: 'Tirets' },
  { value: 'dotted', label: 'Pointillés' }
]

// Pas d'options d'alignement de texte

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

// Pas de méthodes pour les sections de cercles

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

// Define emits
const emit = defineEmits(['tool-change', 'style-update', 'properties-update', 'delete-shape'])

// Watch for changes in the selected shape to update the style controls
watchEffect(() => {
  if (props.selectedShape) {
    const style = props.selectedShape.options || {}
    strokeColor.value = style.color || '#3B82F6'
    strokeWidth.value = style.weight || 3
    strokeStyle.value = style.dashArray ? 'dashed' : 'solid'
    fillColor.value = style.fillColor || '#3B82F6'
    fillOpacity.value = style.fillOpacity || 0.2
    showFillOptions.value = props.selectedShape.properties?.type !== 'Line'

    // Mettre à jour le nom de la forme
    shapeName.value = props.selectedShape.properties?.name || ''

    // Mettre à jour la catégorie de la forme
    shapeCategory.value = props.selectedShape.properties?.category || 'default'

    // Mettre à jour le niveau d'accès de la forme
    accessLevel.value = props.selectedShape.properties?.accessLevel || 'visitor'
  }
})
</script>
<style scoped>
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
  color: #0284c7;
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

/* Ensure the style section expands when TextRectangle is selected */
.sidebar-section:has(.text-controls) .section-content {
  min-height: 250px;
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
  color: #0284c7;
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
</style>