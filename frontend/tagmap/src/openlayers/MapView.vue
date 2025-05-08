<template>
  <div class="openlayers-map-view h-full flex flex-col">
    <!-- Map Toolbar -->
    <MapToolbar 
      :lastSave="lastSave ? lastSave : undefined"
      :planName="planName"
      :planDescription="planDescription"
      :saveStatus="saveStatus"
      @create-new-plan="createNewPlan"
      @load-plan="loadPlan"
      @save-plan="savePlan"
      @adjust-view="adjustView"
      @toggle-edit-mode="toggleEditMode"
      @change-map-type="handleChangeBaseMap"
    />
    
    <!-- Main content area with map and drawing tools -->
    <div class="flex-1 flex flex-col md:flex-row relative">
      <!-- Mobile overlay when drawing tools are open -->
      <div
        v-if="isMobile && showDrawingTools"
        @click="toggleDrawingTools"
        class="md:hidden fixed inset-0 bg-black/30 z-[1800] transition-opacity duration-300"
      ></div>

      <!-- Map container -->
      <div class="flex-1 relative">
        <div ref="mapContainer" class="map-container"></div>
      </div>

      <!-- Drawing tools panel -->
      <Teleport v-if="isMobile" to="body">
        <DrawingTools
          v-model:show="showDrawingTools"
          :selected-tool="selectedDrawingTool"
          :selected-feature="selectedFeature"
          :is-drawing="isDrawing"
          @tool-selected="handleToolSelection"
          @delete-feature="deleteSelectedFeature"
          @properties-update="handlePropertiesUpdate"
          @style-update="handleStyleUpdate"
          @filter-change="handleFilterChange"
          class="md:w-80 md:flex-shrink-0"
        />
      </Teleport>
      <DrawingTools
        v-else
        v-model:show="showDrawingTools"
        :selected-tool="selectedDrawingTool"
        :selected-feature="selectedFeature"
        :is-drawing="isDrawing"
        @tool-selected="handleToolSelection"
        @delete-feature="deleteSelectedFeature"
        @properties-update="handlePropertiesUpdate"
        @style-update="handleStyleUpdate"
        @filter-change="handleFilterChange"
        class="md:w-80 md:flex-shrink-0"
      />

      <!-- Mobile bottom toolbar -->
      <div
        v-if="isMobile"
        class="md:hidden fixed left-0 right-0 z-[1900] bg-white py-3 px-3 shadow-lg border-t border-gray-200 flex items-center justify-center cursor-pointer"
        style="height: var(--mobile-bottom-toolbar-height); bottom: 0;"
        @click="toggleDrawingTools"
      >
        <div class="flex items-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path v-if="!showDrawingTools" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span class="text-sm text-gray-500 font-medium">Outils</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, onUnmounted, computed, watch, Teleport } from 'vue'
import 'ol/ol.css'
import Map from 'ol/Map'
import View from 'ol/View'
import { useMapState } from './useMapState'
import { useMapDrawing } from './useMapDrawing'
import MapToolbar from './MapToolbar.vue'
import DrawingTools from './DrawingTools.vue'
import Feature from 'ol/Feature'
import { Polygon, LineString, Point } from 'ol/geom'
import { GeoJSON } from 'ol/format'
import { fromLonLat, toLonLat } from 'ol/proj'
import { getArea, getLength } from 'ol/sphere'
import type { Geometry } from 'ol/geom'

// Map container reference
const mapContainer = ref<HTMLElement | null>(null)
let olMap: Map | null = null

// Plan information
const planName = ref<string>('Plan sans titre')
const planDescription = ref<string>('')
const lastSave = ref<Date | null>(null)
const saveStatus = ref<'saving' | 'success' | null>(null)

// Drawing tools state
const isEditModeEnabled = ref(true)
const isDrawingToolsVisible = ref(true)
const isMobile = ref(false)
const selectedDrawingTool = ref('none')
const isDrawing = ref(false)

const showDrawingTools = isDrawingToolsVisible;
function toggleDrawingTools() {
  showDrawingTools.value = !showDrawingTools.value;
}
function checkMobile() {
  isMobile.value = window.innerWidth < 768;
  if (!isMobile.value) {
    showDrawingTools.value = true;
  }
}
onMounted(() => {
  window.addEventListener('resize', checkMobile);
  checkMobile();
});
onUnmounted(() => {
  window.removeEventListener('resize', checkMobile);
});

// Get map state and drawing tools
const { 
  initMap, 
  changeBaseMap: setBaseMap, 
  initialView, 
  vectorSource, 
  vectorLayer 
} = useMapState()

const { 
  initDrawing, 
  setDrawingTool, 
  clearDrawing,
  deleteFeature,
  updateFeatureProperties,
  updateFeatureStyle,
  selectedFeature,
  isDrawing: drawingInProgress,
  features,
  drawSource
} = useMapDrawing()

// Watch for drawing progress changes
watch(drawingInProgress, (newValue, oldValue) => {
  isDrawing.value = newValue
  // When drawing completes (went from true to false), deselect the drawing tool
  if (oldValue && !newValue) {
    if (olMap) {
      selectedDrawingTool.value = 'none'
      setDrawingTool('none', olMap)
    }
  }
})

// Features collection
const shapes = ref<any[]>([])


// Initialize map when component is mounted
onMounted(() => {
  if (mapContainer.value) {
    // Create the map instance
    initMap(mapContainer.value).then((map: Map) => {
      olMap = map;
      
      // Initialize drawing tools
      if (olMap) {
        initDrawing(olMap);
        
        // Set up the map view
        adjustView();
      }
    });
  }
})

// Clean up when component is unmounted
onUnmounted(() => {
  if (olMap) {
    olMap.setTarget(undefined)
    olMap = null
  }
})

