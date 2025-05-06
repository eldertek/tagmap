<template>
  <div class="maplibre-test-container">
    <!-- MapToolbar -->
    <MapToolbar 
      :plan-name="'Test MapLibre'"
      :plan-description="'Démonstration de MapLibre GL JS avec outils de dessin'"
      :save-status="saveStatus"
      :last-save="lastSave"
      @change-map-type="handleMapTypeChange"
      @adjust-view="fitMapView"
      @save-plan="savePlan"
      @create-new-plan="createNewPlan"
      @load-plan="loadPlan"
    />
    
    <!-- Main container with map and drawing tools -->
    <div class="map-content-container">
      <!-- Map container -->
      <div class="map-container" ref="mapContainer"></div>
      
      <!-- Drawing tools panel -->
      <DrawingTools
        v-model:show="showDrawingTools"
        :selected-tool="selectedTool"
        :selected-shape="selectedFeature"
        :all-layers="allLayers"
        :is-drawing="isDrawing"
        @tool-selected="handleToolSelection"
        @style-update="updateShapeStyle"
        @properties-update="updateShapeProperties"
        @delete-shape="deleteSelectedFeature"
        @filter-change="handleFilterChange"
      />
      
      <!-- Mobile toggle for drawing tools -->
      <button 
        v-if="!showDrawingTools && windowWidth < 768" 
        @click="showDrawingTools = true"
        class="mobile-toggle-button"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import { mapService } from '@/maplibre/utils/MapService'
import { useMapLibreDrawing } from '@/maplibre/composables/useMapLibreDrawing'
import MapToolbar from '@/maplibre/components/MapToolbar.vue'
import DrawingTools from '@/maplibre/components/DrawingTools.vue'
import { DrawingMode } from '@/maplibre/utils/maplibreTypes'

// Références
const mapContainer = ref<HTMLElement | null>(null)
const mapInstance = ref<maplibregl.Map | null>(null)
const drawInstance = ref<MapboxDraw | null>(null)
const zoomLevel = ref<number | null>(null)
const selectedBaseMap = ref('hybrid') // Utiliser la carte hybride par défaut
const selectedFeature = ref<GeoJSON.Feature | null>(null)
const windowWidth = ref(window.innerWidth)
const allLayers = ref<any[]>([])

// UI state
const isDrawing = ref(false)
const selectedTool = ref('')
const showDrawingTools = ref(window.innerWidth >= 768) // Show by default on desktop
const saveStatus = ref<'saving' | 'success' | null>(null)
const lastSave = ref<Date>(new Date())

// Initialize drawing capabilities
const { 
  initDrawing,
  activeTool,
  isDrawing: drawingState,
  changeDrawingMode,
  disableDrawing,
  deleteSelectedFeature,
  getAllFeatures
} = useMapLibreDrawing({
  onDrawCreate: handleDrawCreate,
  onDrawUpdate: handleDrawUpdate,
  onDrawSelect: handleDrawSelection,
  onDrawDelete: handleDrawDelete
})

// Watch for any changes in the drawing state
watch(drawingState, (newValue) => {
  isDrawing.value = newValue
})

// Watch for changes in the active tool
watch(activeTool, (newValue) => {
  selectedTool.value = newValue || ''
})

