/**
 * Composable useMapLibreDrawing
 * 
 * Gère les fonctionnalités de dessin avec MapLibre GL JS
 * Équivalent à useMapDrawing.ts pour Leaflet, mais optimisé pour MapLibre et le tactile
 */

import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import maplibregl from 'maplibre-gl'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import type { DrawHandlers, DrawingMode, DrawEvent } from '../utils/maplibreTypes'

/**
 * Options pour le composable useMapLibreDrawing
 */
interface UseMapLibreDrawingOptions {
  // Options pour personnaliser les points de contrôle touchables
  controlPointRadius?: number
  midPointRadius?: number
  activePointColor?: string
  inactivePointColor?: string
  
  // Événements de dessin custom
  onDrawCreate?: (event: DrawEvent) => void
  onDrawUpdate?: (event: DrawEvent) => void
  onDrawSelect?: (event: DrawEvent) => void
  onDrawDelete?: (event: DrawEvent) => void
}

/**
 * Composable principal pour gérer le dessin sur une carte MapLibre
 */
export function useMapLibreDrawing(options: UseMapLibreDrawingOptions = {}) {
  // État interne
  const map = ref<maplibregl.Map | null>(null)
  const draw = ref<MapboxDraw | null>(null)
  const isDrawing = ref(false)
  const activeTool = ref<string | null>(null)
  const selectedFeature = ref<GeoJSON.Feature | null>(null)
  
  // Options par défaut avec valeurs optimisées pour le tactile
  const defaultOptions = {
    controlPointRadius: 10, // Plus grand pour être plus facile à toucher
    midPointRadius: 8,      // Plus grand pour être plus facile à toucher
    activePointColor: '#2b6451',
    inactivePointColor: '#3388ff'
  }
  
  // Fusionner les options fournies avec les options par défaut
  const mergedOptions = { ...defaultOptions, ...options }
  
  /**
   * Initialise le système de dessin avec une carte MapLibre
   */
  const initDrawing = (mapInstance: maplibregl.Map) => {
    map.value = mapInstance
    
    // Créer une instance du plugin de dessin avec des styles optimisés pour le tactile
    draw.value = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        point: true,
        line_string: true,
        polygon: true,
        trash: true
      },
      // Styles personnalisés pour optimiser l'affichage tactile
      styles: getCustomDrawStyles()
    })
    
    // Ajouter le contrôle de dessin à la carte
    map.value.addControl(draw.value)
    
    // Attacher les événements de dessin
    setupDrawEvents()
  }
  
  /**
   * Obtient des styles personnalisés pour le dessin, optimisés pour le tactile
   */
  const getCustomDrawStyles = () => {
    return [
      // Style pour le point de contrôle actif
      {
        'id': 'gl-draw-point-active',
        'type': 'circle',
        'filter': ['all', ['==', '$type', 'Point'], ['==', 'meta', 'feature'], ['==', 'active', 'true']],
        'paint': {
          'circle-radius': mergedOptions.controlPointRadius + 2, // Plus grand quand actif
          'circle-color': mergedOptions.activePointColor,
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
          'circle-radius': mergedOptions.controlPointRadius,
          'circle-color': mergedOptions.inactivePointColor,
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
          'line-color': mergedOptions.activePointColor,
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
          'line-color': mergedOptions.inactivePointColor,
          'line-width': 3
        }
      },
      // Style pour les polygones actifs
      {
        'id': 'gl-draw-polygon-active',
        'type': 'fill',
        'filter': ['all', ['==', '$type', 'Polygon'], ['==', 'active', 'true']],
        'paint': {
          'fill-color': mergedOptions.activePointColor,
          'fill-opacity': 0.4
        }
      },
      // Style pour les polygones inactifs
      {
        'id': 'gl-draw-polygon',
        'type': 'fill',
        'filter': ['all', ['==', '$type', 'Polygon'], ['==', 'active', 'false']],
        'paint': {
          'fill-color': mergedOptions.inactivePointColor,
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
          'line-color': mergedOptions.activePointColor,
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
          'line-color': mergedOptions.inactivePointColor,
          'line-width': 3
        }
      },
      // Style pour les points de contrôle des vertex (en mode édition)
      {
        'id': 'gl-draw-point-vertex',
        'type': 'circle',
        'filter': ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point']],
        'paint': {
          'circle-radius': mergedOptions.controlPointRadius, // Plus grand pour être plus facile à toucher
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
          'circle-radius': mergedOptions.midPointRadius, // Plus grand pour être plus facile à toucher
          'circle-color': '#FFFFFF',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#D20C0C'
        }
      }
    ]
  }
  
  /**
   * Configure les écouteurs d'événements de dessin
   */
  const setupDrawEvents = () => {
    if (!map.value || !draw.value) return
    
    // Événement de création d'une forme
    map.value.on('draw.create', (e: any) => {
      // When a shape is created, disable drawing mode and reset the active tool
      isDrawing.value = false
      activeTool.value = null
      
      // Call the callback if provided
      if (options.onDrawCreate) {
        options.onDrawCreate(e)
      }
      
      // Use setTimeout to avoid recursive stack calls
      setTimeout(() => {
        if (draw.value) {
          draw.value.changeMode('simple_select')
        }
      }, 0)
    })
    
    // Événement de mise à jour d'une forme
    map.value.on('draw.update', (e: any) => {
      if (options.onDrawUpdate) {
        options.onDrawUpdate(e)
      }
    })
    
    // Événement de changement de sélection
    map.value.on('draw.selectionchange', (e: any) => {
      selectedFeature.value = e.features.length > 0 ? e.features[0] : null
      if (options.onDrawSelect) {
        options.onDrawSelect(e)
      }
    })
    
    // Événement de suppression d'une forme
    map.value.on('draw.delete', (e: any) => {
      selectedFeature.value = null
      if (options.onDrawDelete) {
        options.onDrawDelete(e)
      }
    })
    
    // Événement de changement de mode
    map.value.on('draw.modechange', (e: any) => {
      isDrawing.value = e.mode !== 'simple_select' && e.mode !== 'direct_select'
    })
  }
  
  /**
   * Change le mode de dessin actif
   */
  const changeDrawingMode = (mode: string) => {
    if (!draw.value) return
    
    // Store the draw mode based on the tool type
    let drawMode: string;
    
    switch (mode) {
      case 'point':
        drawMode = 'draw_point';
        activeTool.value = 'Note'; // Update activeTool with proper tool name
        isDrawing.value = true;
        break;
      case 'line':
        drawMode = 'draw_line_string';
        activeTool.value = 'Line'; // Update activeTool with proper tool name
        isDrawing.value = true;
        break;
      case 'polygon':
        drawMode = 'draw_polygon';
        activeTool.value = 'Polygon'; // Update activeTool with proper tool name
        isDrawing.value = true;
        break;
      case 'select':
        drawMode = 'simple_select';
        activeTool.value = null;
        isDrawing.value = false;
        break;
      default:
        drawMode = 'simple_select';
        activeTool.value = null;
        isDrawing.value = false;
        break;
    }
    
    // Apply the draw mode to the mapbox draw instance
    draw.value.changeMode(drawMode);
  }
  
  /**
   * Désactive le dessin et revient en mode sélection
   */
  const disableDrawing = () => {
    if (!draw.value) return
    
    activeTool.value = null
    isDrawing.value = false
    draw.value.changeMode('simple_select')
  }
  
  /**
   * Supprime toutes les formes dessinées
   */
  const clearAllDrawings = () => {
    if (!draw.value) return
    
    draw.value.deleteAll()
    selectedFeature.value = null
  }
  
  /**
   * Supprime la forme actuellement sélectionnée
   */
  const deleteSelectedFeature = () => {
    if (!draw.value || !selectedFeature.value) return
    
    draw.value.delete(selectedFeature.value.id)
    selectedFeature.value = null
  }
  
  /**
   * Affiche toutes les formes dessinées
   */
  const getAllFeatures = () => {
    if (!draw.value) return []
    
    return draw.value.getAll().features
  }

  /**
   * Nettoie les événements lors de la destruction du composant
   */
  const cleanup = () => {
    if (!map.value) return
    
    map.value.off('draw.create')
    map.value.off('draw.update')
    map.value.off('draw.selectionchange')
    map.value.off('draw.delete')
    map.value.off('draw.modechange')
    
    if (draw.value && map.value) {
      map.value.removeControl(draw.value)
    }
  }
  
  // Nettoyage lors de la destruction du composant
  onUnmounted(() => {
    cleanup()
  })
  
  // API publique
  return {
    initDrawing,
    map,
    draw,
    isDrawing,
    activeTool,
    selectedFeature,
    changeDrawingMode,
    disableDrawing,
    clearAllDrawings,
    deleteSelectedFeature,
    getAllFeatures,
    cleanup
  }
}