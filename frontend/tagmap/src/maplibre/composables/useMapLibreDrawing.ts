/**
 * Composable useMapLibreDrawing
 * 
 * Gère les fonctionnalités de dessin avec MapLibre GL JS
 * Équivalent à useMapDrawing.ts pour Leaflet, mais optimisé pour MapLibre et le tactile
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import maplibregl from 'maplibre-gl'
import { createGeomanInstance, type GmOptionsPartial, type Geoman } from '@geoman-io/maplibre-geoman-free';
import '@geoman-io/maplibre-geoman-free/dist/maplibre-geoman.css';
import type { DrawHandlers, DrawEvent } from '../utils/mapLibreTypes'

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

// Mapping des types de géométrie aux modes de dessin
const DRAW_MODES: Record<string, string> = {
  'point': 'draw_point',
  'line': 'draw_line_string',
  'polygon': 'draw_polygon',
  'select': 'simple_select'
};

/**
 * Composable principal pour gérer le dessin sur une carte MapLibre
 */
export function useMapLibreDrawing(options: UseMapLibreDrawingOptions = {}) {
  // État interne
  const map = ref<maplibregl.Map | null>(null)
  let geoman: Geoman;
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
  const initDrawing = async (mapInstance: maplibregl.Map) => {
    if (!mapInstance) return;
    
    map.value = mapInstance;
    
    // Initialize Geoman plugin for MapLibre
    const gmOptions: GmOptionsPartial = {};
    geoman = await createGeomanInstance(mapInstance, gmOptions);
    await geoman.addControls();
    geomanReady.value = true;

    // Register Geoman events
    mapInstance.on('gm:create', (e: any) => {
      isDrawing.value = false;
      selectedFeature.value = e.layer.feature;
      options.onDrawCreate?.({ type: 'create', features: [e.layer.feature] });
    });
    mapInstance.on('gm:update', (e: any) =>
      options.onDrawUpdate?.({ type: 'update', features: [e.layer.feature] })
    );
    mapInstance.on('gm:drawend', (e: any) =>
      options.onDrawSelect?.({ type: 'select', features: [e.layer.feature] })
    );
    mapInstance.on('gm:remove', (e: any) => {
      selectedFeature.value = null;
      options.onDrawDelete?.({
        type: 'delete',
        features: e.layers.map((l: any) => l.feature),
      });
    });
  }
  
  /**
   * Change le mode de dessin actif
   */
  const changeDrawingMode = (mode: string) => {
    if (!map.value) return;
    const geomanMode = DRAW_MODES[mode];
    geoman?.disableDraw();
    if (geomanMode) {
      geoman?.enableDraw(geomanMode as any);
      activeTool.value = mode;
      isDrawing.value = true;
    } else {
      activeTool.value = null;
      isDrawing.value = false;
    }
  }
  
  /**
   * Désactive le dessin et passe en mode sélection
   */
  const disableDrawing = () => {
    if (!map.value) return;
    try {
      geoman?.disableDraw();
      activeTool.value = null;
      isDrawing.value = false;
    } catch { }
  }
  
  /**
   * Supprime toutes les formes dessinées
   */
  const clearAllDrawings = () => {
    if (!map.value) return;
    
    try {
      // Delete all features
      geoman?.removeAll();
      selectedFeature.value = null;
    } catch (error) {
      console.error('Error clearing all drawings:', error);
    }
  }
  
  /**
   * Supprime la forme actuellement sélectionnée
   */
  const deleteSelectedFeature = () => {
    if (!map.value || !selectedFeature.value) return;
    
    try {
      // Remove the feature from map
      geoman?.removeLayer(selectedFeature.value.id as string);
      selectedFeature.value = null;
    } catch (error) {
      console.error('Error deleting selected feature:', error);
    }
  }
  
  /**
   * Récupère toutes les formes dessinées
   */
  const getAllFeatures = () => {
    if (!map.value) return [];
    
    try {
      // Return all drawn geometries
      return geoman?.getGeometries().map((g: any) => g.feature) || [];
    } catch (error) {
      console.error('Error getting all features:', error);
      return [];
    }
  }

  /**
   * Nettoie les événements lors de la destruction du composant
   */
  const cleanup = () => {
    if (!map.value) return;
    
    // Remove event listeners
    if (map.value) {
      map.value.off('gm:create', () => {});
      map.value.off('gm:update', () => {});
      map.value.off('gm:drawend', () => {});
      map.value.off('gm:remove', () => {});
    }
  }
  
  /**
   * Met à jour le style d'une forme sélectionnée
   * @param featureId ID de la feature à mettre à jour
   * @param styleProps Propriétés de style à appliquer
   */
  const updateFeatureStyle = (featureId: string | number, styleProps: any) => {
    if (!map.value || !selectedFeature.value) return;

    try {
      console.log('Updating feature style for ID:', featureId);
      console.log('Style properties:', styleProps);

      // Get the feature by ID
      const feature = geoman?.getLayer(selectedFeature.value.id as string);
      if (!feature) {
        console.error(`Feature with ID ${selectedFeature.value.id} not found`);
        return;
      }
      
      console.log('Original feature:', feature);

      // Create a copy of the feature to modify
      const updatedFeature = JSON.parse(JSON.stringify(feature));

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

      console.log('Updated feature to add:', updatedFeature);

      // Update feature in MapLibre
      geoman?.updateLayer(selectedFeature.value.id as string, updatedFeature);

      // The critical step - call setFeatureProperty to ensure MapLibre updates its internal state
      Object.keys(styleProps).forEach(key => {
        // Convert style property names to match expected format
        const propName = `style.${key}`;
        geoman?.setFeatureProperty(selectedFeature.value.id as string, propName, styleProps[key]);
      });

      // Force a redraw to apply style changes - THE KEY PART
      const currentSelectedFeatures = geoman?.getSelectedIds() || [];
      console.log('Currently selected features:', currentSelectedFeatures);
      
      // If there were selected features, re-select them
      if (currentSelectedFeatures.length > 0) {
        geoman?.select(currentSelectedFeatures);
      }
      
      console.log('Feature style update complete');
    } catch (error) {
      console.error('Error updating feature style:', error);
    }
  }
  
  // Nettoyage lors de la destruction du composant
  onUnmounted(() => {
    cleanup();
  });
  
  // API publique
  return {
    initDrawing,
    map,
    isDrawing,
    activeTool,
    selectedFeature,
    changeDrawingMode,
    disableDrawing,
    clearAllDrawings,
    deleteSelectedFeature,
    getAllFeatures,
    updateFeatureStyle
  }
}