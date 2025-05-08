import { ref } from 'vue';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import { fromLonLat } from 'ol/proj';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { defaults as defaultControls } from 'ol/control';
import Collection from 'ol/Collection';
import Feature from 'ol/Feature';
import { Geometry } from 'ol/geom';

// Singleton instance to ensure shared state across components
let instance: any = null;

export function useMapState() {
  if (instance) {
    return instance;
  }

  const map = ref<Map | null>(null);
  const currentBaseMap = ref<'Hybride' | 'Cadastre' | 'IGN'>('Hybride');
  const isGoogleMapsLoaded = ref(false);
  
  // Vector source and layer for features (equivalent to Leaflet's featureGroup)
  const vectorSource = new VectorSource<Feature<Geometry>>();
  const vectorLayer = new VectorLayer({
    source: vectorSource,
  });

  // Common options for XYZ sources
  const commonSourceOptions = {
    crossOrigin: 'anonymous',
    maxZoom: 17,
    tileSize: 256,
  };

  // Define base layers with high DPI support for better quality
  const googleHybridLayer = new TileLayer({
    visible: true, // Default to visible
    source: new XYZ({
      url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&scale=2', // Added scale=2 for high DPI/Retina support
      attributions: '© Google',
      ...commonSourceOptions,
      tilePixelRatio: 2, // Support for high DPI displays
    }),
  });

  const cadastreLayer = new TileLayer({
    visible: false,
    source: new XYZ({
      url: 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=CADASTRALPARCELS.PARCELLAIRE_EXPRESS&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
      attributions: 'Cadastre - Carte © IGN/Geoportail',
      ...commonSourceOptions,
      tilePixelRatio: 2, // Support for high DPI displays
    }),
  });

  const ignLayer = new TileLayer({
    visible: false,
    source: new XYZ({
      url: 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
      attributions: 'Carte IGN © IGN/Geoportail',
      ...commonSourceOptions,
      tilePixelRatio: 2, // Support for high DPI displays
    }),
  });

  const baseLayers = [googleHybridLayer, cadastreLayer, ignLayer];

  // Load Google Maps API if needed
  const loadGoogleMaps = async () => {
    try {
      // We're using XYZ tiles directly, no need for Google Maps API
      // await loadGoogleMapsApi();
      isGoogleMapsLoaded.value = true;
    } catch (error) {
      console.error('Failed to load Google Maps API:', error);
      isGoogleMapsLoaded.value = false;
      if (currentBaseMap.value === 'Hybride') {
        currentBaseMap.value = 'IGN';
      }
    }
  };

  const initMap = async (target: string | HTMLElement) => {
    if (currentBaseMap.value === 'Hybride' && !isGoogleMapsLoaded.value) {
      await loadGoogleMaps();
    }
    
    // Create a collection for layers to satisfy TypeScript
    const layerCollection = new Collection([...baseLayers, vectorLayer]);
    
    map.value = new Map({
      target,
      view: new View({
        center: fromLonLat([2.213749, 46.227638]), // Center of France
        zoom: 6,
        maxZoom: 17,
        constrainResolution: true // Similar to Leaflet's zoomSnap
      }),
      layers: layerCollection,
      controls: defaultControls({
        zoom: false, // We'll add our own zoom controls
        attribution: true,
        rotate: false
      })
    });
    
    changeBaseMap(currentBaseMap.value);
    
    return map.value;
  };

  const changeBaseMap = async (baseMapName: 'Hybride' | 'Cadastre' | 'IGN') => {
    baseLayers.forEach(layer => layer.setVisible(false));
    switch (baseMapName) {
      case 'Hybride':
        // No need to check for Google Maps API loading anymore
        googleHybridLayer.setVisible(true);
        break;
      case 'Cadastre':
        // Show hybrid base with cadastre overlay
        googleHybridLayer.setVisible(true);
        cadastreLayer.setVisible(true);
        break;
      case 'IGN':
        ignLayer.setVisible(true);
        break;
    }
    currentBaseMap.value = baseMapName;
  };

  const cleanup = () => {
    if (map.value) {
      map.value.setTarget(undefined);
      map.value = null;
    }
  };

  // Default initial view configuration
  const initialView = ref({
    center: fromLonLat([2.213749, 46.227638]), // Center of France
    zoom: 6,
  });

  instance = {
    map,
    currentBaseMap,
    initMap,
    changeBaseMap,
    cleanup,
    isGoogleMapsLoaded,
    baseLayers,
    initialView,
    vectorSource,
    vectorLayer
  };

  return instance;
}