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
        :active-tab-prop="activeDrawerTab"
        @tool-selected="handleToolSelection"
        @style-update="updateShapeStyle"
        @properties-update="updateShapeProperties"
        @delete-shape="handleDrawDelete"
        @filter-change="handleFilterChange"
        @tab-change="handleTabChange"
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
// Import MapLibre-Geoman plugin and CSS
import '@geoman-io/maplibre-geoman-free/dist/maplibre-geoman.css'
import { Geoman, type GmOptionsPartial } from '@geoman-io/maplibre-geoman-free'
import { mapService } from '@/maplibre/utils/MapService'
import { DrawingMode } from '@/maplibre/utils/maplibreTypes'
import MapToolbar from '@/maplibre/components/MapToolbar.vue'
import DrawingTools from '@/maplibre/components/DrawingTools.vue'

// Références
const mapContainer = ref<HTMLElement | null>(null)
const mapInstance = ref<maplibregl.Map | null>(null)
let geoman: Geoman | null = null
const geomanReady = ref(false)
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
const activeDrawerTab = ref('tools') // Track the active tab in DrawingTools

console.log('MapLibreTest component setup start', {
  mapContainer,
  mapInstance,
  geoman,
  geomanReady,
  zoomLevel,
  selectedBaseMap,
  selectedFeature,
  windowWidth,
  allLayers,
  isDrawing,
  selectedTool,
  showDrawingTools,
  saveStatus,
  lastSave,
  activeDrawerTab
});

// Initialisation de la carte
const initMap = async () => {
  if (!mapContainer.value) return

  try {
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
    // Ensure glyphs URL is set for text rendering
    if (!initialStyle.glyphs) {
      initialStyle.glyphs = 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf';
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
    console.log('Map instance created', { container: mapContainer.value, style: initialStyle });

    // Monkey-patch addImage to ignore duplicate images and prevent errors when controls re-add icons
    const originalAddImage = mapInstance.value.addImage.bind(mapInstance.value);
    mapInstance.value.addImage = (id, data, options) => {
      if (mapInstance.value.hasImage(id)) return;
      originalAddImage(id, data, options);
    };

    // Initialize Geoman and wait for its load event
    const gmOptions: GmOptionsPartial = {};
    geoman = new Geoman(mapInstance.value, gmOptions);
    mapInstance.value.on('gm:loaded', () => {
      console.log('Geoman loaded event fired');
      if (!geomanReady.value) {
        // Wire Geoman events to handlers
        mapInstance.value.on('gm:create', (e) => {
          const geojson = e.feature?.getGeoJson();
          if (geojson) handleDrawCreate({ features: [geojson], type: 'create' });
        });
        mapInstance.value.on('gm:update', (e) => {
          const geojson = e.feature?.getGeoJson();
          if (geojson) handleDrawUpdate({ features: [geojson], type: 'update' });
        });
        mapInstance.value.on('gm:drawend', (e) => {
          const geojson = e.feature?.getGeoJson();
          if (geojson) handleDrawSelection({ features: [geojson], type: 'select' });
        });
        mapInstance.value.on('gm:remove', (e) => {
          const removed = e.features?.map(f => f.getGeoJson()) || (e.feature ? [e.feature.getGeoJson()] : []);
          handleDrawDelete({ features: removed, type: 'delete' });
        });
        geomanReady.value = true;
      }
    });

    // Déplacer toutes les couches de dessin au-dessus des couches de fond
    mapInstance.value.on('style.load', () => {
      console.log('style.load event fired; repositioning draw layers');
      // Obtenir toutes les couches de dessin
      const drawLayers = mapInstance.value?.getStyle().layers.filter(layer => 
        layer.id.indexOf('gl-draw') === 0
      ) || [];
      
      // Déplacer chaque couche de dessin au-dessus des couches de base
      drawLayers.forEach(layer => {
        if (mapInstance.value?.getLayer(layer.id)) {
          mapInstance.value?.moveLayer(layer.id);
        }
      });
    });

    // Événements
    mapInstance.value.on('zoom', () => {
      if (mapInstance.value) {
        zoomLevel.value = mapInstance.value.getZoom();
      }
    });

    // Add map controls as before
    mapInstance.value.addControl(new maplibregl.NavigationControl() as maplibregl.IControl);
    // Add click handler to select a shape when clicked
    mapInstance.value.on('click', (e) => {
      // Debug: log click events and readiness
      console.log('Map clicked at:', e.point, 'geomanReady:', geomanReady.value);
      if (!geomanReady.value || !mapInstance.value) return;

      // Skip selection when drawing is in progress
      if (selectedTool.value) {
        console.log('Drawing in progress, skip click selection');
        return;
      }

      // Query all features under the click point
      const allFeatures = mapInstance.value.queryRenderedFeatures(e.point);
      console.log('All features under click:', allFeatures);

      // Filter to Geoman-generated layers (prefix "gm_")
      const clickedFeatures = allFeatures.filter(f => f.layer.id.startsWith('gm_'));
      console.log('Filtered clicked features:', clickedFeatures);

      if (clickedFeatures.length > 0) {
        const clickedFeature = clickedFeatures[0] as any;
        console.log('Shape clicked:', clickedFeature);
        // Trigger selection logic
        handleDrawSelection({ features: [clickedFeature], type: 'select' });
        // Re-enable global edit mode to show handles
        mapInstance.value?.gm.enableGlobalEditMode();
        console.log('Feature selected:', selectedFeature.value);
      }
    });
  } catch (error) {
    console.error('Error initializing map:', error);
  }
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
  console.log('handleResize invoked', { windowWidth: window.innerWidth });
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
    
    // Ensure glyphs URL is set when changing style
    if (!newStyle.glyphs) {
      newStyle.glyphs = 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf';
    }
    // Apply the new style
    mapInstance.value.setStyle(newStyle)
  } catch (error) {
    console.error('Error creating map style:', error)
    // Fallback to IGN if error
    newStyle = mapService.createStandardMapStyle('ign')
    mapInstance.value.setStyle(newStyle)
  }
  console.log('handleMapTypeChange invoked', { type, mapInstance: mapInstance.value, gm: mapInstance.value?.gm });
}