// Initialisation de la carte
const initMap = async () => {
  if (!mapContainer.value) return

  // Définir le style initial en fonction du fond de carte sélectionné
  let initialStyle;
  
  try {
    if (selectedBaseMap.value === 'hybrid') {
      // Créer un style pour Google Maps Hybrid
      initialStyle = await mapService.createGoogleMapStyle('google', 'hybrid', false);
    } else if (selectedBaseMap.value === 'cadastre') {
      // Utiliser Google Maps Satellite avec couche cadastre superposée
      initialStyle = await mapService.createGoogleMapStyle('google', 'satellite', true);
    } else {
      // Utiliser des tuiles standard IGN
      initialStyle = mapService.createStandardMapStyle('ign');
    }
  } catch (error) {
    console.error('Erreur lors de la création du style de carte:', error);
    // Fallback à IGN si Google Maps échoue
    initialStyle = mapService.createStandardMapStyle('ign');
  }
  
  // Vérifier que le conteneur n'est pas null
  if (!mapContainer.value) return;
  
  mapInstance.value = new maplibregl.Map({
    container: mapContainer.value,
    style: initialStyle,
    center: [2.35, 48.85], // Paris
    zoom: 10,
    maxZoom: 17,
    attributionControl: false, // Disable attribution control
    transformRequest: mapService.getTransformRequest(),
  });

  // Initialisation de MapboxDraw (pour le dessin de formes)
  drawInstance.value = new MapboxDraw({
    displayControlsDefault: false,
    // Hide all default controls by setting them to false
    controls: {
      point: false,
      line_string: false,
      polygon: false,
      trash: false
    },
    // Styles personnalisés pour optimiser l'affichage tactile
    styles: [
      // Style pour le point de contrôle actif
      {
        'id': 'gl-draw-point-active',
        'type': 'circle',
        'filter': ['all', ['==', '$type', 'Point'], ['==', 'meta', 'feature'], ['==', 'active', 'true']],
        'paint': {
          'circle-radius': 12, // Plus grand pour être plus facile à toucher
          'circle-color': '#2b6451',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#FFFFFF'
        }
      },
      // Style pour les points de contrôle inactifs
      {
        'id': 'gl-draw-point',
        'type': 'circle',
        'filter': ['all', ['==', '$type', 'Point'], ['==', 'meta', 'feature'], ['==', 'active', 'false']],
        'paint': {
          'circle-radius': 10,
          'circle-color': '#3388ff',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFFFFF'
        }
      },
      // Style pour les lignes actives
      {
        'id': 'gl-draw-line-active',
        'type': 'line',
        'filter': ['all', ['==', '$type', 'LineString'], ['==', 'active', 'true']],
        'layout': {
          'line-cap': 'round',
          'line-join': 'round'
        },
        'paint': {
          'line-color': '#2b6451',
          'line-width': 4
        }
      },
      // Style pour les lignes inactives
      {
        'id': 'gl-draw-line',
        'type': 'line',
        'filter': ['all', ['==', '$type', 'LineString'], ['==', 'active', 'false']],
        'layout': {
          'line-cap': 'round',
          'line-join': 'round'
        },
        'paint': {
          'line-color': '#3388ff',
          'line-width': 3
        }
      },
      // Style pour les polygones actifs
      {
        'id': 'gl-draw-polygon-active',
        'type': 'fill',
        'filter': ['all', ['==', '$type', 'Polygon'], ['==', 'active', 'true']],
        'paint': {
          'fill-color': '#2b6451',
          'fill-opacity': 0.4
        }
      },
      // Style pour les polygones inactifs
      {
        'id': 'gl-draw-polygon',
        'type': 'fill',
        'filter': ['all', ['==', '$type', 'Polygon'], ['==', 'active', 'false']],
        'paint': {
          'fill-color': '#3388ff',
          'fill-opacity': 0.2
        }
      },
      // Style pour le contour des polygones actifs
      {
        'id': 'gl-draw-polygon-stroke-active',
        'type': 'line',
        'filter': ['all', ['==', '$type', 'Polygon'], ['==', 'active', 'true']],
        'layout': {
          'line-cap': 'round',
          'line-join': 'round'
        },
        'paint': {
          'line-color': '#2b6451',
          'line-width': 4
        }
      },
      // Style pour le contour des polygones inactifs
      {
        'id': 'gl-draw-polygon-stroke',
        'type': 'line',
        'filter': ['all', ['==', '$type', 'Polygon'], ['==', 'active', 'false']],
        'layout': {
          'line-cap': 'round',
          'line-join': 'round'
        },
        'paint': {
          'line-color': '#3388ff',
          'line-width': 3
        }
      },
      // Style pour les points de contrôle des vertex (en mode édition)
      {
        'id': 'gl-draw-point-vertex',
        'type': 'circle',
        'filter': ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point']],
        'paint': {
          'circle-radius': 10, // Plus grand pour être plus facile à toucher
          'circle-color': '#FFFFFF',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#D20C0C'
        }
      },
      // Style pour le point de milieu (pour ajouter un vertex)
      {
        'id': 'gl-draw-point-mid-point',
        'type': 'circle',
        'filter': ['all', ['==', 'meta', 'midpoint'], ['==', '$type', 'Point']],
        'paint': {
          'circle-radius': 8, // Plus grand pour être plus facile à toucher
          'circle-color': '#FFFFFF',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#D20C0C'
        }
      }
    ]
  });

  // Ajout des contrôles standard
  mapInstance.value.addControl(new maplibregl.NavigationControl() as maplibregl.IControl)
  mapInstance.value.addControl(new maplibregl.ScaleControl({
    maxWidth: 100,
    unit: 'metric'
  }) as maplibregl.IControl)
  mapInstance.value.addControl(new maplibregl.GeolocateControl({
    positionOptions: {
      enableHighAccuracy: true
    },
    trackUserLocation: true
  }) as maplibregl.IControl)

  // Don't add draw control here - it will be added through initDrawing() instead
  
  // Déplacer toutes les couches de dessin au-dessus des couches de fond
  mapInstance.value.on('style.load', () => {
    // Obtenir toutes les couches de dessin
    const drawLayers = mapInstance.value?.getStyle().layers.filter(layer => 
      layer.id.indexOf('gl-draw') === 0
    ) || []
    
    // Déplacer chaque couche de dessin au-dessus des couches de base
    drawLayers.forEach(layer => {
      if (mapInstance.value?.getLayer(layer.id)) {
        mapInstance.value?.moveLayer(layer.id)
      }
    })
  })

  // Événements
  mapInstance.value.on('zoom', () => {
    if (mapInstance.value) {
      zoomLevel.value = mapInstance.value.getZoom()
    }
  })

  // We'll initialize drawing later after the map fully loads
  // (this prevents duplicate source errors)
  mapInstance.value.once('load', () => {
    // Initialize the drawing functionality
    initDrawing(mapInstance.value)
  })

  // Gérer le redimensionnement de la fenêtre
  window.addEventListener('resize', handleResize)
}

