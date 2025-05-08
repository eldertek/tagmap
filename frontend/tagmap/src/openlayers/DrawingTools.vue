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
          <button v-if="selectedFeature && getFeatureType() !== 'Note'" @click="activeTab = 'style'"
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
            <button 
              v-for="tool in drawingTools" 
              :key="tool.type"
              class="flex items-center justify-center p-2 rounded-md border transition-all duration-200"
              :class="{
                'bg-primary-50 border-primary-500 text-primary-600': props.selectedTool === tool.type,
                'hover:bg-gray-50 border-gray-300 text-gray-700': props.selectedTool !== tool.type
              }"
              @click="handleToolClick(tool.type)" 
              :title="tool.label"
            >
              <span class="icon" v-html="getToolIcon(tool.type)"></span>
            </button>
          </div>

          <!-- Bouton de suppression supprimé -->

          <!-- Propriétés de la forme sélectionnée (intégrées directement sous les outils) -->
          <div v-if="props.selectedFeature" class="mt-4">
            <!-- Champ pour nommer la forme (masqué pour les Notes) -->
            <div v-if="getFeatureType() !== 'Note'" class="mb-4">
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
                <option value="admin">Administrateur uniquement</option>
                <option value="company">Entreprise et salariés</option>
                <option value="employee">Salariés uniquement</option>
                <option value="visitor">Tout le monde (public)</option>
              </select>
            </div>

            <!-- Tableau compact des propriétés pour tous les types -->
            <div class="grid grid-cols-1 gap-4">
              <!-- Polygone -->
              <template v-if="getFeatureType() === 'Polygon'">
                <div class="space-y-1">
                  <div class="flex justify-between items-center">
                    <span class="text-sm font-semibold text-gray-700">Surface :</span>
                    <span class="text-sm font-medium text-gray-500">{{ formatArea(getFeatureArea()) }}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-sm font-semibold text-gray-700">Périmètre :</span>
                    <span class="text-sm font-medium text-gray-500">{{ formatLength(getFeaturePerimeter()) }}</span>
                  </div>
                </div>
              </template>

              <!-- Ligne -->
              <template v-else-if="getFeatureType() === 'LineString'">
                <div class="flex justify-between items-center">
                  <span class="text-sm font-semibold text-gray-700">Longueur :</span>
                  <span class="text-sm font-medium text-gray-500">{{ formatLength(getFeatureLength()) }}</span>
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- Onglet Style -->
        <div v-if="activeTab === 'style' && props.selectedFeature && getFeatureType() !== 'Note'" class="tab-content">
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
                  @change="updateStyle({ color: strokeColor })" title="Couleur du contour" />
                <input type="range" v-model="strokeWidth" min="1" max="10" class="w-16 h-2 rounded-md"
                  @change="updateStyle({ weight: strokeWidth })" title="Épaisseur du contour" />
              </div>
            </div>
            <!-- Style de trait -->
            <div class="flex items-center gap-4">
              <span class="w-20 text-sm font-semibold text-gray-700">Style</span>
              <select v-model="strokeStyle" class="w-full rounded border" @change="updateStrokeStyle()">
                <option v-for="style in strokeStyles" :key="style.value" :value="style.value">
                  {{ style.label }}
                </option>
              </select>
            </div>
            <div v-if="getFeatureType() === 'Polygon'" class="flex items-center gap-4">
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
            <!-- Section des niveaux d'accès -->
            <div class="space-y-2">
              <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Niveau d'accès</h4>
              <div class="p-2 bg-blue-50 rounded mb-2 text-xs text-blue-700">
                Sélectionnez votre niveau d'accès pour filtrer les éléments visibles sur la carte.
              </div>
              <div>
                <select v-model="selectedAccessLevel" @change="updateAccessLevelFilter(selectedAccessLevel)"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm">
                  <option value="company">Entreprise (tous les éléments)</option>
                  <option value="employee">Salariés (éléments salariés et visiteurs)</option>
                  <option value="visitor">Visiteurs (éléments public uniquement)</option>
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
                  <input type="checkbox" v-model="filters.categories.forages" @change="emitFilterChange"
                    class="rounded text-primary-600 focus:ring-primary-500 h-4 w-4">
                  <span class="ml-2 text-sm text-gray-700">Forages</span>
                </label>
                <label class="flex items-center">
                  <input type="checkbox" v-model="filters.categories.clients" @change="emitFilterChange"
                    class="rounded text-primary-600 focus:ring-primary-500 h-4 w-4">
                  <span class="ml-2 text-sm text-gray-700">Clients</span>
                </label>
                <label class="flex items-center">
                  <input type="checkbox" v-model="filters.categories.entrepots" @change="emitFilterChange"
                    class="rounded text-primary-600 focus:ring-primary-500 h-4 w-4">
                  <span class="ml-2 text-sm text-gray-700">Entrepôts</span>
                </label>
                <label class="flex items-center">
                  <input type="checkbox" v-model="filters.categories.livraisons" @change="emitFilterChange"
                    class="rounded text-primary-600 focus:ring-primary-500 h-4 w-4">
                  <span class="ml-2 text-sm text-gray-700">Lieux de livraison</span>
                </label>
                <label class="flex items-center">
                  <input type="checkbox" v-model="filters.categories.cultures" @change="emitFilterChange"
                    class="rounded text-primary-600 focus:ring-primary-500 h-4 w-4">
                  <span class="ml-2 text-sm text-gray-700">Cultures</span>
                </label>
                <label class="flex items-center">
                  <input type="checkbox" v-model="filters.categories.parcelles" @change="emitFilterChange"
                    class="rounded text-primary-600 focus:ring-primary-500 h-4 w-4">
                  <span class="ml-2 text-sm text-gray-700">Noms des parcelles</span>
                </label>
              </div>
            </div>

            <!-- Section des types de formes -->
            <div class="space-y-2 mt-4">
              <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Types de formes</h4>
              <div class="space-y-1">
                <label class="flex items-center">
                  <input type="checkbox" v-model="filters.shapeTypes.Polygon" @change="emitFilterChange"
                    class="rounded text-primary-600 focus:ring-primary-500 h-4 w-4">
                  <span class="ml-2 text-sm text-gray-700">Polygones</span>
                </label>
                <label class="flex items-center">
                  <input type="checkbox" v-model="filters.shapeTypes.LineString" @change="emitFilterChange"
                    class="rounded text-primary-600 focus:ring-primary-500 h-4 w-4">
                  <span class="ml-2 text-sm text-gray-700">Lignes</span>
                </label>
                <label class="flex items-center">
                  <input type="checkbox" v-model="filters.shapeTypes.Note" @change="emitFilterChange"
                    class="rounded text-primary-600 focus:ring-primary-500 h-4 w-4">
                  <span class="ml-2 text-sm text-gray-700">Notes</span>
                </label>
              </div>
            </div>

            <!-- Bouton de réinitialisation -->
            <div class="pt-4 mb-4">
              <button @click="resetFilters"
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
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import Feature from 'ol/Feature'
import { Geometry, Polygon, LineString, Point } from 'ol/geom'
import { getArea, getLength } from 'ol/sphere'

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
  selectedFeature: {
    type: Object as () => Feature<Geometry> | null,
    default: null
  },
  isDrawing: {
    type: Boolean,
    default: false
  }
})

