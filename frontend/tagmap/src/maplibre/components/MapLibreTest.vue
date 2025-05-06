<template>
  <div class="maplibre-test-container">
    <div class="map-container" ref="mapContainer"></div>
    <div class="controls">
      <div class="layer-control">
        <h3>Fonds de carte</h3>
        <div class="layer-options">
          <label>
            <input
              type="radio"
              name="baseMap"
              value="hybrid"
              v-model="selectedBaseMap"
              @change="changeBaseMap"
            />
            Hybride
          </label>
          <label>
            <input
              type="radio"
              name="baseMap"
              value="cadastre"
              v-model="selectedBaseMap"
              @change="changeBaseMap"
            />
            Cadastre
          </label>
          <label>
            <input
              type="radio"
              name="baseMap"
              value="ign"
              v-model="selectedBaseMap"
              @change="changeBaseMap"
            />
            IGN
          </label>
        </div>
      </div>
      <div class="draw-control" v-if="mapInstance">
        <h3>Outils de dessin</h3>
        <div class="draw-options">
          <button @click="enableDrawing('point')" :class="{ active: activeDrawTool === 'point' }">
            Point
          </button>
          <button @click="enableDrawing('line')" :class="{ active: activeDrawTool === 'line' }">
            Ligne
          </button>
          <button @click="enableDrawing('polygon')" :class="{ active: activeDrawTool === 'polygon' }">
            Polygone
          </button>
          <button @click="disableDrawing" :class="{ active: activeDrawTool === null }">
            Sélection
          </button>
          <button @click="deleteSelectedFeature" :disabled="!selectedFeature" class="delete-button">
            Supprimer
          </button>
        </div>
        
        <div v-if="selectedFeature" class="feature-info">
          <p><strong>Forme sélectionnée:</strong> {{ selectedFeature.geometry.type }}</p>
          <p class="hint">Essayez de déplacer les points de contrôle</p>
        </div>
      </div>
      <div class="info-panel">
        <h3>Test sur mobile</h3>
        <p>
          Ce composant démontre les capacités tactiles de MapLibre GL JS pour l'édition de formes géométriques sur mobile.
        </p>
        <p>
          <small>Zoom: {{ zoomLevel ? zoomLevel.toFixed(2) : '-' }}</small>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import { mapService } from '@/maplibre/utils/MapService'