// Gestion du redimensionnement
const handleResize = () => {
  if (mapInstance.value) {
    mapInstance.value.resize()
  }
  windowWidth.value = window.innerWidth
  // Auto-show drawing tools on desktop
  if (window.innerWidth >= 768) {
    showDrawingTools.value = true
  }
}

// Handle map type changes
const handleMapTypeChange = async (type: 'Hybride' | 'Cadastre' | 'IGN') => {
  if (!mapInstance.value) return
  
  // Define the style based on the selected map type
  let newStyle
  
  try {
    if (type === 'Hybride') {
      // Create style for Google Maps Hybrid
      newStyle = await mapService.createGoogleMapStyle('google', 'hybrid', false)
    } else if (type === 'Cadastre') {
      // Replace with Google Maps Satellite with cadastre layer
      newStyle = await mapService.createGoogleMapStyle('google', 'satellite', true)
    } else {
      // Use standard IGN tiles
      newStyle = mapService.createStandardMapStyle('ign')
    }
    
    // Update the selected base map
    selectedBaseMap.value = type.toLowerCase()
    
    // Apply the new style
    mapInstance.value.setStyle(newStyle)
  } catch (error) {
    console.error('Error creating map style:', error)
    // Fallback to IGN if error
    newStyle = mapService.createStandardMapStyle('ign')
    mapInstance.value.setStyle(newStyle)
  }
}

// Adjust the map view to fit all drawn features
const fitMapView = () => {
  if (!mapInstance.value || !drawInstance.value) return
  
  // Get all features
  const features = drawInstance.value.getAll()
  
  // If no features, nothing to fit
  if (features.features.length === 0) return
  
  // Create a bounding box from all features
  let bounds = new maplibregl.LngLatBounds()
  
  // Add each feature coordinates to the bounds
  features.features.forEach(feature => {
    if (feature.geometry.type === 'Point') {
      const coords = feature.geometry.coordinates as [number, number]
      bounds.extend(coords)
    } else if (feature.geometry.type === 'LineString') {
      const coords = feature.geometry.coordinates as [number, number][]
      coords.forEach(coord => bounds.extend(coord as [number, number]))
    } else if (feature.geometry.type === 'Polygon') {
      const coords = feature.geometry.coordinates[0] as [number, number][]
      coords.forEach(coord => bounds.extend(coord as [number, number]))
    }
  })
  
  // Fit the map to the bounds with padding
  mapInstance.value.fitBounds(bounds, { padding: 50 })
}

// Handle drawing creation event
function handleDrawCreate(e: any) {
  console.log('Feature created:', e.features)
  // Refresh the feature list
  allLayers.value = getAllFeatures()
  // Simulate saving
  simulateSave()
}

// Handle drawing update event
function handleDrawUpdate(e: any) {
  console.log('Feature updated:', e.features)
  // Refresh the feature list
  allLayers.value = getAllFeatures()
  // Simulate saving
  simulateSave()
}

// Handle drawing selection change event
function handleDrawSelection(e: any) {
  selectedFeature.value = e.features.length > 0 ? e.features[0] : null
  console.log('Selection changed:', selectedFeature.value)
}

// Handle drawing deletion event
function handleDrawDelete(e: any) {
  console.log('Feature deleted:', e.features)
  // Refresh the feature list
  allLayers.value = getAllFeatures()
  // Simulate saving
  simulateSave()
}

// Handle tool selection
function handleToolSelection(tool: string) {
  if (!tool) {
    // Disable drawing when no tool is selected
    disableDrawing();
    selectedTool.value = '';
    return;
  }
  
  // Tool is already the visual name (Polygon, Line, Note)
  // Set the selectedTool value
  selectedTool.value = tool;
  
  // Map tool name to drawing mode
  const toolMap: Record<string, string> = {
    'Polygon': 'polygon',
    'Line': 'line',
    'Note': 'point'
  };
  
  // Change drawing mode using the mapping
  if (toolMap[tool]) {
    changeDrawingMode(toolMap[tool]);
  } else {
    disableDrawing();
  }
}