// Define emits
const emit = defineEmits([
  'update:show', 
  'tool-selected', 
  'delete-feature',
  'properties-update',
  'style-update',
  'filter-change',
  'close-drawer'
])

// Automatically show on desktop and hide on mobile, update on resize
const handleResize = () => {
  emit('update:show', window.innerWidth >= 768)
}

onMounted(() => {
  handleResize()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

// Active tab
const activeTab = ref('tools')

// Feature properties
const shapeName = ref('')
const shapeCategory = ref('forages')
const accessLevel = ref('visitor')

// Style properties
const strokeColor = ref('#2b6451')
const strokeWidth = ref(2)
const strokeStyle = ref('solid')
const fillColor = ref('#2b6451')
const fillOpacity = ref(0.2)

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

// Define available drawing tools (only drawing actions)
const drawingTools = [
  { type: 'draw_polygon', label: 'Polygone' },
  { type: 'draw_line_string', label: 'Ligne' },
  { type: 'draw_point', label: 'Point' }
]

// Filters
const selectedAccessLevel = ref('company')
const filters = ref({
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
    LineString: true,
    Note: true
  }
})

// Helper methods
const getFeatureType = () => {
  if (!props.selectedFeature) return null
  
  const geometry = props.selectedFeature.getGeometry()
  if (!geometry) return null
  
  if (geometry instanceof Polygon) return 'Polygon'
  if (geometry instanceof LineString) return 'LineString'
  if (geometry instanceof Point) {
    // Check if it's a Note via properties
    const properties = props.selectedFeature.get('properties') || {}
    if (properties.type === 'Note') return 'Note'
    return 'Point'
  }
  
  return geometry.getType()
}

const getFeatureArea = () => {
  if (!props.selectedFeature) return 0
  
  const geometry = props.selectedFeature.getGeometry()
  if (!geometry || !(geometry instanceof Polygon)) return 0
  
  return getArea(geometry)
}

const getFeaturePerimeter = () => {
  if (!props.selectedFeature) return 0
  const geometry = props.selectedFeature.getGeometry()
  if (!geometry || !(geometry instanceof Polygon)) return 0
  
  // For a polygon, we calculate the perimeter by getting the length of the outer ring
  const outerRing = geometry.getLinearRing(0)!
  return getLength(outerRing)
}

const getFeatureLength = () => {
  if (!props.selectedFeature) return 0
  
  const geometry = props.selectedFeature.getGeometry()
  if (!geometry || !(geometry instanceof LineString)) return 0
  
  return getLength(geometry)
}

// Format functions
const formatLength = (value: number): string => {
  return `${Math.round(value)} m`
}

const formatArea = (value: number): string => {
  if (value >= 10000) {
    return `${(value / 10000).toFixed(2)} ha`
  }
  return `${Math.round(value)} m²`
}

// Function to get icons for drawing tools
const getToolIcon = (type: string) => {
  switch (type) {
    case 'draw_polygon':
      return '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5l16 0l0 14l-16 0l0 -14z"/></svg>'
    case 'draw_line_string':
      return '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 20l16 -16"/></svg>'
    case 'draw_point':
      return '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11c1.38 0 2.5-1.12 2.5-2.5S13.38 6 12 6s-2.5 1.12-2.5 2.5S10.62 11 12 11z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>'
    default:
      return ''
  }
}

// Handle tool selection
const handleToolClick = (toolType: string) => {
  console.log('[DrawingTools] handleToolClick:', toolType)
  // If the tool is already selected, deselect it
  emit('tool-selected', props.selectedTool === toolType ? 'none' : toolType)
  
  // On mobile, close the drawer after selection
  if (window.innerWidth < 768) {
    emit('update:show', false)
  }
}

// Update feature name
const updateShapeName = () => {
  emit('properties-update', { name: shapeName.value })
}

// Update feature category
const updateShapeCategory = () => {
  emit('properties-update', { category: shapeCategory.value })
}

// Update access level
const updateAccessLevel = () => {
  emit('properties-update', { accessLevel: accessLevel.value })
}

// Update style
const updateStyle = (style: any) => {
  console.log('[DrawingTools] style-update emitted:', style)
  emit('style-update', style)
}

// Update stroke style
const updateStrokeStyle = () => {
  switch (strokeStyle.value) {
    case 'solid':
      emit('style-update', { dashArray: null })
      break
    case 'dashed':
      emit('style-update', { dashArray: '10, 5' })
      break
    case 'dotted':
      emit('style-update', { dashArray: '2, 5' })
      break
  }
}

// Select preset color
const selectPresetColor = (color: string) => {
  strokeColor.value = color
  fillColor.value = color
  
  if (getFeatureType() === 'Polygon') {
    emit('style-update', { 
      color: color, 
      fillColor: color + '33' // Add transparency 
    })
  } else {
    emit('style-update', { color: color })
  }
}

// Update access level filter
const updateAccessLevelFilter = (level: string) => {
  // Reset all access level filters
  Object.keys(filters.value.accessLevels).forEach(key => {
    filters.value.accessLevels[key as keyof typeof filters.value.accessLevels] = false
  })
  
  // Set the selected level to true
  if (level in filters.value.accessLevels) {
    filters.value.accessLevels[level as keyof typeof filters.value.accessLevels] = true
  }
  
  emitFilterChange()
}

// Reset filters
const resetFilters = () => {
  // Reset all filters to true
  Object.keys(filters.value.categories).forEach(key => {
    filters.value.categories[key as keyof typeof filters.value.categories] = true
  })
  
  Object.keys(filters.value.shapeTypes).forEach(key => {
    filters.value.shapeTypes[key as keyof typeof filters.value.shapeTypes] = true
  })
  
  // Reset access level to company (all)
  selectedAccessLevel.value = 'company'
  filters.value.accessLevels = {
    company: true,
    employee: false,
    visitor: false
  }
  
  emitFilterChange()
}

// Emit filter change
const emitFilterChange = () => {
  emit('filter-change', filters.value)
}

// Switch to filters tab
const switchToFiltersTab = () => {
  activeTab.value = 'filters'
}

// Watch for selected feature changes
watch(() => props.selectedFeature, (newFeature) => {
  if (newFeature) {
    // Set properties based on the selected feature
    const properties = newFeature.get('properties') || {}
    
    shapeName.value = newFeature.get('name') || properties.name || ''
    shapeCategory.value = properties.category || 'forages'
    accessLevel.value = properties.accessLevel || 'visitor'
    
    // Set style values
    if (properties.style) {
      strokeColor.value = properties.style.color || '#2b6451'
      strokeWidth.value = properties.style.weight || 2
      
      // Set dash array
      if (properties.style.dashArray) {
        if (properties.style.dashArray === '10, 5') {
          strokeStyle.value = 'dashed'
        } else if (properties.style.dashArray === '2, 5') {
          strokeStyle.value = 'dotted'
        } else {
          strokeStyle.value = 'solid'
        }
      } else {
        strokeStyle.value = 'solid'
      }
      
      // Set fill properties if applicable
      if (getFeatureType() === 'Polygon') {
        fillColor.value = properties.style.fillColor || '#2b6451'
        fillOpacity.value = properties.style.fillOpacity || 0.2
      }
    }
    
    // Switch to the tools tab by default
    activeTab.value = 'tools'
  }
}, { immediate: true })
</script>

<style scoped>
/* Styles de base */
.drawing-tools-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: white;
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

/* Ajustements responsive */
@media (max-width: 767px) {
  .tab-content {
    padding-bottom: 60px;
  }
  
  .drawing-tools-panel {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 2000;
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
    position: relative;
    border-left: 1px solid #e5e7eb;
    width: var(--drawing-tools-width-desktop, 20rem);
    height: calc(100vh - var(--header-height) - var(--toolbar-height));
  }
}

/* Filters tab specific styles */
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

/* Primary colors */
.bg-primary-50 {
  background-color: #e6f0ee;
}

.text-primary-600 {
  color: #2b6451;
}

.border-primary-500 {
  border-color: #2b6451;
}

/* Blue colors for info */
.bg-blue-50 {
  background-color: #eff6ff;
}

.text-blue-700 {
  color: #1d4ed8;
}

/* Red colors for delete */
.bg-red-50 {
  background-color: #fef2f2;
}

.bg-red-100 {
  background-color: #fee2e2;
}

.text-red-600 {
  color: #dc2626;
}

.border-red-200 {
  border-color: #fecaca;
}

/* Gray colors */
.text-gray-500 {
  color: #6b7280;
}

.text-gray-600 {
  color: #4b5563;
}

.text-gray-700 {
  color: #374151;
}

.border-gray-200 {
  border-color: #e5e7eb;
}

.border-gray-300 {
  border-color: #d1d5db;
}

.bg-gray-50 {
  background-color: #f9fafb;
}

.bg-gray-100 {
  background-color: #f3f4f6;
}

.bg-gray-200 {
  background-color: #e5e7eb;
}

/* Utility classes */
.rounded-md {
  border-radius: 0.375rem;
}

.rounded-full {
  border-radius: 9999px;
}

.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}

.duration-200 {
  transition-duration: 200ms;
}

.rounded {
  border-radius: 0.25rem;
}

/* Color picker styling */
input[type="color"] {
  -webkit-appearance: none;
  border: none;
  padding: 0;
}

input[type="color"]::-webkit-color-swatch-wrapper {
  padding: 0;
  border-radius: 0.375rem;
}

input[type="color"]::-webkit-color-swatch {
  border: none;
  border-radius: 0.375rem;
}

input[type="range"] {
  -webkit-appearance: none;
  width: 100%;
  height: 6px;
  border-radius: 5px;
  background: #d1d5db;
  outline: none;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #2b6451;
  cursor: pointer;
}
</style>