// Références
const mapContainer = ref<HTMLElement | null>(null)
const mapInstance = ref<maplibregl.Map | null>(null)
const drawInstance = ref<MapboxDraw | null>(null)
const activeDrawTool = ref<string | null>(null)
const zoomLevel = ref<number | null>(null)
const selectedBaseMap = ref('hybrid') // Utiliser la carte hybride par défaut
const selectedFeature = ref<GeoJSON.Feature | null>(null)

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
      // Utiliser Google Maps Roadmap avec couche cadastre superposée
      initialStyle = await mapService.createGoogleMapStyle('google', 'roadmap', true);
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
    transformRequest: mapService.getTransformRequest(),
  });

  // Initialisation de MapboxDraw (pour le dessin de formes)
  drawInstance.value = new MapboxDraw({
    displayControlsDefault: false,
    // Personnalisation des styles pour les contrôles tactiles
    controls: {
      point: true,
      line_string: true,
      polygon: true,
      trash: true
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
  mapInstance.value.addControl(new maplibregl.ScaleControl() as maplibregl.IControl)
  mapInstance.value.addControl(new maplibregl.GeolocateControl({
    positionOptions: {
      enableHighAccuracy: true
    },
    trackUserLocation: true
  }) as maplibregl.IControl)

  // Ajout du contrôle de dessin - S'assurer qu'il est ajouté APRÈS les fonds de carte
  // pour que les couches de dessin soient au-dessus
  mapInstance.value.addControl(drawInstance.value as unknown as maplibregl.IControl)
  
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

  // Événements liés au dessin
  mapInstance.value.on('draw.create', handleDrawCreate)
  mapInstance.value.on('draw.update', handleDrawUpdate)
  mapInstance.value.on('draw.selectionchange', handleDrawSelectionChange)
  mapInstance.value.on('draw.delete', handleDrawDelete)

  // Gérer le redimensionnement de la fenêtre
  window.addEventListener('resize', handleResize)
}

// Événements de dessin
const handleDrawCreate = (e: any) => {
  console.log('Feature created:', e.features)
}

const handleDrawUpdate = (e: any) => {
  console.log('Feature updated:', e.features)
}

const handleDrawSelectionChange = (e: any) => {
  selectedFeature.value = e.features.length > 0 ? e.features[0] : null
  console.log('Selection changed:', e.features)
}

const handleDrawDelete = (e: any) => {
  console.log('Feature deleted:', e.features)
}

// Changement du fond de carte
const changeBaseMap = async () => {
  if (!mapInstance.value) return;
  
  // Définir le style selon le fond de carte sélectionné
  let newStyle;

  try {
    if (selectedBaseMap.value === 'hybrid') {
      // Créer un style pour Google Maps Hybrid
      newStyle = await mapService.createGoogleMapStyle('google', 'hybrid', false);
    } else if (selectedBaseMap.value === 'cadastre') {
      // Remplacer par Google Maps Roadmap avec couche cadastre superposée
      newStyle = await mapService.createGoogleMapStyle('google', 'roadmap', true);
    } else {
      // Utiliser des tuiles standard IGN
      newStyle = mapService.createStandardMapStyle('ign');
    }
  } catch (error) {
    console.error('Erreur lors de la création du style de carte:', error);
    // Fallback à IGN si erreur
    newStyle = mapService.createStandardMapStyle('ign');
  }

  // Appliquer le nouveau style
  mapInstance.value.setStyle(newStyle);
}

// Gestion du redimensionnement
const handleResize = () => {
  if (mapInstance.value) {
    mapInstance.value.resize()
  }
}

// Outils de dessin
const enableDrawing = (type: string) => {
  if (!drawInstance.value) return
  
  activeDrawTool.value = type
  
  // Activation du mode de dessin approprié
  switch (type) {
    case 'point':
      drawInstance.value.changeMode('draw_point')
      break
    case 'line':
      drawInstance.value.changeMode('draw_line_string')
      break
    case 'polygon':
      drawInstance.value.changeMode('draw_polygon')
      break
    default:
      break
  }
}

const disableDrawing = () => {
  if (!drawInstance.value) return
  
  activeDrawTool.value = null
  drawInstance.value.changeMode('simple_select')
}

// Suppression de la forme sélectionnée
const deleteSelectedFeature = () => {
  if (!drawInstance.value || !selectedFeature.value) return
  
  const featureId = selectedFeature.value.id as string;
  drawInstance.value.delete(featureId);
  selectedFeature.value = null
}

// Initialisation du composant
onMounted(() => {
  initMap();
});

onUnmounted(() => {
  // Nettoyage
  if (mapInstance.value) {
    // Supprimer les listeners d'événements
    mapInstance.value.off('draw.create', handleDrawCreate)
    mapInstance.value.off('draw.update', handleDrawUpdate)
    mapInstance.value.off('draw.selectionchange', handleDrawSelectionChange)
    mapInstance.value.off('draw.delete', handleDrawDelete)
    
    // Supprimer la carte
    mapInstance.value.remove()
  }
  window.removeEventListener('resize', handleResize)
})
</script>

<style>
/* Styles pour le test MapLibre */
.maplibre-test-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
}

.map-container {
  flex: 1;
  position: relative;
}

.controls {
  background-color: white;
  border-top: 1px solid #ccc;
  padding: 10px;
  z-index: 1;
}

.layer-control,
.draw-control,
.info-panel {
  margin-bottom: 15px;
}

h3 {
  font-size: 16px;
  margin-top: 0;
  margin-bottom: 8px;
}

.layer-options,
.draw-options {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

button {
  padding: 8px 12px;
  border: 1px solid #ccc;
  background-color: #f5f5f5;
  border-radius: 4px;
  cursor: pointer;
}

button.active {
  background-color: #2b6451;
  color: white;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

button.delete-button {
  background-color: #f8d7da;
  border-color: #f5c6cb;
  color: #721c24;
}

button.delete-button:hover:not(:disabled) {
  background-color: #f1aeb5;
}

.feature-info {
  margin-top: 10px;
  padding: 8px;
  background-color: #e9f5f2;
  border-radius: 4px;
  border-left: 4px solid #2b6451;
}

.feature-info p {
  margin: 5px 0;
  font-size: 14px;
}

.feature-info .hint {
  font-style: italic;
  color: #666;
  font-size: 13px;
}

/* Adaptation mobile */
@media (max-width: 768px) {
  .controls {
    padding: 5px;
  }
  
  .layer-options,
  .draw-options {
    gap: 5px;
  }
  
  button {
    padding: 12px;
    font-size: 16px; /* Plus grand sur mobile pour être plus facile à toucher */
  }
  
  .info-panel p {
    font-size: 14px;
    margin: 5px 0;
  }
  
  /* Styles spécifiques pour améliorer l'expérience tactile */
  .mapboxgl-ctrl-group button {
    width: 40px !important;  /* Plus grand pour être plus facile à toucher */
    height: 40px !important; /* Plus grand pour être plus facile à toucher */
  }
  
  /* Assurer que les control points sont plus grands sur mobile */
  .mapboxgl-user-location-dot {
    width: 24px !important;
    height: 24px !important;
  }
}
</style>