// Update shape style
function updateShapeStyle(styleProps: any) {
  if (!selectedFeature.value || !drawInstance.value) return
  
  // Get current feature
  const feature = { ...selectedFeature.value }
  
  // Update style properties
  if (!feature.properties) {
    feature.properties = {}
  }
  
  if (!feature.properties.style) {
    feature.properties.style = {}
  }
  
  // Apply the style props
  Object.keys(styleProps).forEach(key => {
    feature.properties.style[key] = styleProps[key]
  })
  
  // Update the feature in the draw control
  drawInstance.value.add(feature)
  
  // Simulate saving
  simulateSave()
}

// Update shape properties
function updateShapeProperties(props: any) {
  if (!selectedFeature.value || !drawInstance.value) return
  
  // Get current feature
  const feature = { ...selectedFeature.value }
  
  // Update properties
  if (!feature.properties) {
    feature.properties = {}
  }
  
  // Apply the property updates
  Object.keys(props).forEach(key => {
    feature.properties[key] = props[key]
  })
  
  // Update the feature in the draw control
  drawInstance.value.add(feature)
  
  // Refresh selected feature
  selectedFeature.value = feature
  
  // Simulate saving
  simulateSave()
}

// Handle filter changes
function handleFilterChange(filters: any) {
  console.log('Filters changed:', filters)
  // TODO: Implement actual filtering
}

// Create a new plan (clear all)
function createNewPlan() {
  if (!drawInstance.value) return
  
  // Prompt for confirmation
  if (confirm('Voulez-vous vraiment créer un nouveau plan ? Toutes les formes actuelles seront supprimées.')) {
    // Delete all features
    drawInstance.value.deleteAll()
    
    // Refresh the feature list
    allLayers.value = []
    
    // Simulate saving
    simulateSave()
  }
}

// Load a plan (for demo purposes, just a placeholder)
function loadPlan() {
  alert('Fonctionnalité de chargement de plan démo - À implémenter pour un usage réel')
}

// Save the current plan
function savePlan() {
  // Set saving status
  saveStatus.value = 'saving'
  
  // Get all current features
  const features = drawInstance.value?.getAll() || { features: [] }
  
  // Simulate API call with delay
  setTimeout(() => {
    // In a real implementation, you would send features to the server
    console.log('Saving features:', features)
    
    // Update save status and timestamp
    saveStatus.value = 'success'
    lastSave.value = new Date()
    
    // Reset status after showing success message
    setTimeout(() => {
      saveStatus.value = null
    }, 3000)
  }, 1000)
}

// Simulate saving (used after changes)
function simulateSave() {
  // Update last save date without showing UI indicators
  lastSave.value = new Date()
}


// Initialisation du composant
onMounted(() => {
  initMap();
});

onUnmounted(() => {
  // Nettoyage
  if (mapInstance.value) {
    // Supprimer la carte
    mapInstance.value.remove()
  }
  window.removeEventListener('resize', handleResize)
})
</script>

<style>
.maplibre-test-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  overflow: hidden;
}

.map-content-container {
  display: flex;
  flex: 1;
  position: relative;
  overflow: hidden;
}

.map-container {
  flex: 1;
  position: relative;
}

/* Mobile toggle button */
.mobile-toggle-button {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: white;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  z-index: 1000;
}

/* Custom styles for maplibre controls */
.maplibregl-ctrl-bottom-right {
  bottom: 70px; /* Move above the mobile toggle button */
}

/* Hide attribution control */
.maplibregl-ctrl-attrib {
  display: none !important;
}

/* Hide any elements that contain attribution */
.maplibregl-ctrl-attrib-inner {
  display: none !important;
}

/* Hide MapboxGL draw controls */
.mapboxgl-ctrl-group.mapboxgl-ctrl,
.mapbox-gl-draw_ctrl-draw-btn {
  display: none !important;
}

/* Hide specific draw control buttons */
.mapbox-gl-draw_line,
.mapbox-gl-draw_polygon,
.mapbox-gl-draw_point,
.mapbox-gl-draw_trash {
  display: none !important;
}

/* Adjust toolbar height */
:root {
  --header-height: 60px;
  --toolbar-height: 49px;
  --drawer-width: 340px;
  --mobile-toolbar-height: 57px;
  --drawing-tools-width-desktop: 320px;
}

@media (max-width: 767px) {
  .map-container {
    height: calc(100vh - var(--header-height) - var(--mobile-toolbar-height));
  }
}

@media (min-width: 768px) {
  .map-container {
    height: calc(100vh - var(--header-height) - var(--toolbar-height));
  }
}
</style>