// Adjust the map view to fit all drawn features
const fitMapView = () => {
  if (!mapInstance.value) return
  
  // Get all features
  const features = mapInstance.value.gm.getGeometries()
  
  // If no features, nothing to fit
  if (features.length === 0) return
  
  // Create a bounding box from all features
  let bounds = new maplibregl.LngLatBounds()
  
  // Add each feature coordinates to the bounds
  features.forEach(feature => {
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
  console.log('fitMapView invoked', { featureCount: mapInstance.value?.gm.getGeometries().length });
}

// Handle drawing creation event
function handleDrawCreate(e: any) {
  console.log('handleDrawCreate invoked', { features: e.features, mapInstance: mapInstance.value, gm: mapInstance.value?.gm });
  console.log('Feature created:', e.features)
  // Refresh the feature list
  allLayers.value = e.features
  // Reset selected tool to none
  selectedTool.value = ''
  // Simulate saving
  simulateSave()
  // After drawing, disable draw mode and return to global edit mode
  mapInstance.value?.gm.disableAllModes()
  mapInstance.value?.gm.enableGlobalEditMode()
}

// Handle drawing update event
function handleDrawUpdate(e: any) {
  console.log('handleDrawUpdate invoked', { features: e.features, mapInstance: mapInstance.value, gm: mapInstance.value?.gm });
  console.log('Feature updated:', e.features)
  // Refresh the feature list
  allLayers.value = e.features
  // Simulate saving
  simulateSave()
}

// Handle drawing selection change event
function handleDrawSelection(e: any) {
  console.log('handleDrawSelection invoked', { features: e.features, mapInstance: mapInstance.value, gm: mapInstance.value?.gm });
  if (e.features.length > 0) {
    // Get the selected feature
    const feature = e.features[0];
    
    // Make sure the feature has properties
    if (!feature.properties) {
      feature.properties = {};
    }
    
    // Make sure the feature has type property based on geometry
    if (!feature.properties.type) {
      if (feature.geometry.type === 'Point') {
        feature.properties.type = 'Note';
      } else if (feature.geometry.type === 'LineString') {
        feature.properties.type = 'Line';
      } else if (feature.geometry.type === 'Polygon') {
        feature.properties.type = 'Polygon';
      }
    }
    
    // Make sure the feature has style properties
    if (!feature.properties.style) {
      feature.properties.style = {};
    }
    
    // Extract style from draw options
    const styleProps = feature.properties.style || {};
    
    // Create options object if it doesn't exist
    if (!feature.options) {
      feature.options = {};
    }
    
    // Set default style properties if not present
    feature.options.color = styleProps.strokeColor || '#2b6451';
    feature.options.weight = styleProps.strokeWidth || 3;
    feature.options.dashArray = styleProps.strokeStyle === 'dashed' ? '5, 5' : null;
    feature.options.fillColor = styleProps.fillColor || '#2b6451';
    feature.options.fillOpacity = styleProps.fillOpacity !== undefined ? styleProps.fillOpacity : 0.2;
    
    // Store the reference to the layer
    feature.layer = {
      options: feature.options,
      // Add dummy methods that might be called by DrawingTools
      editNote: () => {
        console.log('Edit note method called');
        // Implement note editing functionality if needed
      },
      openInGoogleMaps: () => {
        console.log('Open in Google Maps method called');
        // Implement Google Maps opening functionality if needed
        if (feature.geometry.type === 'Point') {
          const coords = feature.geometry.coordinates;
          const url = `https://www.google.com/maps/search/?api=1&query=${coords[1]},${coords[0]}`;
          window.open(url, '_blank');
        }
      }
    };
    
    // Update the selected feature
    selectedFeature.value = feature;
    
    // Autoscroll to selected feature if needed
    if (mapInstance.value) {
      let center;
      
      if (feature.geometry.type === 'Point') {
        center = feature.geometry.coordinates;
      } else if (feature.geometry.type === 'LineString') {
        // Use the middle point of the line
        const coords = feature.geometry.coordinates;
        const midIndex = Math.floor(coords.length / 2);
        center = coords[midIndex];
      } else if (feature.geometry.type === 'Polygon') {
        // Calculate centroid of polygon
        const coords = feature.geometry.coordinates[0];
        let sumX = 0;
        let sumY = 0;
        coords.forEach(coord => {
          sumX += coord[0];
          sumY += coord[1];
        });
        center = [sumX / coords.length, sumY / coords.length];
      }
      
      if (center) {
        mapInstance.value.easeTo({
          center: center,
          zoom: mapInstance.value.getZoom(),
          duration: 500
        });
      }
    }
  } else {
    // No feature selected
    selectedFeature.value = null;
  }
  
  console.log('Selection changed:', selectedFeature.value);
  // Disable all Geoman modes to clear selection handles on the map after drawing
  mapInstance.value?.gm.disableAllModes();
}

// Handle drawing deletion event
function handleDrawDelete(e: any) {
  console.log('handleDrawDelete invoked', { features: e.features, mapInstance: mapInstance.value, gm: mapInstance.value?.gm });
  console.log('Feature deleted:', e.features)
  // Refresh the feature list
  allLayers.value = e.features
  // Simulate saving
  simulateSave()
}

// Handle tool selection
function handleToolSelection(tool: string) {
  console.log('handleToolSelection invoked', { tool });
  console.log('mapInstance.value.gm at selection:', mapInstance.value?.gm);
  // Check if the map and Geoman are initialized
  if (!mapInstance.value || !mapInstance.value.gm || !geomanReady.value) {
    console.error('handleToolSelection error: Map/gm not initialized or geoman not ready', {
      tool,
      mapInstance: mapInstance.value,
      gm: mapInstance.value?.gm,
      geomanReady: geomanReady.value
    });
    return;
  }
  
  try {
    // Disable all active modes (draw, edit, helper)
    mapInstance.value.gm.disableAllModes();
    if (!tool) {
      // Enable global edit mode to allow moving and resizing shapes
      mapInstance.value.gm.enableGlobalEditMode();
      selectedTool.value = '';
      return;
    }
    
    selectedTool.value = tool;
    // Geoman drawing mode mapping for plugin
    const modeMap: Record<string, string> = {
      'Polygon': 'polygon',
      'Line': 'line',
      'Note': 'marker'
    };
    const drawMode = modeMap[tool];
    if (drawMode) {
      // Enable the selected drawing mode
      mapInstance.value.gm.enableDraw(drawMode as any);
    }
  } catch (error) {
    console.error('Error in handleToolSelection caught exception:', error);
  }
}

// Update shape style
function updateShapeStyle(styleProps: any) {
  if (!selectedFeature.value || !mapInstance.value) return
  
  console.log('Selected feature:', selectedFeature.value);
  console.log('Style props to update:', styleProps);
  
  try {
    // Ensure numeric paint properties are numbers, not strings
    if (styleProps.strokeWidth !== undefined) {
      styleProps.strokeWidth = Number(styleProps.strokeWidth);
    }
    if (styleProps.fillOpacity !== undefined) {
      styleProps.fillOpacity = Number(styleProps.fillOpacity);
    }
    // Create a deep clone of the feature
    const updatedFeature = JSON.parse(JSON.stringify(selectedFeature.value));
    
    // Make sure properties object exists
    if (!updatedFeature.properties) {
      updatedFeature.properties = {};
    }
    
    // Make sure style object exists
    if (!updatedFeature.properties.style) {
      updatedFeature.properties.style = {};
    }
    
    // Apply the style updates to properties.style
    Object.keys(styleProps).forEach(key => {
      updatedFeature.properties.style[key] = styleProps[key];
    });
    
    // Also update the feature options for DrawingTools display
    if (!updatedFeature.options) {
      updatedFeature.options = {};
    }
    
    // Update feature options based on style properties
    if (styleProps.strokeColor) {
      updatedFeature.options.color = styleProps.strokeColor;
      
      // Update the layer options as well
      if (updatedFeature.layer && updatedFeature.layer.options) {
        updatedFeature.layer.options.color = styleProps.strokeColor;
      }
    }
    
    if (styleProps.strokeWidth !== undefined) {
      updatedFeature.options.weight = styleProps.strokeWidth;
      
      // Update the layer options as well
      if (updatedFeature.layer && updatedFeature.layer.options) {
        updatedFeature.layer.options.weight = styleProps.strokeWidth;
      }
    }
    
    if (styleProps.strokeStyle) {
      updatedFeature.options.dashArray = styleProps.strokeStyle === 'dashed' ? '5, 5' : null;
      
      // Update the layer options as well
      if (updatedFeature.layer && updatedFeature.layer.options) {
        updatedFeature.layer.options.dashArray = styleProps.strokeStyle === 'dashed' ? '5, 5' : null;
      }
    }
    
    if (styleProps.fillColor) {
      updatedFeature.options.fillColor = styleProps.fillColor;
      
      // Update the layer options as well
      if (updatedFeature.layer && updatedFeature.layer.options) {
        updatedFeature.layer.options.fillColor = styleProps.fillColor;
      }
    }
    
    if (styleProps.fillOpacity !== undefined) {
      updatedFeature.options.fillOpacity = styleProps.fillOpacity;
      
      // Update the layer options as well
      if (updatedFeature.layer && updatedFeature.layer.options) {
        updatedFeature.layer.options.fillOpacity = styleProps.fillOpacity;
      }
    }
    
    // Store the updated style in the feature for visual rendering
    selectedFeature.value.properties.style = { ...updatedFeature.properties.style };
    selectedFeature.value.options = { ...updatedFeature.options };
    
    if (selectedFeature.value.layer) {
      selectedFeature.value.layer.options = { ...updatedFeature.layer.options };
    }
    
    // Force UI update
    selectedFeature.value = { ...selectedFeature.value };

    // Update map paint properties for Geoman layers
    const styleLayers = mapInstance.value?.getStyle().layers || [];
    styleLayers.forEach(layer => {
      if (!mapInstance.value) return;
      if (!layer.id.startsWith('gm_')) return;
      // Fill layers
      if (layer.type === 'fill') {
        if (styleProps.fillColor) {
          mapInstance.value.setPaintProperty(layer.id, 'fill-color', styleProps.fillColor);
        }
        if (styleProps.fillOpacity !== undefined) {
          mapInstance.value.setPaintProperty(layer.id, 'fill-opacity', styleProps.fillOpacity);
        }
      }
      // Line layers
      if (layer.type === 'line') {
        // Reapply the current stroke color and width
        const curOptions = selectedFeature.value?.options || {};
        const lineColor = styleProps.strokeColor ?? curOptions.color;
        const lineWidth = styleProps.strokeWidth ?? curOptions.weight;
        if (lineColor !== undefined) {
          mapInstance.value.setPaintProperty(layer.id, 'line-color', lineColor);
        }
        if (lineWidth !== undefined) {
          mapInstance.value.setPaintProperty(layer.id, 'line-width', lineWidth);
        }
        // Apply dash pattern for dashed, dotted, or reset for solid
        if (styleProps.strokeStyle === 'dashed') {
          mapInstance.value.setPaintProperty(layer.id, 'line-dasharray', [5, 5]);
        } else if (styleProps.strokeStyle === 'dotted') {
          mapInstance.value.setPaintProperty(layer.id, 'line-dasharray', [1, 1]);
        } else {
          // Solid: remove any dasharray to render a continuous line
          mapInstance.value.setPaintProperty(layer.id, 'line-dasharray', undefined);
        }
      }
    });

    // Simulate saving
    simulateSave()
    // Return to global edit mode after drawing
    mapInstance.value?.gm.enableGlobalEditMode()
  } catch (error) {
    console.error('Error updating feature style:', error);
  }
}

// Update shape properties
function updateShapeProperties(props: any) {
  if (!selectedFeature.value || !mapInstance.value) return
  
  console.log('Selected feature for property update:', selectedFeature.value);
  console.log('Properties to update:', props);
  
  try {
    // Create a deep clone of the feature
    const updatedFeature = JSON.parse(JSON.stringify(selectedFeature.value));
    
    // Make sure properties object exists
    if (!updatedFeature.properties) {
      updatedFeature.properties = {};
    }
    
    // Apply property updates
    Object.keys(props).forEach(key => {
      updatedFeature.properties[key] = props[key];
    });
    
    // Update the actual feature properties
    if (!selectedFeature.value.properties) {
      selectedFeature.value.properties = {};
    }
    
    // Apply all properties
    Object.keys(props).forEach(key => {
      selectedFeature.value.properties[key] = props[key];
    });
    
    // If updating category or access level, update in the internal properties as well
    if (props.category && selectedFeature.value.properties) {
      selectedFeature.value.properties.category = props.category;
    }
    
    if (props.accessLevel && selectedFeature.value.properties) {
      selectedFeature.value.properties.accessLevel = props.accessLevel;
    }
    
    // If updating the name, make sure it's set correctly
    if (props.name && selectedFeature.value.properties) {
      selectedFeature.value.properties.name = props.name;
    }
    
    // Force UI update
    selectedFeature.value = { ...selectedFeature.value };
    
    // Simulate saving
    simulateSave();
    
    console.log('Properties updated successfully:', updatedFeature.properties);
  } catch (error) {
    console.error('Error updating feature properties:', error);
  }
}

// Handle filter changes
function handleFilterChange(filters: any) {
  console.log('handleFilterChange invoked', { filters, mapInstance: mapInstance.value, gm: mapInstance.value?.gm });
  console.log('Filters changed:', filters)
  // TODO: Implement actual filtering
}

// Create a new plan (clear all)
function createNewPlan() {
  console.log('createNewPlan invoked', { mapInstance: mapInstance.value, gm: mapInstance.value?.gm });
  if (!mapInstance.value) return
  
  // Prompt for confirmation
  if (confirm('Voulez-vous vraiment créer un nouveau plan ? Toutes les formes actuelles seront supprimées.')) {
    // Delete all features
    geoman?.disableDraw()
    
    // Refresh the feature list
    allLayers.value = []
    
    // Simulate saving
    simulateSave()
  }
}

// Load a plan (for demo purposes, just a placeholder)
function loadPlan() {
  console.log('loadPlan invoked', { mapInstance: mapInstance.value });
  alert('Fonctionnalité de chargement de plan démo - À implémenter pour un usage réel')
}

// Save the current plan
function savePlan() {
  console.log('savePlan invoked', { mapInstance: mapInstance.value, gm: mapInstance.value?.gm });
  // Set saving status
  saveStatus.value = 'saving'
  
  // Retrieve drawn geometries from the Geoman instance
  const features = geoman?.features.getGeomanDrawLayers() || []
  
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
  console.log('simulateSave invoked');
  // Update last save date without showing UI indicators
  lastSave.value = new Date()
}

// Handle tab change in DrawingTools
function handleTabChange(tabName: string) {
  console.log('handleTabChange invoked', { tabName, mapInstance: mapInstance.value, gm: mapInstance.value?.gm });
  activeDrawerTab.value = tabName;
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