// Toolbar action methods
const createNewPlan = () => {
  planName.value = 'Nouveau plan'
  planDescription.value = ''
  lastSave.value = new Date()
  
  // Clear existing drawings
  if (olMap) {
    clearDrawing(olMap)
  }
  
  // Reset shapes collection
  shapes.value = []
}

const loadPlan = () => {
  // Mock load action for now
  console.log('Load plan action')
  
  // Here you would load GeoJSON features and add them to the vector source
  // Example:
  // const loadedFeatures = new GeoJSON().readFeatures(geoJsonData, { featureProjection: 'EPSG:3857' })
  // vectorSource.value.addFeatures(loadedFeatures)
}

const savePlan = () => {
  // Set saving status
  saveStatus.value = 'saving'
  
  // Get all features as GeoJSON
  const geoJsonFeatures = features.value
  
  // Here you would save the features to your backend
  // For now, we'll just simulate a delay
  setTimeout(() => {
    saveStatus.value = 'success'
    lastSave.value = new Date()
    
    // Reset success state after 3 seconds
    setTimeout(() => {
      saveStatus.value = null
    }, 3000)
    
    console.log('Features saved:', geoJsonFeatures)
  }, 1000)
}

const adjustView = () => {
  if (olMap) {
    // Utiliser drawSource de useMapDrawing
    const allFeatures = drawSource.getFeatures();
    if (allFeatures.length > 0) {
      let globalExtent = allFeatures[0].getGeometry().getExtent().slice();
      allFeatures.forEach((f: Feature<Geometry>) => {
        const geom = f.getGeometry();
        if (geom) {
          const extent = geom.getExtent();
          globalExtent = [
            Math.min(globalExtent[0], extent[0]),
            Math.min(globalExtent[1], extent[1]),
            Math.max(globalExtent[2], extent[2]),
            Math.max(globalExtent[3], extent[3])
          ];
        }
      });
      olMap.getView().fit(globalExtent, { size: olMap.getSize(), maxZoom: 18, duration: 500 });
    } else {
      olMap.getView().setProperties(initialView.value);
    }
  }
}

// Toggle edit mode
const toggleEditMode = (enabled: boolean) => {
  isEditModeEnabled.value = enabled
  
  if (olMap) {
    if (enabled) {
      // Show drawing tools panel when edit mode is enabled
      isDrawingToolsVisible.value = true
      selectedDrawingTool.value = 'none'
    } else {
      // Clear active drawing tool when edit mode is disabled
      setDrawingTool('none', olMap)
      isDrawingToolsVisible.value = false
      selectedDrawingTool.value = 'none'
    }
  }
}

// Handle drawing tool selection 
const handleToolSelection = (toolType: string) => {
  console.log('[MapView] handleToolSelection:', toolType)
  selectedDrawingTool.value = toolType
  
  if (olMap) {
    setDrawingTool(toolType, olMap)
  }
}

// Delete the currently selected feature
const deleteSelectedFeature = () => {
  console.log('[MapView] deleteSelectedFeature invoked for feature', selectedFeature.value)
  if (selectedFeature.value && olMap) {
    // TypeScript requires a type assertion here since Feature<Geometry> is expected
    const feature = selectedFeature.value as unknown as Feature<Geometry>
    // Retrieve the feature ID before deletion
    const featureId = feature.get('id')
    console.log('[MapView] deleteSelectedFeature: deleting feature with id', featureId)
    deleteFeature(feature)
    console.log('[MapView] deleteSelectedFeature: feature removed from drawSource')

    // Update shapes collection
    shapes.value = shapes.value.filter(shape => shape.id !== featureId)
    console.log('[MapView] deleteSelectedFeature: shapes collection updated', shapes.value)
  }
}

// Handle properties update from DrawingTools component
const handlePropertiesUpdate = (properties: any) => {
  if (selectedFeature.value) {
    // TypeScript requires a type assertion here since Feature<Geometry> is expected
    const feature = selectedFeature.value as unknown as Feature<Geometry>
    updateFeatureProperties(feature, properties)
    
    // Update the shapes collection
    const featureId = selectedFeature.value.get('id')
    const shapeIndex = shapes.value.findIndex(shape => shape.id === featureId)
    if (shapeIndex !== -1) {
      shapes.value[shapeIndex].properties = {
        ...shapes.value[shapeIndex].properties,
        ...properties
      }
    }
  }
}

// Handle style update from DrawingTools component
const handleStyleUpdate = (style: any) => {
  console.log('[MapView] handleStyleUpdate received style', style)
  if (selectedFeature.value) {
    // TypeScript requires a type assertion here since Feature<Geometry> is expected
    const feature = selectedFeature.value as unknown as Feature<Geometry>
    updateFeatureStyle(feature, style)
    console.log('[MapView] handleStyleUpdate: style applied to feature', feature)
  }
}

// Handle filter changes from drawing tools
const handleFilterChange = (filters: any) => {
  // Apply filters to features visibility
  console.log('Applying filters:', filters)
  
  // This would filter features by category, access level, etc.
  // For now, we'll just log the filters
}

// Change the base map
const handleChangeBaseMap = (mapType: 'Hybride' | 'Cadastre' | 'IGN') => {
  if (olMap) {
    setBaseMap(mapType)
  }
}
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 100%;
}

.openlayers-map-view {
  position: relative;
}

/* Primary color theme */
.bg-primary-600 {
  background-color: #2b6451;
}

/* Button styles */
button {
  cursor: pointer;
}

.text-white {
  color: white;
}

.shadow-lg {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

/* Responsive adjustments */
@media (min-width: 768px) {
  .md\:hidden {
    display: none;
  }
}
</style>