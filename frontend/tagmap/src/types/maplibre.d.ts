import type { Map as MaplibreMap, LngLatLike, LngLatBounds, LngLat, MapOptions, MapLayerMouseEvent, LineLayer, FillLayer, CircleLayer, SymbolLayer, Layer, GeoJSONSource, ImageSource, VideoSource } from 'maplibre-gl';
import type { Ref } from 'vue';

// Types de base pour MapLibre GL
export {
  MaplibreMap,
  LngLatLike,
  LngLatBounds,
  LngLat,
  MapOptions,
  MapLayerMouseEvent,
  LineLayer,
  FillLayer,
  CircleLayer,
  SymbolLayer,
  Layer,
  GeoJSONSource,
  ImageSource,
  VideoSource
};

// Types pour les références Vue
export type MapRef = Ref<MaplibreMap | null>;
export type SourceRef = Ref<string | null>;
export type LayerRef = Ref<Layer | null>;

// Interface pour le style des entités
export interface StyleOptions {
  color?: string;
  fillColor?: string;
  fillOpacity?: number;
  opacity?: number;
  width?: number;
  dashArray?: string;
  iconSize?: number;
  textSize?: number;
  fontFamily?: string;
}

// Interface pour les événements de drawing
export interface DrawEvent {
  type: string;
  lngLat: LngLat;
  features?: GeoJSON.Feature[];
  point?: { x: number; y: number };
}

// Interface pour les points de contrôle
export interface ControlPoint {
  id: string;
  coordinates: [number, number]; // [longitude, latitude]
  type: 'vertex' | 'midpoint' | 'center';
  featureId?: string;
  vertexIndex?: number;
  measureDiv?: HTMLElement;
}

// Interface pour le retour du composable useMapDrawing
export interface MapDrawingReturn {
  map: MapRef;
  currentTool: Ref<string>;
  selectedFeature: Ref<GeoJSON.Feature | null>;
  isDrawing: Ref<boolean>;
  initMap: (element: HTMLElement, center: LngLatLike, zoom: number) => MaplibreMap;
  setDrawingTool: (tool: string) => void;
  updateFeatureStyle: (id: string, style: StyleOptions) => void;
  updateFeatureProperties: (id: string, properties: Record<string, unknown>) => void;
  adjustView: () => void;
  clearControlPoints: () => void;
}

// Interface pour une source de données GeoJSON
export interface GeoJSONData {
  type: 'FeatureCollection';
  features: GeoJSON.Feature[];
}

// Types d'éléments spécifiques
export type DrawingElementType = 'Line' | 'Polygon' | 'Point' | 'Note' | 'unknown';

// Interface pour les données de base
export interface BaseData {
  style: StyleOptions;
  rotation?: number;
  name?: string;
  category?: string;
  accessLevel?: string;
}

// Interface pour les propriétés d'une entité GeoJSON
export interface FeatureProperties extends Record<string, any> {
  id?: string;
  type?: DrawingElementType;
  style?: StyleOptions;
  name?: string;
  description?: string;
  category?: string;
  accessLevel?: string;
  rotation?: number;
  measurements?: {
    length?: number;
    area?: number;
    perimeter?: number;
  };
  // Propriétés spécifiques pour les notes
  comments?: Array<{
    id: number;
    text: string;
    createdAt: string;
    userId: number;
    userName: string;
    userRole: string;
  }>;
  photos?: Array<{
    id: number;
    url: string;
    createdAt: string;
    caption?: string;
  }>;
}

// Type pour les couches 
export type MapLayer = LineLayer | FillLayer | CircleLayer | SymbolLayer;